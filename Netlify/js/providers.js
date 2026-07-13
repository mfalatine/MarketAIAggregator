import { DEPTHS, modelFor, normalizeBriefing, sanitizeUrl } from './core.js';

const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const wait = (ms, signal) => new Promise((resolve, reject) => { const id = setTimeout(resolve, ms); signal?.addEventListener('abort', () => { clearTimeout(id); reject(new DOMException('Cancelled', 'AbortError')); }, { once: true }); });

function apiError(provider, status, message, retryAfter = 0) {
  const error = new Error(message || `${provider} request failed (${status})`);
  error.provider = provider; error.status = status; error.retryable = RETRYABLE.has(status); error.retryAfter = retryAfter; return error;
}

async function fetchJson(url, options, { provider, signal, retries = 3, onRetry } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    let response;
    try { response = await fetch(url, { ...options, signal }); }
    catch (error) {
      if (error.name === 'AbortError') throw error;
      if (attempt >= retries) throw apiError(provider, 0, `Could not reach ${provider}. Check your connection.`);
      const delay = Math.min(6000, 500 * 2 ** attempt); onRetry?.({ attempt: attempt + 1, delay, message: 'Network interruption' }); await wait(delay, signal); continue;
    }
    if (response.ok) return response.json();
    let payload = {}; try { payload = await response.json(); } catch {}
    const message = payload?.error?.message || payload?.message || `${provider} request failed (${response.status})`;
    const retryAfter = Number(response.headers.get('retry-after') || 0) * 1000;
    const error = apiError(provider, response.status, message, retryAfter); error.code = payload?.error?.code || '';
    if (!error.retryable || attempt >= retries) throw error;
    const delay = retryAfter || Math.min(8000, 500 * 2 ** attempt); onRetry?.({ attempt: attempt + 1, delay, message }); await wait(delay, signal);
  }
}

function dedupeSources(sources) {
  const seen = new Set();
  return sources.map(source => ({ ...source, url: sanitizeUrl(source.url) })).filter(source => source.url && !seen.has(source.url) && seen.add(source.url));
}

export function parseAnthropicResponse(payload) {
  const text = []; const citations = [];
  for (const block of payload?.content || []) {
    if (block.type === 'text' && block.text) text.push(block.text);
    for (const citation of block.citations || []) if (citation.url) citations.push({ url: citation.url, title: citation.title || '', citedText: citation.cited_text || '' });
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) block.content.forEach(result => { if (result.url) citations.push({ url: result.url, title: result.title || '', citedText: result.cited_text || '' }); });
  }
  return { text: text.join('\n').trim(), citations: dedupeSources(citations), usage: payload?.usage || null, stopReason: payload?.stop_reason || '' };
}

export function parseGeminiResponse(payload) {
  const candidate = payload?.candidates?.[0] || {}; const metadata = candidate.groundingMetadata || {};
  const text = (candidate.content?.parts || []).map(part => part.text || '').join('\n').trim();
  const citations = (metadata.groundingChunks || []).map(chunk => chunk.web ? ({ url: chunk.web.uri, title: chunk.web.title || '', citedText: '' }) : null).filter(Boolean);
  return { text, citations: dedupeSources(citations), usage: payload?.usageMetadata || null, stopReason: candidate.finishReason || '' };
}

export function parseOpenAIResponse(payload) {
  const text = []; const citations = [];
  for (const item of payload?.output || []) if (item.type === 'message') for (const content of item.content || []) {
    if (content.type === 'output_text' && content.text) text.push(content.text);
    for (const annotation of content.annotations || []) if (annotation.type === 'url_citation' && annotation.url) citations.push({ url: annotation.url, title: annotation.title || '', citedText: annotation.cited_text || '' });
  }
  return { text: text.join('\n').trim() || String(payload?.output_text || '').trim(), citations: dedupeSources(citations), usage: payload?.usage || null, stopReason: payload?.status || '' };
}

export async function runProvider({ apiKey, modelId, systemPrompt, prompt, depth = 'standard', anthropicSearchTool = 'web_search_20250305', signal, onProgress, onRetry }) {
  const model = modelFor(modelId); const maxTokens = (DEPTHS[depth] || DEPTHS.standard).maxTokens;
  if (model.transport !== 'api') throw new Error('Netlify builds accept cloud API models only.');
  onProgress?.('search', 'Searching current sources…');
  let parsed;
  if (model.provider === 'openai') {
    const payload = await fetchJson('https://api.openai.com/v1/responses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: model.id, instructions: systemPrompt, input: prompt, tools: [{ type: 'web_search' }], tool_choice: 'required', max_output_tokens: maxTokens, store: false }) }, { provider: 'OpenAI', signal, onRetry });
    parsed = parseOpenAIResponse(payload);
  } else if (model.provider === 'google') {
    const payload = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.id)}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemPrompt }] }, tools: [{ google_search: {} }], generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 } }) }, { provider: 'Google Gemini', signal, onRetry });
    parsed = parseGeminiResponse(payload);
  } else {
    const payload = await fetchJson('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: model.id, max_tokens: maxTokens, system: systemPrompt, tools: [{ type: anthropicSearchTool, name: 'web_search', max_uses: (DEPTHS[depth] || DEPTHS.standard).searchUses }], messages: [{ role: 'user', content: prompt }], temperature: 0.2 }) }, { provider: 'Anthropic', signal, onRetry });
    parsed = parseAnthropicResponse(payload);
  }
  if (!parsed.text) throw apiError(model.provider, 502, 'The provider returned no briefing text.');
  onProgress?.('format', 'Connecting claims to evidence…');
  return { ...parsed, briefing: normalizeBriefing(parsed.text, { citations: parsed.citations, fallbackText: parsed.text }) };
}

export async function validateProviderKey(provider, apiKey, { signal } = {}) {
  if (!apiKey) return { ok: false, message: 'Enter an API key first.' };
  try {
    if (provider === 'openai') await fetchJson('https://api.openai.com/v1/models?limit=1', { headers: { Authorization: `Bearer ${apiKey}` } }, { provider: 'OpenAI', signal, retries: 0 });
    else if (provider === 'google') await fetchJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': apiKey } }, { provider: 'Google Gemini', signal, retries: 0 });
    else await fetchJson('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' } }, { provider: 'Anthropic', signal, retries: 0 });
    return { ok: true, message: 'Connected' };
  } catch (error) { if (error.name === 'AbortError') throw error; return { ok: false, message: error.status === 401 || error.status === 403 ? 'Key rejected by provider.' : error.message }; }
}

export function formatProviderError(error) {
  if (error?.name === 'AbortError') return 'Generation cancelled.';
  if (error?.status === 401 || error?.status === 403) return 'The provider rejected the API key.';
  if (error?.status === 429) return 'The provider rate limit was reached. Wait briefly and try again.';
  return error?.message || 'The briefing could not be generated.';
}

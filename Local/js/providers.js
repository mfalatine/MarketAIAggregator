import { modelFor, normalizeBriefing, sanitizeUrl } from './core.js';

async function fetchJson(url, options, { signal } = {}) {
  const response = await fetch(url, { ...options, signal });
  if (response.ok) return response.json();
  let payload = {};
  try { payload = await response.json(); } catch {}
  const error = new Error(payload?.error?.message || `Local CLI request failed (${response.status})`);
  error.status = response.status;
  error.code = payload?.error?.code || '';
  error.provider = 'Local CLI';
  throw error;
}

function dedupeSources(sources = []) {
  const seen = new Set();
  return sources.map(source => ({ ...source, url: sanitizeUrl(source.url) })).filter(source => source.url && !seen.has(source.url) && seen.add(source.url));
}

export async function runProvider({ modelId, systemPrompt, prompt, depth = 'standard', signal, onProgress }) {
  const model = modelFor(modelId);
  if (model.transport !== 'cli') throw new Error('Local builds accept subscription CLI models only.');
  onProgress?.('search', `Running ${model.provider === 'codex' ? 'Codex' : 'Claude'} through the local subscription bridge…`);
  const payload = await fetchJson('/local/cli/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelId: model.id, systemPrompt, prompt, depth })
  }, { signal });
  const text = String(payload.text || '');
  if (!text) throw new Error('The subscription CLI returned no briefing text.');
  const citations = dedupeSources(payload.citations || []);
  onProgress?.('format', 'Connecting claims to evidence…');
  return { text, citations, usage: payload.usage || null, stopReason: payload.stopReason || '', authMethod: payload.authMethod || '', briefing: normalizeBriefing(text, { citations, fallbackText: text }) };
}

export async function getCliStatus({ signal, refresh = false } = {}) {
  try { return await fetchJson(`/local/cli/status${refresh ? '?refresh=1' : ''}`, { headers: { Accept: 'application/json' } }, { signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; return { ok: false, localOnly: true, engines: [], models: [], message: 'The Local server is not running or no subscription CLI is available.' }; }
}

export async function getCliConfig({ signal } = {}) {
  try { return await fetchJson('/local/cli/config', { headers: { Accept: 'application/json' } }, { signal }); }
  catch (error) { if (error.name === 'AbortError') throw error; return { codexPath: '', claudePath: '', unavailable: true }; }
}

export async function saveCliConfig(config, { signal } = {}) {
  return fetchJson('/local/cli/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) }, { signal });
}

export function formatProviderError(error) {
  if (error?.name === 'AbortError') return 'Generation cancelled.';
  return error?.message || 'The subscription CLI could not generate the briefing.';
}

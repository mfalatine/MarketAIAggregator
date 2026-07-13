import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnthropicResponse, parseGeminiResponse, parseOpenAIResponse, runProvider } from '../js/providers.js';

test('Anthropic response parser extracts text, citations, and usage', () => {
  const parsed = parseAnthropicResponse({ content: [{ type: 'text', text: '{"title":"Briefing"}', citations: [{ type: 'web_search_result_location', url: 'https://example.com/a', title: 'Example A', cited_text: 'Evidence' }] }], usage: { input_tokens: 100 } });
  assert.equal(parsed.text, '{"title":"Briefing"}');
  assert.equal(parsed.citations[0].title, 'Example A');
  assert.equal(parsed.usage.input_tokens, 100);
});

test('Gemini response parser extracts grounding chunks and deduplicates sources', () => {
  const parsed = parseGeminiResponse({ candidates: [{ content: { parts: [{ text: 'Response' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.com/a', title: 'A' } }, { web: { uri: 'https://example.com/a', title: 'A duplicate' } }] } }], usageMetadata: { promptTokenCount: 20 } });
  assert.equal(parsed.text, 'Response');
  assert.equal(parsed.citations.length, 1);
  assert.equal(parsed.usage.promptTokenCount, 20);
});

test('citation parser rejects unsafe URL schemes', () => {
  const parsed = parseAnthropicResponse({ content: [{ type: 'text', text: 'x', citations: [{ url: 'javascript:alert(1)', title: 'Unsafe' }] }] });
  assert.equal(parsed.citations.length, 0);
});

test('OpenAI Responses parser extracts output text, URL citations, and usage', () => {
  const parsed = parseOpenAIResponse({ output: [{ type: 'web_search_call', id: 'ws_1' }, { type: 'message', content: [{ type: 'output_text', text: '{"title":"OpenAI briefing"}', annotations: [{ type: 'url_citation', url: 'https://example.com/openai', title: 'OpenAI source', start_index: 0, end_index: 10 }] }] }], usage: { input_tokens: 120, output_tokens: 80 }, status: 'completed' });
  assert.equal(parsed.text, '{"title":"OpenAI briefing"}');
  assert.equal(parsed.citations[0].title, 'OpenAI source');
  assert.equal(parsed.usage.output_tokens, 80);
});

test('OpenAI provider calls the Responses API directly and normalizes its structured response', async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, headers: { get: () => null }, json: async () => ({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ title: 'Direct result', stance: 'Neutral', executive_summary: 'Direct summary', findings: [], catalysts: [], watchlist: [] }), annotations: [] }] }], usage: { input_tokens: 10, output_tokens: 20 }, status: 'completed' }) };
  };
  try {
    const result = await runProvider({ apiKey: 'openai-key', modelId: 'gpt-5.6-luna', systemPrompt: 'System', prompt: 'Prompt', depth: 'quick' });
    assert.equal(request.url, 'https://api.openai.com/v1/responses');
    assert.equal(request.options.headers.Authorization, 'Bearer openai-key');
    const body = JSON.parse(request.options.body);
    assert.equal(body.model, 'gpt-5.6-luna');
    assert.equal(body.instructions, 'System');
    assert.equal(body.input, 'Prompt');
    assert.deepEqual(body.tools, [{ type: 'web_search' }]);
    assert.equal(body.store, false);
    assert.equal(result.briefing.title, 'Direct result');
  } finally { globalThis.fetch = originalFetch; }
});

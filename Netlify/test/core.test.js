import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PROFILES, buildPrompt, compareBriefings, createSampleBriefing, estimateRunCost, normalizeBriefing, normalizeProfile, todayISO } from '../js/core.js';

test('buildPrompt assembles profile, run overrides, evidence rules, and JSON shape', () => {
  const prompt = buildPrompt({ profile: DEFAULT_PROFILES[0], depth: 'deep', dateFrom: '2026-07-01', dateTo: '2026-07-12', extraTickers: 'AVGO, TSLA', extraInstructions: 'Challenge consensus.' });
  assert.match(prompt, /Daily Market/);
  assert.match(prompt, /AVGO/);
  assert.match(prompt, /Challenge consensus/);
  assert.match(prompt, /source_urls/);
  assert.match(prompt, /Do not wrap the JSON/);
});

test('raw prompt deliberately overrides generated prompt', () => {
  assert.equal(buildPrompt({ profile: DEFAULT_PROFILES[0], depth: 'quick', dateFrom: '2026-07-12', dateTo: '2026-07-12', rawPrompt: '  exact prompt  ' }), 'exact prompt');
});

test('normalizeBriefing parses structured output and maps retrieved citations', () => {
  const response = JSON.stringify({ title: 'Test', stance: 'Neutral', executive_summary: 'Summary', findings: [{ id: 'fed', section: 'Macro', headline: 'Fed holds', summary: 'Rates unchanged.', why_it_matters: 'Valuations.', claim_type: 'confirmed', confidence: 'high', horizon: 'Current', importance: 'high', source_urls: ['https://example.com/fed'] }], catalysts: [], watchlist: [] });
  const briefing = normalizeBriefing(response, { citations: [{ url: 'https://example.com/fed', title: 'Primary source', citedText: 'Rates unchanged' }] });
  assert.equal(briefing.findings[0].sources[0].title, 'Primary source');
  assert.equal(briefing.findings[0].claim_type, 'confirmed');
});

test('normalizeBriefing safely falls back for unstructured provider text', () => {
  const briefing = normalizeBriefing('Plain provider response');
  assert.equal(briefing.findings[0].headline, 'Unstructured response');
  assert.equal(briefing.findings[0].claim_type, 'interpretation');
});

test('compareBriefings classifies new, changed, resolved, and unchanged findings', () => {
  const previous = { briefing: { findings: [
    { id: 'fed', headline: 'Fed outlook', summary: 'Hold probability 70 percent', why_it_matters: 'Rates', claim_type: 'market-implied', confidence: 'medium' },
    { id: 'vix', headline: 'VIX stable', summary: 'Volatility unchanged', why_it_matters: 'Risk', claim_type: 'confirmed', confidence: 'high' },
    { id: 'old', headline: 'Payroll risk', summary: 'Release tomorrow', why_it_matters: 'Macro', claim_type: 'confirmed', confidence: 'high' }
  ] } };
  const current = { briefing: { findings: [
    { id: 'fed', headline: 'Fed outlook', summary: 'Hold probability 85 percent after repricing', why_it_matters: 'Valuations', claim_type: 'market-implied', confidence: 'high' },
    { id: 'vix', headline: 'VIX stable', summary: 'Volatility unchanged', why_it_matters: 'Risk', claim_type: 'confirmed', confidence: 'high' },
    { id: 'new', headline: 'New tariff risk', summary: 'Announcement', why_it_matters: 'Margins', claim_type: 'confirmed', confidence: 'medium' }
  ] } };
  const diff = compareBriefings(previous, current);
  assert.deepEqual({ new: diff.new.length, changed: diff.changed.length, resolved: diff.resolved.length, unchanged: diff.unchanged.length }, { new: 1, changed: 1, resolved: 1, unchanged: 1 });
});

test('profiles sanitize tickers and unsupported values', () => {
  const profile = normalizeProfile({ ...DEFAULT_PROFILES[0], watchlist: ['nvda', 'bad ticker!'], depth: 'impossible', topicIds: ['fed_policy', 'missing'] });
  assert.deepEqual(profile.watchlist, ['NVDA', 'BADTICKER']);
  assert.equal(profile.depth, DEFAULT_PROFILES[0].depth);
  assert.deepEqual(profile.topicIds, ['fed_policy']);
});

test('profiles preserve only cloud API model choices', () => {
  const profile = normalizeProfile({ ...DEFAULT_PROFILES[0], transport: 'cli', apiModelId: 'gpt-5.6-luna', cliModelId: 'cli-claude-sonnet-4-6', modelId: 'cli-codex-terra' });
  assert.equal(profile.apiModelId, 'gpt-5.6-luna');
  assert.equal('cliModelId' in profile, false);
  assert.equal(profile.transport, 'api');
  assert.equal(profile.modelId, 'gpt-5.6-luna');
  const legacy = normalizeProfile({ ...DEFAULT_PROFILES[0], apiModelId: undefined, modelId: 'gemini-2.5-flash' });
  assert.equal(legacy.apiModelId, 'gemini-2.5-flash');
});

test('cost estimate grows with depth', () => {
  const quick = estimateRunCost({ modelId: DEFAULT_PROFILES[0].modelId, depth: 'quick', topicCount: 4, tickerCount: 3 });
  const deep = estimateRunCost({ modelId: DEFAULT_PROFILES[0].modelId, depth: 'deep', topicCount: 8, tickerCount: 8 });
  assert.ok(deep.high > quick.high);
});

test('sample briefing is explicitly low-confidence and unsourced', () => {
  const sample = createSampleBriefing('2026-07-12');
  assert.ok(sample.findings.length >= 3);
  assert.ok(sample.findings.every(item => item.confidence === 'low' && item.sources.length === 0));
});

test('todayISO uses the user local calendar date rather than UTC', () => {
  const localDate = { getFullYear: () => 2026, getMonth: () => 6, getDate: () => 12, toISOString: () => '2026-07-13T03:30:00.000Z' };
  assert.equal(todayISO(localDate), '2026-07-12');
});

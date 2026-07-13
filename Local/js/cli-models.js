import daiRegistry from '../models.json' with { type: 'json' };

const speedByDaiKey = {
  codex: 'Balanced',
  'codex-sol': 'Frontier analysis',
  'codex-terra': 'Balanced',
  'codex-luna': 'Cost efficient',
  'codex-spark': 'Fast',
  '': 'Account default',
  'claude-opus-4-8': 'Deep synthesis',
  'claude-sonnet-4-6': 'Balanced',
  'claude-haiku-4-5-20251001': 'Fast',
  'claude-fable-5': 'Experimental'
};

export const CLI_MODELS = daiRegistry.models.map(model => ({
  id: `cli-${model.key || 'claude-default'}`,
  name: model.label,
  provider: model.kind,
  transport: 'cli',
  cliModelId: model.model_id,
  daiKey: model.key,
  speed: speedByDaiKey[model.key] || 'Subscription CLI',
  rates: { input: 0, output: 0 },
  searchCost: 0
}));

export function cliModelFor(id) {
  return CLI_MODELS.find(model => model.id === id);
}

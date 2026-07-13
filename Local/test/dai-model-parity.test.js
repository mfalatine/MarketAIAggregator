import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CLI_MODELS } from '../js/cli-models.js';

test('Local model names, providers, and CLI IDs exactly match DAI models.json', async () => {
  const dai = JSON.parse(await readFile(new URL('../../../DAI/models.json', import.meta.url), 'utf8'));
  const local = JSON.parse(await readFile(new URL('../models.json', import.meta.url), 'utf8'));
  assert.deepEqual(local.models, dai.models);
  assert.deepEqual(
    CLI_MODELS.map(model => ({ key: model.daiKey, label: model.name, kind: model.provider, model_id: model.cliModelId })),
    dai.models
  );
});

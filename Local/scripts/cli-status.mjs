import { createCliService } from './cli-bridge.mjs';

const status = await createCliService().getStatus({ refresh: true });
for (const engine of status.engines) {
  const name = engine.id === 'codex' ? 'Codex CLI' : 'Claude CLI';
  console.log(`${name}: ${engine.available ? `ready (${engine.authMethod})` : engine.installed ? 'installed, login required' : 'not installed'}`);
}
if (!status.ok) process.exitCode = 1;

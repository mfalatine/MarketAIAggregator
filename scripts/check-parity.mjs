import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const APPS = ['Local', 'Netlify'];

// Files the mandatory feature-parity rule requires to stay byte-identical between the two applications.
const IDENTICAL_FILES = ['styles.css', 'schemas/briefing.schema.json', 'scripts/check-project.mjs'];

const normalize = text => text.replace(/\r\n/g, '\n');
const failures = [];

for (const file of IDENTICAL_FILES) {
  const [local, netlify] = await Promise.all(APPS.map(app => readFile(join(root, app, file), 'utf8')));
  if (normalize(local) !== normalize(netlify)) failures.push(`Parity: ${file} differs between Local and Netlify. Apply the same change to both folders.`);
}

// Build options mirror each app's package.json build script; keep them in sync if that script changes.
for (const app of APPS) {
  const result = await build({ absWorkingDir: join(root, app), entryPoints: ['app.js'], bundle: true, format: 'iife', platform: 'browser', target: 'chrome100', write: false });
  const fresh = normalize(result.outputFiles[0].text);
  const committed = normalize(await readFile(join(root, app, 'app.bundle.js'), 'utf8'));
  if (fresh !== committed) failures.push(`Stale bundle: ${app}/app.bundle.js does not match its source. Run "pnpm --dir ${app} build" and include the rebuilt bundle.`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Parity checks passed: ${IDENTICAL_FILES.length} shared files byte-identical, Local and Netlify bundles fresh.`);

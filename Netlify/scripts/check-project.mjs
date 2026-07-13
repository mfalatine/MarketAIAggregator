import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');

assert.match(html, /<main id="main-content"/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /<dialog id="app-dialog"/);
assert.match(html, /<html[^>]+data-theme="dark"/);
assert.match(html, /<script defer src="app.bundle.js\?v=[^"]+"><\/script>/);
assert.doesNotMatch(html, /<script type="module"/, 'The shipped page must work from a file URL without module loading.');
assert.doesNotMatch(html, /\son(?:click|change|input|keydown)=/i, 'Inline event handlers are not allowed.');
assert.match(css, /:focus-visible/);
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /@media \(max-width: 640px\)/);
assert.doesNotMatch(app, /innerHTML\s*=\s*[^;]*(?:response|rawResponse)(?!.*escape)/, 'Raw provider responses must not be inserted directly.');

const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique.');

console.log(`Project checks passed: ${ids.length} unique IDs, semantic shell, keyboard focus, reduced motion, responsive rules, and no inline handlers.`);

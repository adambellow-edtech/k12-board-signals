/* Builds dist/breakout-land.html — a single self-contained fragment
   (no doctype/html/head/body wrapper) suitable for claude.ai Artifact
   publishing or pasting into any host page. `node scripts/build-artifact.mjs` */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const html = read('index.html');
let body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
body = body.replace(/^<script src="[^"]+"><\/script>\s*$/gm, '').trimEnd();

const css = read('css/styles.css');
const js = ['js/analytics.js', 'js/flags.js', 'js/api.js', 'js/onboarding.js', 'js/ambient.js', 'js/data.js', 'js/state.js', 'js/srs.js', 'js/puzzles.js', 'js/avatar.js', 'js/world.js', 'js/screens.js', 'js/main.js']
  .map(read).join('\n\n');
const b64 = (p, mime) => `data:${mime};base64,${readFileSync(join(root, p)).toString('base64')}`;
const assets = {
  heroes: b64('assets/heroes.webp', 'image/webp'),
  title: b64('assets/title.jpg', 'image/jpeg'),
  desk: b64('assets/desk.jpg', 'image/jpeg'),
  trail: b64('assets/trail.jpg', 'image/jpeg'),
};
if (existsSync(join(root, 'assets/logo.webp'))) assets.logo = b64('assets/logo.webp', 'image/webp');

const out = `<title>Breakout Land — a Breakout EDU world</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
${css}
</style>
${body}
<script>
window.WORLD_MAP_SRC = '${b64('assets/world-map.jpg', 'image/jpeg')}';
window.ASSETS = ${JSON.stringify(assets)};
</script>
<script>
${js}
</script>
`;

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/breakout-land.html'), out);
console.log(`dist/breakout-land.html written (${(out.length / 1024).toFixed(0)} KB)`);

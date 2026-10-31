import { cp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
// Cloudflare conserva su compilación original; GitHub recibe rutas bajo el repositorio.
const [repo, origin] = process.argv.slice(2);
if (!/^[\w.-]+$/.test(repo || '') || !/^https:\/\/[^/]+$/.test(origin || '')) throw new Error('Indicá repositorio y origen de Cloudflare.');
const base = '/' + repo + '/';
await rm('dist-github', { recursive: true, force: true });
await cp('dist', 'dist-github', { recursive: true });
for (const file of ['_worker.js', '_routes.json', '_headers', '_redirects']) await rm(join('dist-github', file), { force: true });
const roots = new Set(await readdir('dist'));
async function adapt(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    // Los recursos de terceros y de .NET conservan su contenido y sus hashes.
    if (item.isDirectory()) { if (!['_framework', '_content', 'vendor'].includes(item.name)) await adapt(path); continue; }
    if (!/\.(html|css|js|json|xml|txt)$/.test(item.name)) continue;
    let output = await readFile(path, 'utf8');
    output = output.replace(/(["'`(])\/(?!\/)(?=[a-zA-Z_])/g, (match, before, offset, source) => {
      const rest = source.slice(offset + match.length);
      if (rest.startsWith('api/')) return before + origin + '/';
      const first = rest.match(/^[\w.-]+/)?.[0];
      return roots.has(first) ? before + base : match;
    });
    if (item.name.endsWith('.html')) output = output.replace(/(href=["'])\/(?=["'#])/g, '$1' + base);
    await writeFile(path, output);
  }
}
await adapt('dist-github');
// Blazor valida el manifiesto offline: renovar los hashes de los recursos adaptados.
try {
  const path = 'dist-github/service-worker-assets.js';
  const source = await readFile(path, 'utf8');
  const manifest = JSON.parse(source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1));
  for (const asset of manifest.assets) {
    const content = await readFile(join('dist-github', asset.url));
    asset.hash = 'sha256-' + createHash('sha256').update(content).digest('base64');
  }
  manifest.version = createHash('sha256').update(JSON.stringify(manifest.assets)).digest('hex').slice(0, 16);
  await writeFile(path, 'self.assetsManifest = ' + JSON.stringify(manifest) + ';');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await writeFile('dist-github/.nojekyll', '');
console.log('Versión de GitHub Pages preparada en dist-github/.');

import { writeFile } from 'node:fs/promises';
const origen = 'https://ddragon.leagueoflegends.com';
async function json(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw Error('Data Dragon ' + r.status);
  return r.json();
}
const [version] = await json(origen + '/api/versions.json');
const base = origen + '/cdn/' + version + '/data/es_AR/';
const [c, o, h, arboles] = await Promise.all(
  ['champion.json', 'item.json', 'summoner.json', 'runesReforged.json'].map((x) => json(base + x)),
);
const campeones = Object.fromEntries(
  Object.values(c.data).map((x) => [x.key, { id: x.id, nombre: x.name }]),
);
const objetos = Object.fromEntries(Object.entries(o.data).map(([id, x]) => [id, x.name]));
const hechizos = Object.fromEntries(Object.values(h.data).map((x) => [x.key, x.name]));
const runas = Object.fromEntries(
  arboles.flatMap((a) => a.slots.flatMap((s) => s.runes.map((r) => [r.id, r.name]))),
);
const texto = (s) =>
  String(s || '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const colas = await json('https://static.developer.riotgames.com/docs/lol/queues.json');
const atlas = {
  version,
  hechizos: Object.values(h.data).map((x) => ({
    nombre: x.name,
    grupo: 'Nivel ' + x.summonerLevel + ' · ' + x.cooldownBurn + ' s',
    descripcion: texto(x.description),
  })),
  runas: arboles.flatMap((a) =>
    a.slots.flatMap((s) =>
      s.runes.map((r) => ({
        nombre: r.name,
        grupo: a.name,
        descripcion: texto(r.longDesc || r.shortDesc),
      })),
    ),
  ),
  mapas: colas
    .filter((c) => c.description && !/deprecated/i.test(c.notes || ''))
    .map((c) => ({ nombre: c.map, grupo: 'Cola ' + c.queueId, descripcion: c.description })),
};
await writeFile('public/data/atlas-riot.json', JSON.stringify(atlas) + '\r\n');
await writeFile(
  'public/data/referencias-riot.json',
  JSON.stringify({ version, campeones, objetos, hechizos, runas }) + '\r\n',
);

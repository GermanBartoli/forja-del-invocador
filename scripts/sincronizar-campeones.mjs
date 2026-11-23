import { mkdir, writeFile } from 'node:fs/promises';
import { locales } from '../src/core.js';
import { getJson } from '../src/data.js';

const origen = 'https://ddragon.leagueoflegends.com';
const [version] = await getJson(origen + '/api/versions.json');
const destino = 'public/data/campeones';
await mkdir(destino, { recursive: true });
for (const idioma of locales) {
  const base = origen + '/cdn/' + version + '/data/' + idioma;
  const indice = await getJson(base + '/champion.json');
  const ids = Object.keys(indice.data).sort();
  const campeones = [];
  for (let inicio = 0; inicio < ids.length; inicio += 10) {
    campeones.push(...await Promise.all(ids.slice(inicio, inicio + 10).map(async id => {
      const ficha = (await getJson(base + '/champion/' + id + '.json')).data[id];
      const habilidades = [ficha.passive, ...ficha.spells].map(({ name, description }) => ({
        nombre: name,
        descripcion: description.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, '').trim(),
      }));
      if (habilidades.length !== 5 || habilidades.some(h => !h.nombre || !h.descripcion))
        throw new Error('Ficha incompleta: ' + idioma + '/' + id);
      return { id, nombre: ficha.name, titulo: ficha.title, habilidades };
    })));
  }
  await writeFile(destino + '/' + idioma + '.json', JSON.stringify({ version, campeones }) + '\r\n');
  console.log(idioma, campeones.length, version);
}

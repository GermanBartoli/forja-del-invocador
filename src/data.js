import { locales } from './core.js';
const cdn = 'https://ddragon.leagueoflegends.com';
export async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
export async function loadCatalog() {
  try {
    const versions = await getJson(`${cdn}/api/versions.json`);
    const version = versions[0];
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Versión inválida');
    const entries = await Promise.all(
      locales.map(async (locale) => [
        locale,
        await getJson(`${cdn}/cdn/${version}/data/${locale}/item.json`),
      ]),
    );
    const data = Object.fromEntries(entries);
    if (entries.some(([, value]) => !value.data || value.version !== version))
      throw new Error('Catálogo incompleto');
    return { version, data, backup: false };
  } catch {
    const snapshot = await getJson('/data/items.json');
    return { ...snapshot, backup: true };
  }
}
export const iconUrl = (version, id) => `${cdn}/cdn/${version}/img/item/${id}.png`;

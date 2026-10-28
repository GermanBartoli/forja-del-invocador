export const locales = ['es_AR', 'es_MX', 'es_ES', 'en_US'];
export const normalize = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
export const categories = {
  all: [],
  ad: ['Damage'],
  ap: ['SpellDamage'],
  tank: ['Health', 'Armor', 'SpellBlock'],
  speed: ['AttackSpeed'],
  crit: ['CriticalStrike'],
  armor: ['Armor'],
  resist: ['SpellBlock'],
  health: ['Health'],
  mana: ['Mana', 'ManaRegen'],
  haste: ['AbilityHaste', 'CooldownReduction'],
  boots: ['Boots'],
  sustain: ['LifeSteal', 'SpellVamp', 'HealthRegen'],
  support: ['GoldPer', 'Vision'],
  consumable: ['Consumable'],
  penetration: ['ArmorPenetration', 'MagicPenetration'],
};
export function catalog(data, locale) {
  // Data Dragon también marca variantes de modos especiales como mapa 11.
  // La guía usa IDs estándar y la primera versión de cada nombre oficial inglés.
  const seen = new Set();
  return Object.entries(data[locale].data)
    .filter(([id, item]) => {
      const key = data.en_US.data[id]?.name;
      if (
        Number(id) >= 10000 ||
        !key ||
        seen.has(key) ||
        !item.maps?.['11'] ||
        !item.gold?.purchasable ||
        item.inStore === false ||
        item.requiredChampion ||
        item.requiredAlly
      )
        return false;
      seen.add(key);
      return true;
    })
    .map(([id, item]) => ({ id, ...item }));
}
export function matches(item, query, data, category = 'all') {
  const tags = categories[category] || [];
  return (
    (!tags.length || tags.some((tag) => item.tags.includes(tag))) &&
    (!query ||
      locales.some((locale) =>
        normalize(data[locale].data[item.id]?.name || '').includes(normalize(query)),
      ))
  );
}
export function accepts(answer, id, data) {
  return locales.some(
    (locale) =>
      normalize(data[locale].data[id]?.name || '') === normalize(answer) &&
      normalize(answer).length > 0,
  );
}
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeRound(items, mode, previous) {
  const pool = items.filter((item) => mode !== 'recipe' || item.from?.length);
  const target = shuffle(pool.filter((item) => item.id !== previous))[0] || pool[0];
  if (!target) return null;
  const recipeKey = (item) => [...(item.from || [])].sort().join(',');
  const seen = new Set([target.name]);
  const alternatives = shuffle(
    items.filter(
      (item) =>
        item.id !== target.id && (mode !== 'recipe' || recipeKey(item) !== recipeKey(target)),
    ),
  )
    .filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    })
    .slice(0, 3);
  return { target, options: shuffle([target, ...alternatives]), answered: false };
}

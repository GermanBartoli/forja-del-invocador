import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { catalog, matches, accepts, makeRound, locales } from '../src/core.js';
const { data, version } = JSON.parse(
  await readFile(new URL('../public/data/items.json', import.meta.url), 'utf8'),
);
const items = catalog(data, 'es_AR');
test('El catálogo contiene objetos comprables de la Grieta en los cuatro idiomas', () => {
  assert.ok(items.length > 100);
  for (const locale of locales) {
    assert.equal(data[locale].version, version);
    for (const item of items) assert.ok(data[locale].data[item.id]?.name);
  }
  assert.ok(
    items.every((item) => item.maps['11'] && item.gold.purchasable && item.inStore !== false),
  );
});
test('Busca los nombres de las cuatro regiones sin tildes', () => {
  const item = items.find((item) => item.id === '3031');
  for (const locale of locales) {
    assert.ok(matches(item, data[locale].data[item.id].name, data));
    assert.ok(accepts(data[locale].data[item.id].name.toUpperCase(), item.id, data));
  }
  assert.equal(accepts('', item.id, data), false);
  assert.equal(matches(item, 'objeto inexistente', data), false);
});
test('Los filtros AD y AP discriminan por etiquetas oficiales', () => {
  const sword = items.find((item) => item.id === '1036');
  assert.ok(matches(sword, '', data, 'ad'));
  assert.equal(matches(sword, '', data, 'ap'), false);
});
test('Las recetas conservan los componentes repetidos y las referencias son válidas', () => {
  for (const item of items) {
    for (const id of item.from || []) assert.ok(data.es_AR.data[id]);
  }
  assert.ok(items.some((item) => item.from?.length > new Set(item.from).size));
});
test('Las rondas tienen una sola respuesta correcta, evitan repetir y las recetas tienen componentes', () => {
  for (const mode of ['icon', 'recipe', 'word']) {
    let previous;
    for (let i = 0; i < 100; i++) {
      const round = makeRound(items, mode, previous);
      assert.equal(round.options.length, 4);
      assert.equal(new Set(round.options.map((item) => item.name)).size, 4);
      assert.equal(round.options.filter((item) => item.id === round.target.id).length, 1);
      assert.notEqual(round.target.id, previous);
      if (mode === 'recipe') assert.ok(round.target.from.length);
      previous = round.target.id;
    }
  }
});
test('Las recetas no ofrecen como distractor otro objeto con los mismos componentes', () => {
  for (let i = 0; i < 100; i++) {
    const { target, options } = makeRound(items, 'recipe');
    const key = (item) => [...(item.from || [])].sort().join(',');
    assert.equal(options.filter((item) => key(item) === key(target)).length, 1);
  }
});

test('Una partida completa no repite objetivos en ninguno de los modos', () => {
  for (const mode of ['icon', 'recipe', 'word']) {
    const used = [];
    for (let i = 0; i < 10; i++) {
      const round = makeRound(items, mode, used);
      assert.ok(round);
      assert.ok(!used.includes(round.target.id));
      used.push(round.target.id);
    }
    assert.equal(new Set(used).size, 10);
  }
});
test('Al agotar el catálogo no se reutilizan objetivos', () => {
  assert.equal(
    makeRound(
      items,
      'icon',
      items.map((item) => item.id),
    ),
    null,
  );
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog } from '../src/data.js';
import { locales } from '../src/core.js';

test('Carga todos los idiomas del mismo parche', async (context) => {
  const requested = [];
  context.mock.method(globalThis, 'fetch', async (url) => {
    requested.push(url);
    return {
      ok: true,
      json: async () =>
        url.endsWith('versions.json')
          ? ['99.1.1']
          : { version: '99.1.1', data: { 1036: { name: 'Espada' } } },
    };
  });
  const result = await loadCatalog();
  assert.equal(result.backup, false);
  assert.equal(result.version, '99.1.1');
  assert.deepEqual(Object.keys(result.data), locales);
  assert.equal(requested.length, 5);
});

test('Una falla parcial usa el respaldo completo sin mezclar parches', async (context) => {
  context.mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/es_ES/item.json')) throw new Error('Sin conexión');
    const value = url.endsWith('versions.json')
      ? ['99.1.1']
      : url === '/data/items.json'
        ? { version: '98.1.1', data: { snapshot: true } }
        : { version: '99.1.1', data: {} };
    return { ok: true, json: async () => value };
  });
  const result = await loadCatalog();
  assert.equal(result.backup, true);
  assert.equal(result.version, '98.1.1');
  assert.deepEqual(result.data, { snapshot: true });
});

test('Si también falla el respaldo devuelve error para permitir reintentar', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Sin conexión');
  });
  await assert.rejects(loadCatalog(), /Sin conexión/);
});

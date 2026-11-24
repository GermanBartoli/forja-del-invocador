import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/grieta.js';
const evento = (q) => ({
  request: new Request('https://prueba.test/api/grieta?' + q),
  env: { RIOT_PRODUCTION_API_KEY: 'prueba' },
});
test('Reconoce los dos formatos de rotación de Riot', async (t) => {
  for (const datos of [
    { sr: [1], newplayer: [2] },
    { freeChampionIds: [1], freeChampionIdsForNewPlayers: [2] },
  ]) {
    const m = t.mock.method(globalThis, 'fetch', async () => Response.json(datos));
    const r = await onRequestGet(evento('accion=rotacion'));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { general: [1], inicial: [2] });
    m.mock.restore();
  }
});
test('Conserva Retry-After ante una cuota agotada', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('', { status: 429, headers: { 'Retry-After': '16' } }),
  );
  const r = await onRequestGet(evento('accion=rotacion'));
  assert.equal(r.status, 429);
  assert.equal(r.headers.get('Retry-After'), '16');
});
test('Una liga o acción desconocida no dispara llamadas externas', async (t) => {
  const m = t.mock.method(globalThis, 'fetch', () => {
    throw Error('Llamada inesperada');
  });
  for (const q of ['accion=liga&nivel=invalido', 'accion=division&division=X', 'accion=otro']) {
    const r = await onRequestGet(evento(q));
    assert.equal(r.status, 400);
  }
  assert.equal(m.mock.callCount(), 0);
});

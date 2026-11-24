import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contexto, historial, privadaJugador, publica } from '../servidor/riot.js';
const evento = (q) => ({
  request: new Request('https://ejemplo.test/?' + q),
  env: { RIOT_PRODUCTION_API_KEY: 'prueba' },
});
test('El servicio desplegado ignora las claves de desarrollo', async (t) => {
  const fuera = {
    request: new Request('https://ejemplo.test/?id=Demo%23LAS'),
    env: { RIOT_API_KEY: 'desarrollo' },
  };
  const m = t.mock.method(globalThis, 'fetch', async () => Response.json({ puuid: 'p' }));
  await assert.rejects(contexto(fuera).cuenta(), (e) => e.estado === 503);
  assert.equal(m.mock.callCount(), 0);
  assert.deepEqual(await contexto({ ...fuera, desarrolloLocal: true }).cuenta(), { puuid: 'p' });
});
test('Los tipos privados, personalizados o desconocidos nunca se publican', () => {
  assert.equal(publica({ queueId: 420, gameType: 'MATCHED_GAME' }), true);
  for (const i of [
    { queueId: 0, gameType: 'MATCHED_GAME' },
    { queueId: 420, gameType: 'CUSTOM_GAME' },
    { queueId: 420 },
    {},
  ])
    assert.equal(publica(i), false);
});
test('Un ID privado no permite consultar su cronología', async () => {
  const ctx = contexto(evento('partida=LA2_42'));
  const llamadas = [];
  ctx.regional = async (ruta) => {
    llamadas.push(ruta);
    return { info: { gameType: 'CUSTOM_GAME', queueId: 0 } };
  };
  await assert.rejects(privadaJugador(ctx, 'cronologia'), (e) => e.estado === 404);
  assert.equal(llamadas.length, 1);
});
test('Paginar avanza por IDs de Riot aunque la página contenga partidas privadas', async () => {
  const ctx = contexto(evento('inicio=5&cola=420&dias=7'));
  const rutas = [];
  ctx.regional = async (ruta) => {
    rutas.push(ruta);
    if (ruta.includes('/ids?')) return ['LA2_10', 'LA2_11', 'LA2_12', 'LA2_13', 'LA2_14'];
    return { info: { queueId: 0, gameType: 'CUSTOM_GAME' } };
  };
  const d = await historial(ctx, 'jugador');
  assert.equal(d.siguiente, 10);
  assert.deepEqual(d.matches, []);
  assert.match(rutas[0], /start=5&count=5&queue=420&startTime=\d+/);
});
test('La identidad en Oceanía usa Asia y las partidas usan SEA', async (t) => {
  const hosts = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    hosts.push(new URL(url).hostname);
    return Response.json({});
  });
  const ctx = contexto(evento('region=oc1&id=Demo%23LAS'));
  await ctx.cuenta();
  await ctx.regional('/lol/match/v5/matches/OC1_1');
  assert.deepEqual(hosts, ['asia.api.riotgames.com', 'sea.api.riotgames.com']);
});
test('Filtros y regiones desconocidos fallan antes de pedir datos', async () => {
  assert.throws(
    () => contexto(evento('region=desconocida')),
    (e) => e.estado === 400,
  );
  await assert.rejects(historial(contexto(evento('dias=-1')), 'p'), (e) => e.estado === 400);
});

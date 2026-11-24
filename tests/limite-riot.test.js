import test from "node:test";
import assert from "node:assert/strict";
import { contexto } from "../servidor/riot.js";

test("el cupo cuenta búsquedas y respeta la pausa indicada por Riot", async (t) => {
  const guardados = new Map();
  const anterior = globalThis.caches;
  globalThis.caches = { default: {
    match: async clave => guardados.get(clave)?.clone(),
    put: async (clave, valor) => { guardados.set(clave, valor.clone()); },
  } };
  t.after(() => { if (anterior) globalThis.caches = anterior; else delete globalThis.caches; });
  let llamadas = 0;
  t.mock.method(globalThis, "fetch", async () => {
    llamadas++;
    return llamadas === 20 ? new Response(null, { status: 429, headers: { "Retry-After": "90" } })
      : Response.json({ puuid: "prueba" });
  });
  const consultar = (ip) => contexto({ request: new Request("https://local.test/?id=prueba%23LAS",
    { headers: { "CF-Connecting-IP": ip } }), env: { RIOT_PRODUCTION_API_KEY: "prueba" } }).cuenta();
  for (let i = 0; i < 19; i++) await consultar("192.0.2.1");
  await assert.rejects(consultar("192.0.2.1"), { estado: 429, espera: "90" });
  await assert.rejects(consultar("192.0.2.2"), { estado: 429 });
  guardados.clear();
  await assert.rejects(consultar("192.0.2.1"), { estado: 429 });
  assert.equal(llamadas, 20);
});

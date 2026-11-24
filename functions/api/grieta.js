import { contexto, respuesta, errorRespuesta, fallo } from '../../servidor/riot.js';
async function identidad(ctx, p) {
  if (!p.puuid) return p.summonerName || 'Invocador';
  try {
    const a = await ctx.identidad(p.puuid);
    return a.gameName + '#' + a.tagLine;
  } catch (e) {
    if (e.estado === 429) throw e;
    return 'Invocador';
  }
}
function entero(parametros, clave, defecto, max) {
  const n = Number(parametros.get(clave) || defecto);
  if (!Number.isSafeInteger(n) || n < 0 || n > max) throw fallo(400, 'Parámetro inválido.');
  return n;
}
async function consultar(ctx) {
  const accion = ctx.parametros.get('accion');
  if (accion === 'rotacion') {
    const rotacion = await ctx.local('/lol/platform/v3/champion-rotations', 3600);
    return {
      general: rotacion.sr || rotacion.freeChampionIds || [],
      inicial: rotacion.newplayer || rotacion.freeChampionIdsForNewPlayers || [],
      nivel: rotacion.maxNewPlayerLevel,
    };
  }
  if (accion === 'resumen') {
    const a = await ctx.cuenta(),
      id = encodeURIComponent(a.puuid);
    const [puntuacion, top, rangos] = await Promise.all([
      ctx.local('/lol/champion-mastery/v4/scores/by-puuid/' + id),
      ctx.local('/lol/champion-mastery/v4/champion-masteries/by-puuid/' + id + '/top?count=3'),
      ctx.local('/lol/league/v4/entries/by-puuid/' + id),
    ]);
    return {
      nombre: a.gameName + '#' + a.tagLine,
      puntuacion,
      top: top.map((m) => ({ campeon: m.championId, puntos: m.championPoints })),
      rangos: rangos.map((r) => ({
        cola: r.queueType,
        nivel: r.tier,
        division: r.rank,
        lp: r.leaguePoints,
        victorias: r.wins,
        derrotas: r.losses,
      })),
    };
  }
  if (accion === 'torneo') {
    const id = entero(ctx.parametros, 'torneo', 0, 2147483647);
    return ctx.local('/lol/clash/v1/tournaments/' + id);
  }
  if (accion === 'umbrales' || accion === 'lideres-reto') {
    const id = entero(ctx.parametros, 'reto', 0, 2147483647);
    if (accion === 'umbrales')
      return ctx.local('/lol/challenges/v1/challenges/' + id + '/config', 86400);
    const nivel = ctx.parametros.get('nivel') || 'CHALLENGER';
    if (!['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(nivel))
      throw fallo(400, 'Nivel inválido.');
    const d = await ctx.local(
      '/lol/challenges/v1/challenges/' + id + '/leaderboards/by-level/' + nivel + '?limit=5',
      1800,
    );
    return Promise.all(
      d
        .slice(0, 5)
        .map(async (x) => ({
          nombre: await identidad(ctx, x),
          puesto: x.position,
          valor: x.value,
        })),
    );
  }
  if (accion === 'percentiles') return ctx.local('/lol/challenges/v1/challenges/percentiles', 3600);
  if (accion === 'retos') {
    const configs = await ctx.local('/lol/challenges/v1/challenges/config', 86400);
    return configs.map((c) => ({
      id: c.id,
      nombre:
        c.localizedNames?.es_AR?.name ||
        c.localizedNames?.es_ES?.name ||
        c.localizedNames?.en_US?.name,
      descripcion: c.localizedNames?.es_AR?.description || c.localizedNames?.es_ES?.description,
      umbrales: c.thresholds,
      estado: c.state,
      clasificacion: c.leaderboard,
    }));
  }
  if (accion === 'distribucion') {
    const id = ctx.parametros.get('reto') || '';
    if (!/^\d{1,10}$/.test(id)) throw fallo(400, 'Desafío inválido.');
    return ctx.local('/lol/challenges/v1/challenges/' + id + '/percentiles', 3600);
  }
  if (accion === 'estado') {
    const d = await ctx.local('/lol/status/v4/platform-data', 180);
    const titulo = (x) =>
      x.titles.find((t) => t.locale.startsWith('es'))?.content ||
      x.titles.find((t) => t.locale === 'en_US')?.content ||
      x.titles[0]?.content;
    return [...d.incidents, ...d.maintenances].map((x) => ({
      titulo: titulo(x),
      fecha: x.updated_at || x.created_at,
      estado: x.maintenance_status || x.incident_severity,
    }));
  }
  if (accion === 'clash') return ctx.local('/lol/clash/v1/tournaments', 900);
  if (accion === 'equipo') {
    const a = await ctx.cuenta();
    const miembros = await ctx.local(
      '/lol/clash/v1/players/by-puuid/' + encodeURIComponent(a.puuid),
    );
    const ids = [...new Set(miembros.map((m) => m.teamId))];
    return Promise.all(
      ids.map(async (id) => {
        const equipo = await ctx.local('/lol/clash/v1/teams/' + encodeURIComponent(id));
        let torneo;
        try {
          torneo = await ctx.local('/lol/clash/v1/tournaments/by-team/' + encodeURIComponent(id));
        } catch (e) {
          if (e.estado !== 404) throw e;
        }
        return {
          nombre: equipo.name,
          etiqueta: equipo.abbreviation,
          torneo: torneo?.nameKey,
          jugadores: equipo.players.map((p) => ({ posicion: p.position, rol: p.role })),
        };
      }),
    );
  }
  if (accion === 'division') {
    const cola = ctx.parametros.get('cola') || 'RANKED_SOLO_5x5',
      nivel = ctx.parametros.get('nivel') || 'GOLD',
      division = ctx.parametros.get('division') || 'IV';
    const pagina = entero(ctx.parametros, 'pagina', 0, 1000);
    if (
      !['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'].includes(cola) ||
      !['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND'].includes(nivel) ||
      !['I', 'II', 'III', 'IV'].includes(division)
    )
      throw fallo(400, 'División inválida.');
    const segmento = ctx.parametros.get('indice') === 'ampliado' ? 'league-exp' : 'league';
    const paginaRiot = entero(ctx.parametros, 'bloque', 1, 1000);
    if (!paginaRiot) throw fallo(400, 'Bloque inválido.');
    const grupo = await ctx.local(
      '/lol/' +
        segmento +
        '/v4/entries/' +
        cola +
        '/' +
        nivel +
        '/' +
        division +
        '?page=' +
        paginaRiot,
      600,
    );
    const lista = await Promise.all(
      grupo
        .slice(pagina * 5, pagina * 5 + 5)
        .map(async (x) => ({
          nombre: await identidad(ctx, x),
          lp: x.leaguePoints,
          victorias: x.wins,
          derrotas: x.losses,
        })),
    );
    return { lista, total: grupo.length };
  }
  if (accion === 'liga') {
    const nivel = ctx.parametros.get('nivel') || 'challenger';
    const cola = ctx.parametros.get('cola') || 'RANKED_SOLO_5x5';
    if (
      !['challenger', 'grandmaster', 'master'].includes(nivel) ||
      !['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'].includes(cola)
    )
      throw fallo(400, 'Liga desconocida.');
    const liga = await ctx.local('/lol/league/v4/' + nivel + 'leagues/by-queue/' + cola, 600);
    const mejores = [...liga.entries].sort((a, b) => b.leaguePoints - a.leaguePoints);
    const pagina = Number(ctx.parametros.get('pagina') || 0);
    if (!Number.isInteger(pagina) || pagina < 0 || pagina > 1000)
      throw fallo(400, 'Página inválida.');
    const lista = await Promise.all(
      mejores.slice(pagina * 5, pagina * 5 + 5).map(async (p, i) => {
        const nombre = await identidad(ctx, p);
        return {
          puesto: pagina * 5 + i + 1,
          nombre: nombre || 'Invocador',
          lp: p.leaguePoints,
          victorias: p.wins,
          derrotas: p.losses,
        };
      }),
    );
    return { lista, total: mejores.length };
  }
  throw fallo(400, 'Consulta desconocida.');
}
export async function onRequestGet(evento) {
  try {
    return respuesta(evento.request, await consultar(contexto(evento)));
  } catch (error) {
    return errorRespuesta(evento.request, error);
  }
}

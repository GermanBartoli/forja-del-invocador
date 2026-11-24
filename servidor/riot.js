// Límite local por visitante; las respuestas reutilizadas no consumen intentos.
const visitantes = new Map();
let proximaLimpieza = 0;
function contarBusqueda(ip, ahora) {
  if (ahora >= proximaLimpieza) {
    for (const [clave, ventana] of visitantes)
      if (ventana.vence <= ahora) visitantes.delete(clave);
    proximaLimpieza = ahora + 60000;
  }
  const ventana = visitantes.get(ip);
  if (!ventana || ventana.vence <= ahora) {
    if (visitantes.size >= 10000 && !ventana) throw pausa(60);
    visitantes.set(ip, { cantidad: 1, vence: ahora + 60000 });
  } else {
    if (ventana.cantidad >= 20) throw pausa((ventana.vence - ahora) / 1000);
    ventana.cantidad++;
  }
}
function pausa(segundos) {
  const error = fallo(429, "Se alcanzó el límite de consultas. Intentá más tarde.");
  error.espera = String(Math.max(1, Math.ceil(segundos)));
  return error;
}
const regiones = {
  la2: 'americas',
  la1: 'americas',
  na1: 'americas',
  br1: 'americas',
  euw1: 'europe',
  eun1: 'europe',
  tr1: 'europe',
  ru: 'europe',
  me1: 'europe',
  kr: 'asia',
  jp1: 'asia',
  oc1: 'sea',
  sg2: 'sea',
  tw2: 'sea',
  vn2: 'sea',
};
export function fallo(estado, mensaje) {
  return Object.assign(new Error(mensaje), { estado });
}
export function respuesta(request, datos, estado = 200, extra = {}) {
  const headers = { 'Cache-Control': 'no-store', Vary: 'Origin', ...extra };
  if (request.headers.get('Origin') === 'https://germanbartoli.github.io')
    headers['Access-Control-Allow-Origin'] = 'https://germanbartoli.github.io';
  return Response.json(datos, { status: estado, headers });
}
export function contexto(evento) {
  const { request, env } = evento;
  const clave =
    env.RIOT_PRODUCTION_API_KEY || (evento.desarrolloLocal ? env.RIOT_API_KEY : undefined);
  const parametros = new URL(request.url).searchParams;
  const plataforma = (parametros.get('region') || 'la2').toLowerCase();
  if (!Object.hasOwn(regiones, plataforma)) throw fallo(400, 'Región desconocida.');
  let contabilizada = false;
  async function consultar(host, ruta, segundos = 120) {
    if (!clave)
      throw fallo(503, 'La conexión pública espera la clave de producción aprobada por Riot.');
    const url = 'https://' + host + '.api.riotgames.com' + ruta;
    const cache = globalThis.caches?.default;
    const anterior = cache && (await cache.match(url));
    if (anterior) {
      if (anterior.status === 404) throw fallo(404, "No se encontraron datos para esta consulta.");
      return anterior.json();
    }
    const clavePausa = "https://" + host + ".api.riotgames.com/__pausa";
    const pausaGuardada = await cache?.match(clavePausa);
    if (pausaGuardada) {
      const restante = Number(await pausaGuardada.text()) - Date.now();
      if (restante > 0) throw pausa(restante / 1000);
    }
    if (!contabilizada) {
      contarBusqueda(request.headers.get("CF-Connecting-IP") || "local", Date.now());
      contabilizada = true;
    }
    const r = await fetch(url, {
      headers: { 'X-Riot-Token': clave },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) {
      if (cache && r.status === 404)
        await cache.put(url, new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=30" } }));
      const espera = Number(r.headers.get("Retry-After"));
      if (cache && r.status === 429 && Number.isSafeInteger(espera) && espera > 0)
        await cache.put(clavePausa, new Response(String(Date.now() + espera * 1000), {
          headers: { "Cache-Control": "public, max-age=" + espera },
        }));
      const mensajes = {
        404: 'No se encontraron datos para esta consulta.',
        429: 'Riot alcanzó el límite de consultas. Intentá nuevamente en unos minutos.',
        403: 'Riot no autorizó esta consulta con la clave configurada.',
      };
      const error = fallo(r.status, mensajes[r.status] || 'Riot no pudo completar la consulta.');
      error.espera = r.headers.get('Retry-After');
      throw error;
    }
    const datos = await r.json();
    if (cache && evento.waitUntil)
      evento.waitUntil(
        cache.put(
          url,
          Response.json(datos, { headers: { 'Cache-Control': 'public, max-age=' + segundos } }),
        ),
      );
    return datos;
  }
  const regional = (ruta, ttl) => consultar(regiones[plataforma], ruta, ttl);
  const local = (ruta, ttl) => consultar(plataforma, ruta, ttl);
  async function cuenta() {
    const id = (parametros.get('id') || '').trim();
    const partes = id.split('#');
    if (partes.length !== 2 || id.length > 50 || partes.some((p) => !p.trim()))
      throw fallo(400, 'Ingresá el Riot ID completo: nombre#tag.');
    return consultar(
      regiones[plataforma] === 'sea' ? 'asia' : regiones[plataforma],
      '/riot/account/v1/accounts/by-riot-id/' +
        partes.map((p) => encodeURIComponent(p.trim())).join('/'),
      3600,
    );
  }
  const cuentaRegional = (ruta, ttl) =>
    consultar(regiones[plataforma] === 'sea' ? 'asia' : regiones[plataforma], ruta, ttl);
  const identidad = (puuid) =>
    cuentaRegional('/riot/account/v1/accounts/by-puuid/' + encodeURIComponent(puuid), 86400);
  return { parametros, plataforma, regional, local, cuenta, identidad, cuentaRegional };
}
export function errorRespuesta(request, error) {
  const estado = [400, 404, 429, 503].includes(error.estado) ? error.estado : 502;
  return respuesta(
    request,
    {
      error: error.estado
        ? error.message
        : 'No se pudo consultar Riot. Intentá nuevamente más tarde.',
    },
    estado,
    error.espera ? { 'Retry-After': error.espera } : {},
  );
}
function participante(p) {
  return {
    nombre: p.riotIdGameName
      ? [p.riotIdGameName, p.riotIdTagline].filter(Boolean).join('#')
      : p.championName,
    campeon: p.championName,
    equipo: p.teamId,
    numero: p.participantId,
    rol: p.teamPosition,
    campeonId: p.championId,
    dobles: p.doubleKills,
    triples: p.tripleKills,
    cuadras: p.quadraKills,
    pentas: p.pentaKills,
    curacion: p.totalHeal,
    danoRecibido: p.totalDamageTaken,
    centinelas: p.wardsPlaced,
    nivel: p.champLevel,
    primeraSangre: p.firstBloodKill,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    oro: p.goldEarned,
    dano: p.totalDamageDealtToChampions,
    vision: p.visionScore,
    subditos: (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0),
    objetos: Array.from({ length: 7 }, (_, i) => p['item' + i]).filter(Boolean),
    hechizos: [p.summoner1Id, p.summoner2Id].filter(Boolean),
    runas: p.perks?.styles?.flatMap((s) => s.selections.map((r) => r.perk)) || [],
  };
}
export function publica(info) {
  return info?.gameType === 'MATCHED_GAME' && info.queueId > 0 && info.gameMode !== 'PRACTICETOOL';
}
export async function historial(ctx, puuid) {
  const inicio = Number(ctx.parametros.get('inicio') || 0);
  const cola = ctx.parametros.get('cola') || '';
  const dias = Number(ctx.parametros.get('dias') || 0);
  if (![0, 7, 30, 90, 365].includes(dias)) throw fallo(400, 'Período inválido.');
  if (
    !Number.isInteger(inicio) ||
    inicio < 0 ||
    inicio > 100000 ||
    (cola && !/^\d{1,4}$/.test(cola))
  )
    throw fallo(400, 'Filtro de historial inválido.');
  const ruta = '/lol/match/v5/matches/';
  const ids = await ctx.regional(
    ruta +
      'by-puuid/' +
      encodeURIComponent(puuid) +
      '/ids?start=' +
      inicio +
      '&count=5' +
      (cola ? '&queue=' + cola : '') +
      (dias ? '&startTime=' + Math.floor(Date.now() / 1000 - dias * 86400) : ''),
  );
  const resultados = await Promise.allSettled(
    ids.map(async (id) => {
      const { info } = await ctx.regional(ruta + encodeURIComponent(id), 86400);
      if (!publica(info)) return null;
      const p = info.participants.find((p) => p.puuid === puuid);
      if (!p) return null;
      return {
        id,
        date: info.gameCreation,
        duration: info.gameDuration,
        mode: info.gameMode,
        cola: info.queueId,
        champion: p.championName,
        win: p.win,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        jugador: participante(p),
        participantes: info.participants.map(participante),
        equipos: (info.teams || []).map((e) => ({
          equipo: e.teamId,
          objetivos: e.objectives,
          victoria: e.win,
        })),
        parche: info.gameVersion,
      };
    }),
  );
  const fallos = resultados.filter((r) => r.status === 'rejected');
  if (fallos.length && fallos.length === ids.length && fallos[0].reason.estado === 429)
    throw fallos[0].reason;
  return {
    matches: resultados.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value),
    siguiente: ids.length === 5 && inicio < 100000 ? inicio + 5 : null,
    warnings: fallos.length
      ? [
          'Historial incompleto: algunas partidas no están disponibles. Intentá nuevamente más tarde.',
        ]
      : [],
  };
}
export async function perfil(ctx) {
  const a = await ctx.cuenta();
  const p = encodeURIComponent(a.puuid);
  const [invocador, ranks, maestrias] = await Promise.all([
    ctx.local('/lol/summoner/v4/summoners/by-puuid/' + p),
    ctx.local('/lol/league/v4/entries/by-puuid/' + p).catch((e) => {
      if (e.estado === 404) e.estado = 502;
      throw e;
    }),
    ctx.local('/lol/champion-mastery/v4/champion-masteries/by-puuid/' + p, 600),
  ]);
  let partidas;
  try {
    partidas = await historial(ctx, a.puuid);
  } catch {
    partidas = {
      matches: [],
      siguiente: 0,
      warnings: [
        'El perfil está disponible, pero no pudimos consultar el historial de partidas. Intentá nuevamente más tarde.',
      ],
    };
  }
  const coleccion = maestrias.map((m) => ({
    championId: m.championId,
    championLevel: m.championLevel,
    championPoints: m.championPoints,
    lastPlayTime: m.lastPlayTime,
  }));
  return {
    name: a.gameName + '#' + a.tagLine,
    level: invocador.summonerLevel,
    icon: invocador.profileIconId,
    ranks: ranks.map(({ queueType, tier, rank, leaguePoints, wins, losses }) => ({
      queueType,
      tier,
      rank,
      leaguePoints,
      wins,
      losses,
    })),
    masteries: coleccion.slice(0, 3),
    coleccion,
    masteryScore: coleccion.reduce((n, m) => n + m.championLevel, 0),
    ...partidas,
    updatedAt: new Date().toISOString(),
  };
}
export async function privadaJugador(ctx, accion) {
  if (accion === 'perfil') return perfil(ctx);
  if (accion === 'cronologia') {
    const id = ctx.parametros.get('partida') || '';
    if (
      !/^[A-Z0-9]+_\d+$/.test(id) ||
      regiones[id.split('_')[0].toLowerCase()] !== regiones[ctx.plataforma]
    )
      throw fallo(400, 'Partida inválida.');
    const ruta = '/lol/match/v5/matches/' + id;
    const partida = await ctx.regional(ruta, 86400);
    if (!publica(partida.info)) throw fallo(404, 'Partida no disponible.');
    const { info } = await ctx.regional(ruta + '/timeline', 86400);
    const tipos = [
      'CHAMPION_KILL',
      'ELITE_MONSTER_KILL',
      'BUILDING_KILL',
      'ITEM_PURCHASED',
      'SKILL_LEVEL_UP',
    ];
    const oro = info.frames.map((f) => ({
      tiempo: f.timestamp,
      equipos: Object.fromEntries(
        [100, 200].map((id) => [
          id,
          Object.entries(f.participantFrames || {})
            .filter(
              ([k]) =>
                partida.info.participants.find((p) => p.participantId === Number(k))?.teamId === id,
            )
            .reduce((s, [, p]) => s + (p.totalGold || 0), 0),
        ]),
      ),
    }));
    const eventos = info.frames.flatMap((f) =>
      f.events
        .filter((e) => tipos.includes(e.type))
        .map((e) => ({
          tipo: e.type,
          tiempo: e.timestamp,
          autor: e.killerId ?? e.participantId,
          objetivo: e.victimId,
          monstruo: e.monsterSubType || e.monsterType,
          edificio: e.towerType || e.buildingType,
          objeto: e.itemId,
          habilidad: e.skillSlot,
        })),
    );
    return { oro, eventos };
  }
  const a = await ctx.cuenta();
  const p = encodeURIComponent(a.puuid);
  if (accion === 'region') {
    const d = await ctx.cuentaRegional('/riot/account/v1/region/by-game/lol/by-puuid/' + p, 3600);
    return { region: d.region?.toLowerCase() };
  }
  if (accion === 'historial') return historial(ctx, a.puuid);
  if (accion === 'maestria') {
    const campeon = ctx.parametros.get('campeon') || '';
    if (!/^\d{1,5}$/.test(campeon)) throw fallo(400, 'Campeón inválido.');
    const d = await ctx.local(
      '/lol/champion-mastery/v4/champion-masteries/by-puuid/' + p + '/by-champion/' + campeon,
    );
    return {
      puntos: d.championPoints,
      nivel: d.championLevel,
      siguiente: d.championPointsUntilNextLevel,
      marcas: d.markRequiredForNextLevel,
      grados: d.milestoneGrades || [],
      notas: d.nextSeasonMilestone?.requireGradeCounts || {},
      sesion: d.championSeasonMilestone,
    };
  }
  if (accion === 'desafios') {
    const d = await ctx.local('/lol/challenges/v1/player-data/' + p);
    const config = await ctx.local('/lol/challenges/v1/challenges/config', 86400).catch(() => []);
    const nombres = new Map(
      config.map((c) => [
        c.id,
        c.localizedNames?.es_AR?.name ||
          c.localizedNames?.es_ES?.name ||
          c.localizedNames?.en_US?.name,
      ]),
    );
    return {
      total: d.totalPoints,
      categorias: d.categoryPoints,
      seleccionados: d.preferences?.challengeIds || [],
      desafios: (d.challenges || []).map((c) => ({
        id: c.challengeId,
        percentil: c.percentile,
        posicion: c.position,
        nombre: nombres.get(c.challengeId) || String(c.challengeId),
        nivel: c.level,
        valor: c.value,
      })),
    };
  }
  if (accion === 'en-vivo') {
    try {
      const d = await ctx.local('/lol/spectator/v5/active-games/by-summoner/' + p, 30);
      if (d.gameType === 'CUSTOM_GAME' || !d.gameQueueConfigId) return null;
      return {
        modo: d.gameMode,
        inicio: d.gameStartTime,
        participantes: d.participants.map((x) => ({ equipo: x.teamId, campeon: x.championId })),
        bloqueos: (d.bannedChampions || []).map((x) => x.championId).filter((x) => x > 0),
      };
    } catch (e) {
      if (e.estado === 404) return null;
      throw e;
    }
  }
  throw fallo(400, 'Consulta desconocida.');
}

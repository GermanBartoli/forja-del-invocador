export const regiones = {
  la2: 'LAS',
  la1: 'LAN',
  br1: 'Brasil',
  na1: 'Norteamérica',
  euw1: 'Europa Oeste',
  eun1: 'Europa Nórdica y Este',
  tr1: 'Turquía',
  ru: 'Rusia',
  me1: 'Oriente Medio',
  kr: 'Corea',
  jp1: 'Japón',
  oc1: 'Oceanía',
  sg2: 'Sudeste Asiático',
  tw2: 'Taiwán',
  vn2: 'Vietnam',
};
const formato = new Intl.NumberFormat('es-AR');
export const numero = (valor) => (valor == null ? '—' : formato.format(valor));
export function nodo(tipo, texto, clase) {
  const el = document.createElement(tipo);
  if (texto != null) el.textContent = texto;
  if (clase) el.className = clase;
  return el;
}
export function boton(texto, accion) {
  const el = nodo('button', texto);
  el.type = 'button';
  el.addEventListener('click', accion);
  return el;
}
export function opciones(etiqueta, valores, cambio) {
  const cont = nodo('label', etiqueta);
  const select = nodo('select');
  for (const [clave, nombre] of Object.entries(valores)) select.add(new Option(nombre, clave));
  select.addEventListener('change', () => cambio(select.value));
  cont.append(select);
  return cont;
}
export function tabla(titulos, filas) {
  const cont = nodo('div', null, 'riot-tabla');
  cont.tabIndex = 0;
  cont.setAttribute('role', 'region');
  cont.setAttribute('aria-label', titulos.filter(Boolean).join(', '));
  const tabla = nodo('table'),
    cabecera = tabla.createTHead().insertRow();
  for (const t of titulos) cabecera.append(nodo('th', t));
  const cuerpo = tabla.createTBody();
  for (const fila of filas) {
    const tr = cuerpo.insertRow();
    for (const valor of fila) {
      const td = tr.insertCell();
      if (valor instanceof Node) td.append(valor);
      else td.textContent = valor ?? '—';
    }
  }
  cont.append(tabla);
  return cont;
}
export async function pedir(api, parametros) {
  const r = await fetch(api + '?' + new URLSearchParams(parametros));
  if (!r.headers.get('content-type')?.includes('json'))
    throw Error('El servidor no pudo devolver la consulta.');
  const datos = await r.json();
  if (!r.ok) throw Error(datos.error || 'Consulta no disponible.');
  return datos;
}
export async function cargar(contenedor, tarea) {
  const vista = nodo('div', 'Consultando Riot…', 'riot-respuesta');
  vista.setAttribute('role', 'status');
  contenedor.replaceChildren(vista);
  try {
    const resultado = await tarea();
    vista.removeAttribute('role');
    vista.replaceChildren(resultado || nodo('p', 'Sin datos disponibles.'));
  } catch (e) {
    vista.replaceChildren(
      nodo('p', e.message),
      boton('Reintentar', () => cargar(contenedor, tarea)),
    );
  }
}
const nombresCola = {
  420: 'Solo/Dúo',
  440: 'Flexible',
  450: 'ARAM',
  400: 'Normal · Reclutamiento',
  430: 'Normal',
  490: 'Partida rápida',
  700: 'Clash',
  1700: 'Arena',
};
const nombresRol = {
  TOP: 'Superior',
  JUNGLE: 'Jungla',
  MIDDLE: 'Central',
  BOTTOM: 'Inferior',
  UTILITY: 'Soporte',
};
const divisiones = {
  IRON: 'Hierro',
  BRONZE: 'Bronce',
  SILVER: 'Plata',
  GOLD: 'Oro',
  PLATINUM: 'Platino',
  EMERALD: 'Esmeralda',
  DIAMOND: 'Diamante',
  MASTER: 'Maestro',
  GRANDMASTER: 'Gran Maestro',
  CHALLENGER: 'Retador',
  NONE: 'Sin rango',
};

function explorarOro(frames) {
  const panel = nodo('figure', null, 'riot-oro');
  const puntos = frames.filter(
    (f) => Number.isFinite(f.equipos?.[100]) && Number.isFinite(f.equipos?.[200]),
  );
  if (puntos.length < 2) return panel;
  const maxTiempo = Math.max(1, puntos.at(-1).tiempo);
  const maxOro = Math.max(1, ...puntos.flatMap((p) => [p.equipos[100], p.equipos[200]]));
  const espacio = 'http://www.w3.org/2000/svg';
  const grafico = document.createElementNS(espacio, 'svg');
  grafico.setAttribute('viewBox', '0 0 600 145');
  grafico.setAttribute('aria-hidden', 'true');
  for (const [equipo, estilo] of [
    [100, 'azul'],
    [200, 'rojo'],
  ]) {
    const linea = document.createElementNS(espacio, 'polyline');
    linea.setAttribute(
      'points',
      puntos
        .map((p) =>
          [8 + (584 * p.tiempo) / maxTiempo, 137 - (129 * p.equipos[equipo]) / maxOro].join(','),
        )
        .join(' '),
    );
    linea.setAttribute('class', estilo);
    grafico.append(linea);
  }
  const cursor = document.createElementNS(espacio, 'line');
  cursor.setAttribute('y1', '5');
  cursor.setAttribute('y2', '139');
  cursor.setAttribute('class', 'cursor');
  grafico.append(cursor);
  const rotulo = nodo('figcaption', 'Oro acumulado por equipo'),
    control = nodo('input'),
    salida = nodo('output');
  control.type = 'range';
  control.min = 0;
  control.max = puntos.length - 1;
  control.value = control.max;
  control.setAttribute('aria-label', 'Explorar el oro por minuto');
  function actualizar() {
    const punto = puntos[Number(control.value)],
      x = 8 + (584 * punto.tiempo) / maxTiempo;
    cursor.setAttribute('x1', x);
    cursor.setAttribute('x2', x);
    const texto =
      'Minuto ' +
      Math.floor(punto.tiempo / 60000) +
      ' · Azul ' +
      numero(punto.equipos[100]) +
      ' · Rojo ' +
      numero(punto.equipos[200]);
    control.setAttribute('aria-valuetext', texto);
    salida.textContent = texto;
  }
  control.oninput = actualizar;
  actualizar();
  panel.append(rotulo, grafico, control, salida);
  return panel;
}

export function verPerfil(destino, datos, region, catalogo, lector) {
  const campeon = (id) => catalogo.campeones[id]?.nombre || 'Campeón ' + id;
  const objeto = (id) => catalogo.objetos[id] || 'Objeto ' + id;
  const parametros = { id: datos.name, region };
  const consulta =
    lector || ((accion, extra = {}) => pedir('/api/player', { ...parametros, accion, ...extra }));
  const nav = nodo('div', null, 'riot-controles'),
    contenido = nodo('div');
  destino.classList.add('riot-panel');
  destino.replaceChildren(nav, contenido);
  let partidas = [...datos.matches],
    siguiente = datos.siguiente,
    cola = '',
    dias = '0',
    avisos = datos.warnings || [];
  function clasificacion() {
    if (!datos.ranks.length) return nodo('p', 'Sin clasificación en las colas disponibles.');
    return tabla(
      ['Cola', 'Rango', 'LP', 'Victorias', 'Derrotas', 'Victorias %'],
      datos.ranks.map((r) => [
        { RANKED_SOLO_5x5: 'Solo/Dúo', RANKED_FLEX_SR: 'Flexible' }[r.queueType] || r.queueType,
        (divisiones[r.tier] || r.tier) + ' ' + r.rank,
        numero(r.leaguePoints),
        numero(r.wins),
        numero(r.losses),
        Math.round((100 * r.wins) / Math.max(1, r.wins + r.losses)) + ' %',
      ]),
    );
  }
  function maestrias() {
    const lista = datos.coleccion || datos.masteries,
      panel = nodo('div'),
      cuerpo = nodo('div');
    const filtro = nodo('input');
    filtro.type = 'search';
    filtro.placeholder = 'Buscar campeón';
    filtro.setAttribute('aria-label', filtro.placeholder);
    const hitos = nodo('div');
    let orden = 'puntos';
    function pintar() {
      const filtrada = lista.filter((m) =>
        campeon(m.championId).toLocaleLowerCase().includes(filtro.value.toLocaleLowerCase()),
      );
      const clave = { puntos: 'championPoints', nivel: 'championLevel', fecha: 'lastPlayTime' }[
        orden
      ];
      filtrada.sort((a, b) => b[clave] - a[clave]);
      cuerpo.replaceChildren(
        nodo('p', numero(filtrada.length) + (filtrada.length === 1 ? ' campeón' : ' campeones')),
        tabla(
          ['Campeón', 'Nivel', 'Puntos', 'Última partida'],
          filtrada.map((m) => [
            boton(campeon(m.championId), () =>
              cargar(hitos, async () => {
                const d = await consulta('maestria', { campeon: m.championId }),
                  res = nodo('div');
                res.append(
                  nodo('h4', campeon(m.championId) + ' · Nivel ' + numero(d.nivel)),
                  nodo(
                    'p',
                    numero(d.puntos) +
                      ' puntos · ' +
                      numero(d.siguiente) +
                      ' para el próximo nivel · Marcas necesarias: ' +
                      numero(d.marcas),
                  ),
                  nodo('p', 'Notas del hito: ' + (d.grados.join(', ') || 'Sin notas registradas')),
                );
                if (Object.keys(d.notas).length)
                  res.append(tabla(['Nota requerida', 'Cantidad'], Object.entries(d.notas)));
                return res;
              }),
            ),
            numero(m.championLevel),
            numero(m.championPoints),
            m.lastPlayTime ? new Date(m.lastPlayTime).toLocaleDateString('es-AR') : '—',
          ]),
        ),
      );
    }
    filtro.oninput = pintar;
    panel.append(
      filtro,
      opciones(
        'Ordenar por',
        { puntos: 'Puntos', nivel: 'Nivel', fecha: 'Última partida' },
        (v) => {
          orden = v;
          pintar();
        },
      ),
      hitos,
      cuerpo,
    );
    pintar();
    return panel;
  }
  function cronologia(partida) {
    const vista = nodo('div'),
      cuerpo = nodo('div');
    const nombre = (id) =>
      partida.participantes?.find((p) => p.numero === id)?.campeon || 'Entorno';
    return consulta('cronologia', { partida: partida.id }).then(({ eventos, oro }) => {
      const curva = nodo('details');
      curva.append(
        nodo('summary', 'Evolución del oro por minuto'),
        tabla(
          ['Minuto', 'Equipo azul', 'Equipo rojo', 'Diferencia azul'],
          oro.map((f) => [
            Math.floor(f.tiempo / 60000),
            numero(f.equipos[100]),
            numero(f.equipos[200]),
            numero(f.equipos[100] - f.equipos[200]),
          ]),
        ),
      );
      vista.append(explorarOro(oro), curva);
      function filtrar(grupo) {
        const filas = eventos
          .filter((e) => grupo === 'todos' || e.tipo === grupo)
          .map((e) => {
            let accion;
            switch (e.tipo) {
              case 'CHAMPION_KILL':
                accion = 'Eliminó a ' + nombre(e.objetivo);
                break;
              case 'ITEM_PURCHASED':
                accion = 'Compró ' + objeto(e.objeto);
                break;
              case 'SKILL_LEVEL_UP':
                accion = 'Subió ' + (['', 'Q', 'W', 'E', 'R'][e.habilidad] || 'una habilidad');
                break;
              case 'BUILDING_KILL':
                accion = 'Derribó ' + e.edificio;
                break;
              default:
                accion = 'Consiguió ' + e.monstruo;
            }
            return [
              Math.floor(e.tiempo / 60000) +
                ':' +
                String(Math.floor(e.tiempo / 1000) % 60).padStart(2, '0'),
              nombre(e.autor),
              accion,
            ];
          });
        cuerpo.replaceChildren(tabla(['Tiempo', 'Campeón', 'Evento'], filas));
      }
      vista.append(
        opciones(
          'Eventos',
          {
            CHAMPION_KILL: 'Eliminaciones',
            ELITE_MONSTER_KILL: 'Monstruos épicos',
            BUILDING_KILL: 'Estructuras',
            ITEM_PURCHASED: 'Compras',
            SKILL_LEVEL_UP: 'Habilidades',
            todos: 'Todos',
          },
          filtrar,
        ),
        cuerpo,
      );
      filtrar('CHAMPION_KILL');
      return vista;
    });
  }
  function detalle(m) {
    const fila = nodo('details', null, 'riot-partida'),
      titulo = nodo('summary');
    const id = m.jugador?.campeonId,
      referencia = catalogo.campeones[id];
    if (referencia) {
      const img = nodo('img');
      img.src =
        'https://ddragon.leagueoflegends.com/cdn/' +
        catalogo.version +
        '/img/champion/' +
        referencia.id +
        '.png';
      img.alt = '';
      img.width = 36;
      img.height = 36;
      img.loading = 'lazy';
      titulo.append(img);
    }
    titulo.append(
      nodo('strong', m.win ? 'Victoria' : 'Derrota', m.win ? 'riot-gana' : 'riot-pierde'),
      nodo('b', m.champion),
      nodo('span', [m.kills, m.deaths, m.assists].join(' / ')),
      nodo('span', nombresCola[m.cola] || m.mode),
      nodo(
        'span',
        Math.floor(m.duration / 60) + ' min · ' + new Date(m.date).toLocaleDateString('es-AR'),
      ),
    );
    fila.append(titulo);
    fila.addEventListener('toggle', () => {
      if (!fila.open || fila.children.length > 1) return;
      const propio = m.jugador;
      if (propio) {
        const equipo = nodo('div', null, 'riot-inventario');
        for (const id of propio.objetos) {
          const img = nodo('img');
          img.src =
            'https://ddragon.leagueoflegends.com/cdn/' +
            catalogo.version +
            '/img/item/' +
            id +
            '.png';
          img.alt = objeto(id);
          img.title = objeto(id);
          img.width = 32;
          img.height = 32;
          img.loading = 'lazy';
          equipo.append(img);
        }
        fila.append(nodo('h4', 'Objetos finales · ' + m.champion), equipo);
      }
      const equipos = [...new Set((m.participantes || []).map((p) => p.equipo))];
      for (const id of equipos) {
        const equipo = m.equipos?.find((e) => e.equipo === id);
        fila.append(
          nodo(
            'h4',
            (id === 100 ? 'Equipo azul' : id === 200 ? 'Equipo rojo' : 'Equipo ' + id) +
              (equipo?.victoria ? ' · Victoria' : ''),
          ),
        );
        const objetivos = equipo?.objetivos;
        if (objetivos)
          fila.append(
            nodo(
              'p',
              ['tower', 'dragon', 'baron', 'inhibitor', 'riftHerald', 'horde']
                .filter((k) => objetivos[k])
                .map(
                  (k) =>
                    ({
                      tower: 'Torres',
                      dragon: 'Dragones',
                      baron: 'Barones',
                      inhibitor: 'Inhibidores',
                      riftHerald: 'Heraldos',
                      horde: 'Larvas',
                    })[k] +
                    ' ' +
                    objetivos[k].kills,
                )
                .join(' · '),
            ),
          );
        fila.append(
          tabla(
            [
              'Jugador',
              'Campeón',
              'Posición',
              'K/D/A',
              'Oro',
              'Daño',
              'Súbditos',
              'Visión',
              'Objetos',
              'Hechizos',
              'Runas',
            ],
            m.participantes
              .filter((p) => p.equipo === id)
              .map((p) => [
                p.nombre,
                p.campeon,
                nombresRol[p.rol] || '—',
                [p.kills, p.deaths, p.assists].join('/'),
                numero(p.oro),
                numero(p.dano),
                numero(p.subditos),
                numero(p.vision),
                p.objetos.map(objeto).join(', ') || '—',
                p.hechizos.map((i) => catalogo.hechizos[i] || i).join(', '),
                p.runas.map((i) => catalogo.runas[i] || i).join(', '),
              ]),
          ),
        );
      }
      const linea = nodo('div');
      fila.append(
        nodo('p', 'Parche ' + (m.parche || '—')),
        boton('Ver cronología', () => cargar(linea, () => cronologia(m))),
        linea,
      );
    });
    return fila;
  }
  function historial() {
    const panel = nodo('div'),
      lista = nodo('div'),
      estado = nodo('p'),
      pie = nodo('div');
    let generacion = 0;
    async function pagina(inicio) {
      const actual = ++generacion;
      pie.replaceChildren(nodo('p', 'Consultando partidas…'));
      try {
        const d = await consulta('historial', { inicio, cola, dias });
        if (actual !== generacion || !panel.isConnected) return;
        partidas = inicio ? [...partidas, ...d.matches] : d.matches;
        siguiente = d.siguiente;
        avisos = d.warnings;
        pintar();
      } catch (e) {
        if (actual === generacion)
          pie.replaceChildren(
            nodo('p', e.message),
            boton('Reintentar', () => pagina(inicio)),
          );
      }
    }
    function pintar() {
      const victorias = partidas.filter((m) => m.win).length;
      const bajas = partidas.reduce((s, m) => s + m.kills, 0),
        asistencias = partidas.reduce((s, m) => s + m.assists, 0),
        muertes = partidas.reduce((s, m) => s + m.deaths, 0);
      estado.textContent = [
        partidas.length
          ? numero(partidas.length) +
            (partidas.length === 1 ? ' partida · ' : ' partidas · ') +
            victorias +
            (victorias === 1 ? ' victoria · ' : ' victorias · ') +
            Math.round((victorias * 100) / partidas.length) +
            ' % · KDA ' +
            ((bajas + asistencias) / Math.max(1, muertes)).toFixed(2)
          : 'Sin partidas para este filtro.',
        ...avisos,
      ].join(' ');
      lista.replaceChildren(...partidas.map(detalle));
      pie.replaceChildren();
      if (siguiente != null) pie.append(boton('Cargar más partidas', () => pagina(siguiente)));
    }
    const filtro = opciones(
      'Cola',
      { '': 'Todas', 420: 'Solo/Dúo', 440: 'Flexible', 450: 'ARAM', 700: 'Clash', 1700: 'Arena' },
      (v) => {
        cola = v;
        partidas = [];
        avisos = [];
        siguiente = 0;
        pintar();
        pagina(0);
      },
    );
    filtro.querySelector('select').value = cola;
    const periodo = opciones(
      'Período',
      {
        0: 'Todo el historial disponible',
        7: 'Últimos 7 días',
        30: 'Últimos 30 días',
        90: 'Últimos 90 días',
        365: 'Último año',
      },
      (v) => {
        dias = v;
        partidas = [];
        avisos = [];
        siguiente = 0;
        pintar();
        pagina(0);
      },
    );
    periodo.querySelector('select').value = dias;
    panel.append(filtro, periodo, estado, lista, pie);
    pintar();
    return panel;
  }
  function rendimiento() {
    const panel = nodo('div'),
      campeones = new Map(),
      roles = new Map();
    panel.append(
      nodo('h3', 'Rendimiento en las partidas cargadas'),
      nodo(
        'p',
        numero(partidas.length) +
          (partidas.length === 1 ? ' partida del filtro actual.' : ' partidas del filtro actual.') +
          (siguiente != null ? ' Podés ampliar la muestra con «Cargar más partidas».' : ''),
      ),
    );
    if (!partidas.length) return panel;
    function sumar(mapa, clave, m) {
      const s = mapa.get(clave) || { partidas: 0, victorias: 0, kills: 0, deaths: 0, assists: 0 };
      s.partidas++;
      s.victorias += Number(m.win);
      s.kills += m.kills;
      s.deaths += m.deaths;
      s.assists += m.assists;
      mapa.set(clave, s);
    }
    for (const m of partidas) {
      sumar(campeones, m.champion, m);
      sumar(roles, nombresRol[m.jugador?.rol] || 'Sin posición', m);
    }
    for (const [titulo, mapa] of [
      ['Por campeón', campeones],
      ['Por posición', roles],
    ]) {
      panel.append(
        nodo('h4', titulo),
        tabla(
          ['', 'Partidas', 'Victorias', 'Victorias %', 'KDA'],
          [...mapa]
            .sort((a, b) => b[1].partidas - a[1].partidas)
            .map(([k, s]) => [
              k,
              s.partidas,
              s.victorias,
              Math.round((s.victorias * 100) / s.partidas) + ' %',
              ((s.kills + s.assists) / Math.max(1, s.deaths)).toFixed(2),
            ]),
        ),
      );
    }
    const compras = new Map(),
      socios = new Map(),
      runas = new Map();
    for (const m of partidas) {
      const jugador = m.jugador;
      if (!jugador) continue;
      for (const id of new Set(
        m.mode === 'CHERRY' || m.cola === 1700 || m.cola === 1710 ? [] : jugador.objetos || [],
      )) {
        const dato = compras.get(id) || [0, 0];
        dato[0]++;
        dato[1] += Number(m.win);
        compras.set(id, dato);
      }
      const runa = jugador.runas?.[0];
      if (runa) runas.set(runa, (runas.get(runa) || 0) + 1);
      for (const aliado of m.participantes || []) {
        if (
          aliado.equipo !== jugador.equipo ||
          aliado.numero === jugador.numero ||
          !aliado.nombre?.includes('#')
        )
          continue;
        socios.set(aliado.nombre, (socios.get(aliado.nombre) || 0) + 1);
      }
    }
    if (compras.size)
      panel.append(
        nodo('h4', 'Objetos finales más usados'),
        tabla(
          ['Objeto', 'Partidas', 'Victorias'],
          [...compras]
            .sort((a, b) => b[1][0] - a[1][0])
            .slice(0, 10)
            .map(([id, [total, victorias]]) => [objeto(id), total, victorias]),
        ),
      );
    if (runas.size)
      panel.append(
        nodo('h4', 'Runas clave'),
        tabla(
          ['Runa', 'Partidas'],
          [...runas].sort((a, b) => b[1] - a[1]).map(([id, n]) => [catalogo.runas[id] || id, n]),
        ),
      );
    const repetidos = [...socios].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
    if (repetidos.length)
      panel.append(
        nodo('h4', 'Compañeros que coincidieron en varias partidas'),
        tabla(['Riot ID', 'Partidas juntos'], repetidos),
      );
    const records = [
      ['Más daño', 'dano'],
      ['Más oro', 'oro'],
      ['Más visión', 'vision'],
      ['Más súbditos', 'subditos'],
      ['Más curación', 'curacion'],
      ['Más pentakills', 'pentas'],
    ];
    const filas = records.flatMap(([etiqueta, clave]) => {
      const mejores = partidas
        .filter((m) => Number.isFinite(m.jugador?.[clave]))
        .sort((a, b) => b.jugador[clave] - a.jugador[clave]);
      const m = mejores[0];
      return m
        ? [
            [
              etiqueta,
              numero(m.jugador[clave]),
              m.champion,
              new Date(m.date).toLocaleDateString('es-AR'),
            ],
          ]
        : [];
    });
    panel.append(
      nodo('h4', 'Récords de la muestra'),
      tabla(['Estadística', 'Valor', 'Campeón', 'Fecha'], filas),
    );
    return panel;
  }
  function progreso() {
    const caja = nodo('div'),
      clave = 'lol:progreso:' + region + ':' + datos.name.toLowerCase();
    let capturas = [];
    try {
      const previas = JSON.parse(localStorage.getItem(clave) || '[]');
      if (Array.isArray(previas))
        capturas = previas.filter((c) => c?.fecha && Array.isArray(c.rangos));
    } catch {}
    const fecha = datos.updatedAt.slice(0, 10);
    const hoy = {
      fecha,
      nivel: datos.level,
      maestria: (datos.coleccion || datos.masteries).reduce(
        (s, m) => s + (m.championPoints || 0),
        0,
      ),
      rangos: datos.ranks.map((r) => ({
        cola: r.queueType,
        valor: r.tier + ' ' + r.rank + ' · ' + r.leaguePoints + ' LP',
      })),
    };
    capturas = capturas
      .filter((c) => c.fecha !== fecha)
      .concat(hoy)
      .slice(-90);
    let guardado = true;
    try {
      localStorage.setItem(clave, JSON.stringify(capturas));
    } catch {
      guardado = false;
    }
    caja.append(
      nodo('h3', 'Progreso guardado en este navegador'),
      nodo(
        'p',
        guardado
          ? 'Se guarda una observación por día al abrir esta pestaña.'
          : 'El navegador no pudo guardar la observación.',
      ),
      tabla(
        ['Fecha', 'Nivel', 'Puntos de maestría', 'Solo/Dúo', 'Flexible'],
        [...capturas]
          .reverse()
          .map((c) => [
            c.fecha,
            numero(c.nivel),
            numero(c.maestria),
            ...['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'].map(
              (q) => c.rangos.find((r) => r.cola === q)?.valor || '—',
            ),
          ]),
      ),
    );
    return caja;
  }
  async function desafios() {
    const d = await consulta('desafios'),
      panel = nodo('div');
    panel.append(
      nodo(
        'h4',
        (divisiones[d.total?.level] || d.total?.level || 'Sin rango') +
          ' · ' +
          numero(d.total?.current) +
          ' puntos',
      ),
      tabla(
        ['Categoría', 'Puntos', 'Nivel'],
        Object.entries(d.categorias || {}).map(([k, v]) => [
          k,
          numero(v.current),
          divisiones[v.level] || v.level,
        ]),
      ),
      tabla(
        ['Desafío', 'Nivel', 'Valor', 'Percentil', 'Posición'],
        d.desafios.map((c) => [
          (d.seleccionados.includes(c.id) ? '★ ' : '') + c.nombre,
          divisiones[c.nivel] || c.nivel,
          numero(c.valor),
          c.percentil == null
            ? '—'
            : (c.percentil * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 }) + ' %',
          numero(c.posicion),
        ]),
      ),
    );
    return panel;
  }
  async function vivo() {
    const d = await consulta('en-vivo');
    if (!d) return nodo('p', 'Este jugador no tiene una partida observable en curso.');
    const panel = nodo('div');
    panel.append(
      nodo('h4', d.modo),
      tabla(
        ['Equipo', 'Campeón'],
        d.participantes.map((p) => [p.equipo === 100 ? 'Azul' : 'Rojo', campeon(p.campeon)]),
      ),
      nodo('p', 'Bloqueos: ' + (d.bloqueos.map(campeon).join(', ') || '—')),
    );
    return panel;
  }
  for (const [nombre, tarea] of [
    ['Partidas', historial],
    ['Rendimiento', rendimiento],
    ['Clasificatorias', clasificacion],
    ['Maestrías', maestrias],
    ['Progreso', progreso],
    ['Desafíos', desafios],
    ['En vivo', vivo],
  ]) {
    const b = boton(nombre, () => {
      for (const el of nav.children) el.setAttribute('aria-pressed', String(el === b));
      cargar(contenido, tarea);
    });
    nav.append(b);
  }
  nav.firstChild.click();
}

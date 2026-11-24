import {
  nodo,
  boton,
  opciones,
  tabla,
  cargar,
  pedir,
  regiones,
  verPerfil,
  numero,
} from '/riot-perfil.js';
import { mostrarEjemplo } from './perfil-ejemplo.js';
const cdn = 'https://ddragon.leagueoflegends.com/cdn/';
const api = '/api/grieta';
let region = 'la2',
  ultimo = '',
  pestana = 'Jugadores';
const fecha = (ms) => (ms ? new Date(ms).toLocaleString('es-AR') : 'Por confirmar');
function formulario(accion, texto = 'Buscar') {
  const form = nodo('form', null, 'riot-buscar');
  const campo = nodo('input');
  campo.required = true;
  campo.maxLength = 50;
  campo.value = ultimo;
  campo.placeholder = 'Nombre#tag';
  campo.setAttribute('aria-label', 'Riot ID');
  const enviar = nodo('button', texto);
  enviar.type = 'submit';
  form.append(campo, enviar);
  form.onsubmit = (e) => {
    e.preventDefault();
    ultimo = campo.value.trim();
    accion(ultimo);
  };
  return form;
}
export async function mostrarGrieta(contenedor) {
  const origen = new URL(location.hash.slice(1) || 'grieta', location.origin);
  const rutas = {
    Jugadores: 'jugadores',
    'Rotación gratuita': 'rotacion',
    Clasificatorias: 'clasificatorias',
    Divisiones: 'divisiones',
    Comparar: 'comparar',
    Clash: 'clash',
    Desafíos: 'desafios',
    'En vivo': 'en-vivo',
    Estado: 'estado',
    Atlas: 'atlas',
  };
  const inicial = Object.keys(rutas).find((k) => rutas[k] === origen.pathname.split('/')[2]);
  pestana = inicial || 'Jugadores';
  const inicialRegion = origen.searchParams.get('region');
  if (Object.hasOwn(regiones, inicialRegion)) region = inicialRegion;
  const inicialId = origen.searchParams.get('id');
  if (inicialId && inicialId.length <= 50) ultimo = inicialId;
  function guardarRuta(nombre, id) {
    const params = new URLSearchParams({ region });
    if (id) params.set('id', id);
    history.replaceState(null, '', '#grieta/' + rutas[nombre] + '?' + params);
  }
  const panel = nodo('section', null, 'riot-panel'),
    portada = nodo('header', null, 'riot-portada');
  panel.lang = 'es';
  portada.classList.add('forja-grieta');
  const nav = nodo('div', null, 'riot-controles'),
    salida = nodo('div');
  const selector = opciones('Región', regiones, (v) => {
    region = v;
    seleccionar(pestana);
  });
  selector.querySelector('select').value = region;
  portada.append(
    nodo('h1', 'La Grieta'),
    nodo(
      'p',
      'Explorá las partidas de un jugador, la rotación gratuita y las clasificatorias de cada región.',
    ),
    selector,
  );
  const politicas = nodo('a', 'Políticas de Riot del proyecto');
  politicas.href =
    'https://github.com/GermanBartoli/forja-del-invocador/blob/main/docs/POLITICAS_RIOT.md';
  politicas.className = 'riot-politicas';
  const aviso = nodo('p');
  aviso.hidden = true;
  aviso.setAttribute('role', 'status');
  panel.append(portada, aviso, nav, salida, politicas);
  pedir('/api/player', { accion: 'disponibilidad' })
    .then((d) => {
      if (!d.disponible) {
        aviso.hidden = false;
        aviso.textContent =
          'Las consultas públicas esperan la aprobación de Riot. El Atlas y el perfil de ejemplo ya están disponibles.';
      }
    })
    .catch(() => {});
  contenedor.replaceChildren(panel);
  let ref, enciclopedia;
  const catalogo = () =>
    (ref ||= fetch('/data/referencias-riot.json')
      .then((r) => r.json())
      .catch((e) => {
        ref = null;
        throw e;
      }));
  const atlas = () =>
    (enciclopedia ||= fetch('/data/atlas-riot.json')
      .then((r) => r.json())
      .catch((e) => {
        enciclopedia = null;
        throw e;
      }));
  const consultar = (accion, extra = {}) => pedir(api, { accion, region, ...extra });
  function jugadores() {
    const caja = nodo('div'),
      resultado = nodo('div');
    function buscar(id) {
      guardarRuta('Jugadores', id);
      cargar(resultado, async () => {
        const [d, c] = await Promise.all([pedir('/api/player', { id, region }), catalogo()]);
        const ficha = nodo('article'),
          datos = nodo('div');
        const identidad = nodo('div', null, 'riot-identidad'),
          icono = nodo('img');
        icono.src = cdn + c.version + '/img/profileicon/' + d.icon + '.png';
        icono.width = 64;
        icono.height = 64;
        icono.alt = '';
        identidad.append(icono, nodo('h2', d.name));
        ficha.append(
          identidad,
          nodo(
            'p',
            'Nivel ' +
              numero(d.level) +
              ' · ' +
              numero(d.masteryScore) +
              ' niveles de maestría acumulados',
          ),
          datos,
        );
        verPerfil(datos, d, region, c);
        return ficha;
      });
    }
    const form = formulario(buscar);
    form.append(
      boton('Detectar región', () => {
        const campo = form.querySelector('input');
        if (!campo.reportValidity()) return;
        ultimo = campo.value.trim();
        cargar(resultado, async () => {
          const r = await pedir('/api/player', { id: ultimo, accion: 'region', region });
          if (!regiones[r.region]) throw Error('Riot no indicó una región compatible.');
          region = r.region;
          selector.querySelector('select').value = region;
          const aviso = nodo('p', 'Región detectada: ' + regiones[region]);
          aviso.append(boton('Ver perfil', () => buscar(ultimo)));
          return aviso;
        });
      }),
    );
    caja.append(
      nodo('h2', 'Perfil de invocador'),
      form,
      boton('Explorar un perfil de ejemplo', () =>
        cargar(resultado, async () => mostrarEjemplo(await catalogo())),
      ),
      resultado,
    );
    return caja;
  }
  async function rotacion() {
    const [d, c] = await Promise.all([consultar('rotacion'), catalogo()]);
    const caja = nodo('div');
    for (const [titulo, ids] of [
      ['Rotación gratuita', d.general],
      ['Rotación para cuentas nuevas', d.inicial],
    ]) {
      const lista = nodo('div', null, 'riot-galeria');
      for (const id of ids) {
        const x = c.campeones[id];
        if (!x) continue;
        const a = nodo('a'),
          img = nodo('img');
        img.src = cdn + c.version + '/img/champion/' + x.id + '.png';
        img.width = 56;
        img.height = 56;
        img.alt = '';
        img.loading = 'lazy';
        a.href = '#campeones/' + x.id;
        a.append(img, nodo('b', x.nombre));
        lista.append(a);
      }
      caja.append(
        nodo('h2', titulo),
        ids.length ? lista : nodo('p', 'Riot no publicó campeones para esta lista.'),
      );
    }
    return caja;
  }
  function ligas() {
    const caja = nodo('div'),
      resultados = nodo('div');
    let nivel = 'challenger',
      cola = 'RANKED_SOLO_5x5',
      pagina = 0;
    const niveles = { challenger: 'Retador', grandmaster: 'Gran Maestro', master: 'Maestro' };
    function listar() {
      cargar(resultados, async () => {
        const d = await consultar('liga', { nivel, cola, pagina });
        const lista = nodo('div');
        lista.append(
          nodo('p', numero(d.total) + ' jugadores'),
          tabla(
            ['Puesto', 'Jugador', 'LP', 'Victorias', 'Derrotas'],
            d.lista.map((p) => {
              const nombre = p.nombre.includes('#')
                ? boton(p.nombre, () => {
                    ultimo = p.nombre;
                    seleccionar('Jugadores');
                    salida.querySelector('form')?.requestSubmit();
                  })
                : p.nombre;
              return [p.puesto, nombre, numero(p.lp), numero(p.victorias), numero(p.derrotas)];
            }),
          ),
        );
        if (pagina)
          lista.append(
            boton('Anterior', () => {
              pagina--;
              listar();
            }),
          );
        if (pagina * 5 + 5 < d.total)
          lista.append(
            boton('Siguiente', () => {
              pagina++;
              listar();
            }),
          );
        return lista;
      });
    }
    caja.append(
      nodo('h2', 'Clasificatorias oficiales'),
      opciones('Liga', niveles, (v) => {
        nivel = v;
        pagina = 0;
        listar();
      }),
      opciones('Cola', { RANKED_SOLO_5x5: 'Solo/Dúo', RANKED_FLEX_SR: 'Flexible' }, (v) => {
        cola = v;
        pagina = 0;
        listar();
      }),
      resultados,
    );
    listar();
    return caja;
  }
  function clash() {
    const caja = nodo('div'),
      calendario = nodo('div'),
      equipo = nodo('div');
    caja.append(
      nodo('h2', 'Próximos torneos de Clash'),
      calendario,
      nodo('h3', 'Equipo de un jugador'),
      formulario((id) =>
        cargar(equipo, async () => {
          const equipos = await consultar('equipo', { id }),
            lista = nodo('div');
          if (!equipos.length) return nodo('p', 'Sin equipo de Clash registrado.');
          for (const e of equipos)
            lista.append(
              nodo('h4', e.nombre + ' [' + e.etiqueta + ']' + (e.torneo ? ' · ' + e.torneo : '')),
              tabla(
                ['Posición', 'Rol'],
                e.jugadores.map((j) => [j.posicion, j.rol]),
              ),
            );
          return lista;
        }),
      ),
      equipo,
    );
    cargar(calendario, async () => {
      const d = await consultar('clash');
      if (!d.length) return nodo('p', 'Riot todavía no publicó torneos para esta región.');
      const panel = nodo('div'),
        detalle = nodo('div');
      panel.append(
        tabla(
          ['Torneo', 'Fase', 'Registro', 'Comienzo'],
          d.flatMap((t) =>
            t.schedule.map((f) => [
              boton([t.nameKey, t.nameKeySecondary].filter(Boolean).join(' · '), () =>
                cargar(detalle, async () => {
                  const x = await consultar('torneo', { torneo: t.id });
                  return tabla(
                    ['Fase', 'Registro', 'Comienzo', 'Estado'],
                    x.schedule.map((s) => [
                      s.id,
                      fecha(s.registrationTime),
                      fecha(s.startTime),
                      s.cancelled ? 'Cancelada' : 'Programada',
                    ]),
                  );
                }),
              ),
              f.id,
              fecha(f.registrationTime),
              fecha(f.startTime),
            ]),
          ),
        ),
        detalle,
      );
      return panel;
    });
    return caja;
  }
  async function retos() {
    const datos = await consultar('retos'),
      caja = nodo('div'),
      campo = nodo('input'),
      lista = nodo('div');
    campo.type = 'search';
    campo.placeholder = 'Buscar desafío';
    campo.setAttribute('aria-label', campo.placeholder);
    function pintar() {
      const filas = datos.filter((x) =>
        x.nombre?.toLowerCase().includes(campo.value.toLowerCase()),
      );
      lista.replaceChildren(nodo('p', numero(filas.length) + ' desafíos'));
      for (const d of filas) {
        const ficha = nodo('details', null, 'riot-partida'),
          mostrar = nodo('div');
        ficha.append(nodo('summary', d.nombre));
        ficha.addEventListener('toggle', () => {
          if (!ficha.open || ficha.children.length > 1) return;
          ficha.append(
            nodo('p', d.descripcion),
            tabla(['Nivel', 'Objetivo'], Object.entries(d.umbrales || {})),
            boton('Ficha oficial', () =>
              cargar(mostrar, async () => {
                const f = await consultar('umbrales', { reto: d.id });
                return nodo(
                  'p',
                  (f.localizedNames?.es_AR?.description || d.descripcion || d.nombre) +
                    ' · ' +
                    f.state,
                );
              }),
            ),
            boton('Distribución regional', () =>
              cargar(mostrar, async () =>
                tabla(
                  ['Nivel', 'Proporción'],
                  Object.entries(await consultar('distribucion', { reto: d.id })).map(([k, v]) => [
                    k,
                    (100 * v).toLocaleString('es-AR', { maximumFractionDigits: 3 }) + ' %',
                  ]),
                ),
              ),
            ),
            mostrar,
          );
          if (d.clasificacion) {
            const lideres = nodo('div');
            const niveles = opciones(
              'Nivel',
              { CHALLENGER: 'Retador', GRANDMASTER: 'Gran Maestro', MASTER: 'Maestro' },
              () => {},
            );
            ficha.append(
              niveles,
              boton('Ver líderes del desafío', () =>
                cargar(lideres, async () => {
                  const valores = await consultar('lideres-reto', {
                    reto: d.id,
                    nivel: niveles.querySelector('select').value,
                  });
                  return valores.length
                    ? tabla(
                        ['Puesto', 'Jugador', 'Valor'],
                        valores.map((x) => [x.puesto, x.nombre, numero(x.valor)]),
                      )
                    : nodo('p', 'Sin jugadores clasificados.');
                }),
              ),
              lideres,
            );
          }
        });
        lista.append(ficha);
      }
    }
    const resumen = nodo('div');
    campo.oninput = pintar;
    caja.append(
      nodo('h2', 'Desafíos de League of Legends'),
      campo,
      boton('Distribución por desafío', () =>
        cargar(resumen, async () => {
          const porcentajes = await consultar('percentiles');
          return tabla(
            ['Desafío', 'Oro', 'Diamante', 'Maestro'],
            datos
              .filter((d) => porcentajes[d.id])
              .map((d) => [
                d.nombre,
                ...['GOLD', 'DIAMOND', 'MASTER'].map(
                  (n) =>
                    ((porcentajes[d.id][n] || 0) * 100).toLocaleString('es-AR', {
                      maximumFractionDigits: 2,
                    }) + ' %',
                ),
              ]),
          );
        }),
      ),
      resumen,
      lista,
    );
    pintar();
    return caja;
  }
  async function estado() {
    const d = await consultar('estado'),
      caja = nodo('div');
    caja.append(
      nodo('h2', 'Estado del servidor · ' + regiones[region]),
      d.length
        ? tabla(
            ['Aviso', 'Estado', 'Actualizado'],
            d.map((x) => [x.titulo, x.estado, fecha(x.fecha)]),
          )
        : nodo('p', 'Riot no informa incidentes ni mantenimiento.'),
    );
    return caja;
  }
  function enVivo() {
    const caja = nodo('div'),
      contenido = nodo('div');
    caja.append(
      nodo('h2', 'Buscar partida en curso'),
      formulario((id) =>
        cargar(contenido, async () => {
          const [d, c] = await Promise.all([
            pedir('/api/player', { id, region, accion: 'en-vivo' }),
            catalogo(),
          ]);
          if (!d) return nodo('p', 'El jugador no tiene una partida observable en este momento.');
          const vista = nodo('div');
          vista.append(
            nodo('h3', d.modo),
            tabla(
              ['Equipo', 'Campeón'],
              d.participantes.map((x) => [
                x.equipo === 100 ? 'Azul' : 'Rojo',
                c.campeones[x.campeon]?.nombre || x.campeon,
              ]),
            ),
            nodo(
              'p',
              'Bloqueos: ' +
                (d.bloqueos.map((id) => c.campeones[id]?.nombre || id).join(', ') || '—'),
            ),
          );
          return vista;
        }),
      ),
      contenido,
    );
    return caja;
  }
  function comparar() {
    const vista = nodo('div'),
      form = nodo('form', null, 'riot-buscar'),
      resultado = nodo('div');
    const entradas = ['Primer Riot ID', 'Segundo Riot ID'].map((texto, i) => {
      const campo = nodo('input');
      campo.required = true;
      campo.maxLength = 50;
      campo.placeholder = texto + ' · nombre#tag';
      campo.setAttribute('aria-label', texto);
      if (!i) campo.value = ultimo;
      form.append(campo);
      return campo;
    });
    const enviar = nodo('button', 'Comparar');
    enviar.type = 'submit';
    form.append(enviar);
    form.onsubmit = (e) => {
      e.preventDefault();
      cargar(resultado, async () => {
        const [a, b, c] = await Promise.all([
          ...entradas.map((x) => consultar('resumen', { id: x.value.trim() })),
          catalogo(),
        ]);
        const filas = [['Maestría total', numero(a.puntuacion), numero(b.puntuacion)]];
        for (let i = 0; i < 3; i++)
          filas.push([
            'Maestría #' + (i + 1),
            ...[a, b].map((j) => {
              const m = j.top[i];
              return m
                ? (c.campeones[m.campeon]?.nombre || m.campeon) +
                    ' · ' +
                    numero(m.puntos) +
                    ' puntos'
                : '—';
            }),
          ]);
        for (const [cola, nombre] of Object.entries({
          RANKED_SOLO_5x5: 'Solo/Dúo',
          RANKED_FLEX_SR: 'Flexible',
        }))
          filas.push([
            nombre,
            ...[a, b].map((j) => {
              const r = j.rangos.find((x) => x.cola === cola);
              return r
                ? [
                    r.nivel,
                    r.division,
                    r.lp + ' LP',
                    r.victorias + ' V / ' + r.derrotas + ' D',
                  ].join(' · ')
                : 'Sin clasificar';
            }),
          ]);
        return tabla(['Estadística', a.nombre, b.nombre], filas);
      });
    };
    vista.append(nodo('h2', 'Comparar dos jugadores de la región'), form, resultado);
    return vista;
  }
  function divisiones() {
    const caja = nodo('div'),
      resultado = nodo('div');
    const valores = { cola: 'RANKED_SOLO_5x5', nivel: 'GOLD', division: 'IV', indice: 'normal' };
    let pagina = 0,
      bloque = 1;
    function listar() {
      cargar(resultado, async () => {
        const d = await consultar('division', { ...valores, pagina, bloque }),
          lista = nodo('div');
        lista.append(
          nodo('p', 'Bloque ' + bloque + ' · Página ' + (pagina + 1)),
          d.lista.length
            ? tabla(
                ['Jugador', 'LP', 'Victorias', 'Derrotas'],
                d.lista.map((x) => [
                  x.nombre,
                  numero(x.lp),
                  numero(x.victorias),
                  numero(x.derrotas),
                ]),
              )
            : nodo('p', 'Fin del listado.'),
        );
        if (pagina || bloque > 1)
          lista.append(
            boton('Anterior', () => {
              if (pagina) pagina--;
              else bloque--;
              listar();
            }),
          );
        if (d.lista.length)
          lista.append(
            boton('Siguiente', () => {
              if ((pagina + 1) * 5 < d.total) pagina++;
              else {
                bloque++;
                pagina = 0;
              }
              listar();
            }),
          );
        return lista;
      });
    }
    caja.append(nodo('h2', 'Jugadores por división'));
    const filtros = {
      cola: ['Cola', { RANKED_SOLO_5x5: 'Solo/Dúo', RANKED_FLEX_SR: 'Flexible' }],
      nivel: [
        'Liga',
        {
          IRON: 'Hierro',
          BRONZE: 'Bronce',
          SILVER: 'Plata',
          GOLD: 'Oro',
          PLATINUM: 'Platino',
          EMERALD: 'Esmeralda',
          DIAMOND: 'Diamante',
        },
      ],
      division: ['División', { I: 'I', II: 'II', III: 'III', IV: 'IV' }],
      indice: ['Listado', { normal: 'Estándar', ampliado: 'Experimental de Riot' }],
    };
    for (const [clave, [etiqueta, op]] of Object.entries(filtros)) {
      const filtro = opciones(etiqueta, op, (v) => {
        valores[clave] = v;
        pagina = 0;
        bloque = 1;
        listar();
      });
      filtro.querySelector('select').value = valores[clave];
      caja.append(filtro);
    }
    caja.append(resultado);
    listar();
    return caja;
  }
  async function biblioteca() {
    const datos = await atlas(),
      caja = nodo('div'),
      lista = nodo('div'),
      busqueda = nodo('input');
    let tipo = 'hechizos';
    busqueda.type = 'search';
    busqueda.placeholder = 'Filtrar por nombre';
    busqueda.setAttribute('aria-label', busqueda.placeholder);
    function pintar() {
      lista.replaceChildren();
      const filas = datos[tipo].filter((d) =>
        (d.nombre + ' ' + d.grupo).toLocaleLowerCase().includes(busqueda.value.toLocaleLowerCase()),
      );
      for (const d of filas) {
        const ficha = nodo('details', null, 'riot-partida');
        ficha.append(nodo('summary', d.nombre), nodo('p', d.grupo), nodo('p', d.descripcion));
        lista.append(ficha);
      }
      if (!filas.length) lista.append(nodo('p', 'Sin resultados.'));
    }
    busqueda.oninput = pintar;
    caja.append(
      nodo('h2', 'Atlas de la Grieta'),
      nodo('p', 'Datos del parche ' + datos.version),
      opciones(
        'Colección',
        { hechizos: 'Hechizos de invocador', runas: 'Runas', mapas: 'Mapas y colas' },
        (v) => {
          tipo = v;
          pintar();
        },
      ),
      busqueda,
      lista,
    );
    pintar();
    return caja;
  }
  const secciones = {
    Jugadores: jugadores,
    'Rotación gratuita': rotacion,
    Clasificatorias: ligas,
    Divisiones: divisiones,
    Comparar: comparar,
    Clash: clash,
    Desafíos: retos,
    'En vivo': enVivo,
    Estado: estado,
    Atlas: biblioteca,
  };
  function seleccionar(nombre) {
    pestana = nombre;
    guardarRuta(nombre);
    for (const b of nav.children) b.setAttribute('aria-pressed', String(b.textContent === nombre));
    if (nombre === 'Jugadores') salida.replaceChildren(jugadores());
    else cargar(salida, secciones[nombre]);
  }
  for (const nombre of Object.keys(secciones)) nav.append(boton(nombre, () => seleccionar(nombre)));
  seleccionar(pestana);
  if (inicialId && pestana === 'Jugadores') salida.querySelector('form')?.requestSubmit();
}

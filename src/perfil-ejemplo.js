import { verPerfil, nodo } from '/riot-perfil.js';
// Muestra creada para que se pueda recorrer el producto antes de habilitar su clave pública.
export function mostrarEjemplo(catalogo) {
  const vista = nodo('article'),
    contenido = nodo('div'),
    fecha = Date.UTC(2026, 10, 1, 18);
  const campeones = [103, 254, 266, 21, 412, 238, 64, 86, 51, 99];
  const nombres = [
    'Bruma',
    'Bosque',
    'Cumbre',
    'Faro',
    'Marea',
    'Sombra',
    'Sendero',
    'Roca',
    'Aurora',
    'Luz',
  ];
  const participantes = campeones.map((id, i) => ({
    nombre: nombres[i],
    campeon: catalogo.campeones[id]?.nombre || String(id),
    campeonId: id,
    equipo: i < 5 ? 100 : 200,
    numero: i + 1,
    rol: ['MIDDLE', 'JUNGLE', 'TOP', 'BOTTOM', 'UTILITY'][i % 5],
    kills: [8, 4, 2, 6, 1, 3, 4, 2, 4, 1][i],
    deaths: [3, 4, 2, 3, 2, 5, 4, 3, 5, 4][i],
    assists: [7, 10, 4, 6, 12, 5, 3, 3, 5, 8][i],
    oro: 10200 + i * 131,
    dano: 16000 + i * 780,
    vision: 15 + i,
    subditos: 140 + i,
    objetos: [1001, 1052],
    hechizos: [4, 14],
    runas: [8112],
    curacion: 1500 + i * 30,
    pentas: 0,
  }));
  const coleccion = campeones
    .slice(0, 5)
    .map((id, i) => ({
      championId: id,
      championLevel: 12 - i,
      championPoints: 81000 - i * 12000,
      lastPlayTime: fecha - i * 86400000,
    }));
  const m = {
    id: 'ejemplo',
    date: fecha,
    duration: 1805,
    mode: 'CLASSIC',
    cola: 420,
    champion: 'Ahri',
    win: true,
    kills: 8,
    deaths: 3,
    assists: 7,
    jugador: participantes[0],
    participantes,
    equipos: [
      { equipo: 100, victoria: true, objetivos: { tower: { kills: 8 }, dragon: { kills: 3 } } },
      { equipo: 200, victoria: false, objetivos: { tower: { kills: 3 }, dragon: { kills: 1 } } },
    ],
    parche: catalogo.version,
  };
  const datos = {
    name: 'Invocador de ejemplo',
    level: 125,
    updatedAt: new Date(fecha).toISOString(),
    matches: [m],
    siguiente: null,
    ranks: [
      {
        queueType: 'RANKED_SOLO_5x5',
        tier: 'GOLD',
        rank: 'II',
        leaguePoints: 67,
        wins: 40,
        losses: 32,
      },
    ],
    coleccion,
    masteries: coleccion.slice(0, 3),
    warnings: [],
  };
  async function consultar(accion, op) {
    switch (accion) {
      case 'cronologia':
        return {
          oro: [
            { tiempo: 0, equipos: { 100: 2500, 200: 2500 } },
            { tiempo: 600000, equipos: { 100: 16000, 200: 14200 } },
          ],
          eventos: [
            { tipo: 'CHAMPION_KILL', tiempo: 345000, autor: 1, objetivo: 6 },
            { tipo: 'ELITE_MONSTER_KILL', tiempo: 460000, autor: 2, monstruo: 'Dragón' },
          ],
        };
      case 'historial':
        return {
          matches: op.dias !== '0' || (op.cola && op.cola !== '420') ? [] : [m],
          siguiente: null,
          warnings: [],
        };
      case 'maestria': {
        const c = coleccion.find((x) => x.championId === op.campeon);
        return {
          nivel: c.championLevel,
          puntos: c.championPoints,
          siguiente: 11000,
          marcas: 1,
          grados: ['S'],
          notas: { S: 1 },
        };
      }
      case 'desafios':
        return {
          total: { level: 'GOLD', current: 4300 },
          categorias: { COLECCIÓN: { level: 'GOLD', current: 760 } },
          seleccionados: [],
          desafios: [{ id: 1, nombre: 'Trabajo en equipo', nivel: 'GOLD', valor: 32 }],
        };
      case 'en-vivo':
        return null;
      default:
        throw Error('Consulta de ejemplo desconocida.');
    }
  }
  vista.append(
    nodo('h3', 'Perfil de ejemplo'),
    nodo('p', 'Datos ficticios para explorar las pestañas y abrir una partida.'),
    contenido,
  );
  verPerfil(contenido, datos, 'ejemplo', catalogo, consultar);
  return vista;
}

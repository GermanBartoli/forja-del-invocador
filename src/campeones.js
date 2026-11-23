import { normalize } from './core.js';
import { getJson } from './data.js';

const catalogos = new Map();
const ilustraciones = 'https://ddragon.leagueoflegends.com/cdn';
let busqueda = '';

export async function mostrarCampeones(contenedor, idioma, t, escapar) {
  const seccion = document.createElement('section');
  seccion.className = 'campeones';
  seccion.textContent = t.cargandoCampeones;
  contenedor.replaceChildren(seccion);
  let catalogo;
  try {
    if (!catalogos.has(idioma)) catalogos.set(idioma, getJson('/data/campeones/' + idioma + '.json'));
    catalogo = await catalogos.get(idioma);
  } catch {
    catalogos.delete(idioma);
    seccion.innerHTML = '<p>' + t.error + '</p><button class="button">' + t.retry + '</button>';
    seccion.querySelector('button').onclick = () => mostrarCampeones(contenedor, idioma, t, escapar);
    return;
  }
  if (!seccion.isConnected) return;
  const id = location.hash.split('/')[1];
  const campeon = catalogo.campeones.find(c => c.id === id);
  if (id) {
    seccion.innerHTML = '<a class="text-link" href="#campeones">← ' + t.campeones + '</a>';
    if (!campeon) {
      seccion.insertAdjacentHTML('beforeend', '<p>' + t.sinCampeones + '</p>');
      return;
    }
    const teclas = [t.pasiva, 'Q', 'W', 'E', 'R'];
    seccion.insertAdjacentHTML('beforeend', `
      <div class="ficha-campeon">
        <img class="retrato-campeon" src="${ilustraciones}/img/champion/loading/${campeon.id}_0.jpg" alt="${escapar(campeon.nombre)}" width="308" height="560">
        <div><p class="eyebrow">${escapar(campeon.titulo)}</p><h1 tabindex="-1">${escapar(campeon.nombre)}</h1>
        <h2>${t.habilidades}</h2><ul class="habilidades">${campeon.habilidades.map((h, i) => `
          <li><span class="tecla">${teclas[i]}</span><div><h3>${escapar(h.nombre)}</h3><p>${escapar(h.descripcion)}</p></div></li>`).join('')}</ul></div>
      </div>`);
    seccion.querySelector('h1').focus({ preventScroll: true });
    return;
  }
  const ordenados = [...catalogo.campeones].sort((a, b) => a.nombre.localeCompare(b.nombre, idioma.replace('_', '-')));
  seccion.innerHTML = `<h1>${t.campeones}</h1>
    <label class="search"><span aria-hidden="true">⌕</span><input id="search" type="search" autocomplete="off" aria-label="${t.buscarCampeon}" placeholder="${t.buscarCampeon}"><kbd>/</kbd></label>
    <p class="estado-campeones" role="status"></p><div class="lista-campeones"></div>`;
  const campo = seccion.querySelector('input');
  campo.value = busqueda;
  function filtrar() {
    busqueda = campo.value;
    const termino = normalize(busqueda);
    const resultados = ordenados.filter(c => normalize(c.nombre).includes(termino) || normalize(c.id).includes(termino));
    seccion.querySelector('[role="status"]').textContent = resultados.length ? resultados.length + ' / ' + ordenados.length : t.sinCampeones;
    seccion.querySelector('.lista-campeones').innerHTML = resultados.map(c => `
      <a href="#campeones/${c.id}"><img src="${ilustraciones}/${catalogo.version}/img/champion/${c.id}.png" width="48" height="48" loading="lazy" alt=""><strong>${escapar(c.nombre)}</strong></a>`).join('');
  }
  campo.addEventListener('input', filtrar);
  filtrar();
}

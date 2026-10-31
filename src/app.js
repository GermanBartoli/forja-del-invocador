import { locales, catalog, categories, matches, accepts, makeRound } from './core.js';
import { loadCatalog, iconUrl } from './data.js';
import { dictionary, regionNames } from './i18n.js';
const $ = (selector) => document.querySelector(selector);
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* El modo privado no impide usar la guía. */
  }
}
let locale = read('forja.locale', 'es_AR');
if (!locales.includes(locale)) locale = 'es_AR';
const filters = read('forja.filters', {}) || {};
let t = dictionary(locale),
  payload,
  items = [],
  query = typeof filters.query === 'string' ? filters.query : '',
  category = Object.hasOwn(categories, filters.category) ? filters.category : 'all',
  sort = ['name', 'price', 'priceDesc'].includes(filters.sort) ? filters.sort : 'name',
  tier = ['basic', 'component', 'finished'].includes(filters.tier) ? filters.tier : '',
  game = null;
const saveFilters = () => write('forja.filters', { query, category, sort, tier });
const gameMode = () => /^#games\/(icon|recipe|word)$/.exec(location.hash)?.[1];
const savedIds = read('forja.favorites', []);
const favorites = new Set(Array.isArray(savedIds) ? savedIds : []);
let progress = read('forja.progress', { played: 0, correct: 0 });
if (!Number.isFinite(progress.played) || !Number.isFinite(progress.correct))
  progress = { played: 0, correct: 0 };
const workspace = $('#workspace');
const dialog = $('#detail');
const page = () =>
  gameMode()
    ? 'games'
    : ['games', 'favorites'].includes(location.hash.slice(1))
      ? location.hash.slice(1)
      : 'guide';
const img = (id, alt = '', className = '') =>
  `<img class="${className}" src="${iconUrl(payload.version, id)}" alt="${escape(alt)}" width="64" height="64" loading="lazy">`;
const itemName = (id) => payload.data[locale].data[id]?.name || id;
const itemTier = (item) =>
  item.from?.length
    ? item.into?.some((id) => items.some((other) => other.id === id))
      ? 'component'
      : 'finished'
    : 'basic';
const heroImg = (id) =>
  `<img src="/images/items/${id}.png" alt="" width="512" height="512" fetchpriority="high">`;
function shell() {
  document.documentElement.lang = locale.replace('_', '-');
  $('#locale').value = locale;
  $('#nav').innerHTML = ['guide', 'games', 'favorites']
    .map(
      (key) =>
        `<a href="#${key}" ${page() === key ? 'aria-current="page"' : ''}>${t[key]}${key === 'favorites' ? ` <small>${favorites.size}</small>` : ''}</a>`,
    )
    .join('');
  $('#hero').hidden = page() !== 'guide';
  $('#hero').innerHTML =
    `<div class="hero-copy"><p class="eyebrow"><span class="line"></span>${t.eyebrow}</p><h1>${t.title}<br><em>${t.accent}</em></h1><p class="intro">${t.intro}</p><div class="hero-actions"><a class="button primary" href="#games">${t.practice} <span>↗</span></a><a class="text-link" href="#library">${t.explore} ↓</a></div><div class="hero-meta"><span class="live-dot"></span>${t.official}<span>◇</span>${t.regions}</div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="art-center">${payload ? heroImg('3031') : ''}</div><div class="art-item art-a">${payload ? heroImg('3089') : ''}</div><div class="art-item art-b">${payload ? heroImg('3083') : ''}</div><div class="art-item art-c">${payload ? heroImg('3157') : ''}</div><div class="art-item art-d">${payload ? heroImg('3078') : ''}</div><span class="art-label">ARSENAL / ${payload?.version || 'LOL'}</span><span class="spark s1">✧</span><span class="spark s2">✧</span></div>`;
  $('#footer').innerHTML =
    `<div class="footer-top"><a class="footer-brand" href="#guide">◇ FORJA DEL INVOCADOR</a><span>${t.footer}</span><a href="https://developer.riotgames.com/docs/lol#data-dragon" target="_blank" rel="noreferrer">${t.source} ↗</a></div><p>${t.disclaimer}</p><p>${t.local}</p><a class="portfolio-link" href="https://germanbartoli.pages.dev/" target="_blank" rel="noreferrer"><img src="/images/german-bartoli.webp" alt="Germán Bartoli — Portfolio" width="100" height="100" loading="lazy"><span>Portfolio ↗</span></a>`;
  if (payload)
    $('#status').innerHTML =
      `<span class="${payload.backup ? 'warning' : 'live-dot'}">${payload.backup ? '!' : ''}</span><strong>${t.patch} ${payload.version}</strong><span>${payload.backup ? t.backup : t.live}</span>`;
}
function render() {
  shell();
  if (!payload) return;
  if (page() === 'games') {
    renderGames();
    return;
  }
  const isFavorites = page() === 'favorites';
  workspace.innerHTML = `<section class="library" id="library"><div class="section-heading"><div><p class="eyebrow">${t.collection}</p><h2>${isFavorites ? t.favoriteTitle : t.arsenal}</h2><p>${isFavorites ? t.favoriteSub : t.sub}</p></div><span class="section-index">01 / ${t.guide.toUpperCase()}</span></div><div class="library-layout"><aside class="filters"><h3>${t.categories}</h3><div class="category-list">${Object.keys(
    categories,
  )
    .map(
      (key, i) =>
        `<button data-category="${key}" class="category ${key === category ? 'active' : ''}" aria-pressed="${key === category}"><span class="category-symbol">${['◇', '⚔', '✦', '⬡', '↗', '✧', '▣', '◈', '♡', '◉', '◷', '↟', '✚', '⚑', '◒', '⌁'][i]}</span>${t[key]}<span class="category-count">${items.filter((item) => matches(item, '', payload.data, key)).length}</span></button>`,
    )
    .join(
      '',
    )}</div><p class="filter-note">${t.categoryNote}</p></aside><div class="catalog"><div class="toolbar"><label class="search"><span>⌕</span><input id="search" type="search" value="${escape(query)}" placeholder="${t.search}" aria-label="${t.searchLabel}" autocomplete="off"><kbd>/</kbd></label><select id="sort" aria-label="${t.sort}">${['name', 'price', 'priceDesc'].map((key) => `<option value="${key}" ${sort === key ? 'selected' : ''}>${t[key]}</option>`).join('')}</select></div><div class="catalog-meta"><div class="tier-tabs">${['', 'basic', 'component', 'finished'].map((key) => `<button data-tier="${key}" class="${tier === key ? 'active' : ''}" aria-pressed="${tier === key}">${t[key || 'any']}</button>`).join('')}</div><span id="count" aria-live="polite"></span></div><div id="grid" class="item-grid"></div><p class="catalog-note">${t.caveat}</p></div></div></section>`;
  $('#search').addEventListener('input', (event) => {
    query = event.target.value;
    saveFilters();
    renderGrid();
  });
  $('#sort').addEventListener('change', (event) => {
    sort = event.target.value;
    saveFilters();
    renderGrid();
  });
  renderGrid();
}
function renderGrid() {
  let filtered = items.filter(
    (item) =>
      matches(item, query, payload.data, category) &&
      (!tier || itemTier(item) === tier) &&
      (page() !== 'favorites' || favorites.has(item.id)),
  );
  filtered.sort((a, b) =>
    sort === 'name'
      ? a.name.localeCompare(b.name, locale.replace('_', '-'))
      : sort === 'price'
        ? a.gold.total - b.gold.total
        : b.gold.total - a.gold.total,
  );
  $('#count').textContent = `${filtered.length} ${t.count}`;
  $('#grid').innerHTML = filtered.length
    ? filtered
        .map(
          (item) =>
            `<article class="item-card"><button class="favorite ${favorites.has(item.id) ? 'selected' : ''}" data-favorite="${item.id}" aria-label="${favorites.has(item.id) ? t.remove : t.save}: ${escape(item.name)}" aria-pressed="${favorites.has(item.id)}">${favorites.has(item.id) ? '★' : '☆'}</button><button class="item-open" data-item="${item.id}">${img(item.id)}<span class="item-stage">${t[itemTier(item)]}</span><h3>${escape(item.name)}</h3><span class="alternate">${escape(payload.data[locale === 'en_US' ? 'es_AR' : 'en_US'].data[item.id]?.name || '')}</span><span class="item-bottom"><span class="gold">◈ ${item.gold.total.toLocaleString(locale.replace('_', '-'))}</span><span class="open-arrow">↗</span></span></button></article>`,
        )
        .join('')
    : `<div class="empty"><span>◇</span><h3>${t.empty}</h3><p>${t.emptySub}</p><button class="button" data-reset>${t.reset}</button></div>`;
}
function descriptionHtml(raw) {
  // Los datos remotos se convierten en texto; solo se conservan saltos de línea conocidos.
  return escape(
    String(raw)
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/mainText>/gi, '\n')
      .replace(/<[^>]*>/g, ''),
  ).replace(/\n/g, '<br>');
}
function detail(id) {
  const item = payload.data[locale].data[id];
  if (!item) return;
  dialog.dataset.item = id;
  const related = (ids) =>
    ids
      .filter((key) => payload.data[locale].data[key])
      .map(
        (key) =>
          `<button class="recipe-item" data-item="${key}">${img(key)}<span>${escape(itemName(key))}<small class="gold">◈ ${payload.data[locale].data[key].gold.total}</small></span><span>↗</span></button>`,
      )
      .join('');
  dialog.innerHTML = `<div class="detail-top"><span class="eyebrow">${t.guide} / #${id}</span><button class="icon-button" data-close aria-label="${t.close}">×</button></div><div class="detail-heading">${img(id)}<div><h2 id="detail-title">${escape(item.name)}</h2><p class="gold">◈ ${item.gold.total} ${t.gold} <span class="muted">· ${t.sell}: ${item.gold.sell}</span></p></div></div><button class="button save-button" data-favorite="${id}" aria-pressed="${favorites.has(id)}">${favorites.has(id) ? '★ ' + t.saved : '☆ ' + t.save}</button><h3>${t.effect}</h3><div class="description">${descriptionHtml(item.description)}</div><h3 class="eyebrow names-title">${t.names}</h3><div class="name-list">${locales.map((key) => `<div><span>${regionNames[key]}</span><strong lang="${key.replace('_', '-')}">${escape(payload.data[key].data[id]?.name || '—')}</strong></div>`).join('')}</div><h3>${t.recipe}</h3><div class="recipe-list">${item.from?.length ? related(item.from) : `<p class="muted">${t.base}</p>`}</div>${item.from?.length ? `<p class="combine">+ ${item.gold.base} ${t.gold} · ${t.combine}</p>` : ''}<h3>${t.into}</h3><div class="recipe-list">${related((item.into || []).filter((key) => items.some((other) => other.id === key))) || `<p class="muted">${t.noInto}</p>`}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}
function renderGames() {
  if (gameMode() && (!game || game.mode !== gameMode())) {
    game = { mode: gameMode(), index: 1, score: 0, used: [] };
    nextRound();
    return;
  }
  if (game?.finished) {
    results();
    return;
  }
  if (game) {
    renderRound();
    return;
  }
  workspace.innerHTML = `<section class="training"><p class="eyebrow">${t.training}</p><h1>${t.trainTitle}</h1><p class="intro">${t.trainSub}</p><div class="game-grid">${[
    ['icon', '◈'],
    ['recipe', '⚒'],
    ['word', 'Aa'],
  ]
    .map(
      ([mode, symbol], i) =>
        `<article class="game-card"><span class="game-number">0${i + 1}</span><div class="game-symbol">${symbol}</div><h2>${t[mode + 'Game']}</h2><p>${t[mode + 'Desc']}</p><button class="button ${i === 0 ? 'primary' : ''}" data-start="${mode}">${t.start} ↗</button></article>`,
    )
    .join(
      '',
    )}</div><div class="progress-panel"><div><p class="eyebrow">${t.progress}</p><p>${t.local}</p></div><div><strong>${progress.played}</strong><span>${t.practiced}</span></div><div><strong>${progress.played ? Math.round((progress.correct / progress.played) * 100) : 0}%</strong><span>${t.accuracy}</span></div></div></section>`;
}
function nextRound() {
  game.round = makeRound(items, game.mode, game.used);
  if (!game.round) {
    workspace.textContent = t.noPool;
    return;
  }
  game.used.push(game.round.target.id);
  renderRound();
}
function renderRound() {
  const r = game.round;
  if (!r) return;
  // Una ronda mantiene su identidad al cambiar de idioma.
  const target = payload.data[locale].data[r.target.id];
  const image =
    game.mode === 'recipe'
      ? `<div class="recipe-challenge">${r.target.from.map((id) => `<div>${img(id, itemName(id))}<span>${escape(itemName(id))}</span></div>`).join('<span class="plus">+</span>')}<span class="plus">→</span>${r.answered ? `<div class="revealed-item">${img(r.target.id, target.name)}<span>${escape(target.name)}</span></div>` : '<div class="mystery">?</div>'}</div>`
      : img(r.target.id, '', 'quiz-image');
  workspace.innerHTML = `<section class="quiz"><button class="text-link" data-back>← ${t.back}</button><div class="quiz-meta"><span>${t[game.mode + 'Game']}</span><span>${t.round} ${game.index} / 10</span><span>${t.score}: ${game.score}</span></div><progress value="${game.index - 1}" max="10" aria-label="${t.progress}"></progress><div class="quiz-center"><p class="eyebrow">${t[game.mode === 'recipe' ? 'recipeGame' : 'iconGame']}</p><h1>${game.mode === 'recipe' ? t.buildWhat : t.what}</h1>${image}${game.mode === 'word' ? `<form id="answer-form"><input id="answer" aria-label="${t.answer}" placeholder="${t.answer}" autocomplete="off" ${r.answered ? 'disabled' : ''}><button class="button primary" ${r.answered ? 'disabled' : ''}>${t.check}</button></form><p class="muted">${t.validNames}</p>` : `<div class="answer-options">${r.options.map((option, index) => `<button class="answer-option ${r.answered && option.id === r.target.id ? 'correct' : ''} ${r.answered && r.selected === option.id && option.id !== r.target.id ? 'incorrect' : ''}" data-answer="${option.id}" ${r.answered ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span>${escape(itemName(option.id))}</button>`).join('')}</div>`}<div id="feedback" aria-live="polite">${r.answered ? `<div class="feedback ${r.correct ? 'success' : 'failure'}"><strong>${r.correct ? t.correct : t.wrong + ': ' + escape(target.name)}</strong><button class="text-link" data-item="${r.target.id}">${t.learn} ↗</button></div>` : ''}</div><div class="quiz-actions">${r.answered ? `<button class="button primary" data-next>${game.index === 10 ? t.finish : t.next} →</button>` : `<button class="text-link" data-skip>${t.skip} →</button>`}</div></div></section>`;
  $('#answer-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const answer = $('#answer').value;
    if (answer.trim()) submitAnswer(accepts(answer, r.target.id, payload.data));
  });
}
function submitAnswer(correct, selected = null) {
  if (!game || game.round.answered) return;
  Object.assign(game.round, { answered: true, correct, selected });
  game.score += correct ? 1 : 0;
  progress.played++;
  progress.correct += correct ? 1 : 0;
  write('forja.progress', progress);
  renderRound();
  $('[data-next]')?.focus();
}
function results() {
  workspace.innerHTML = `<section class="results"><p class="eyebrow">${t.results}</p><div class="result-score">${game.score}<span>/ 10</span></div><h1>${t.total}</h1><p>${t.resultsSub}</p><div class="hero-actions"><button class="button primary" data-start="${game.mode}">${t.again} ↗</button><button class="button" data-back>${t.back}</button></div></section>`;
}
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.hasAttribute('data-close')) dialog.close();
  if (button.dataset.item) detail(button.dataset.item);
  if (button.dataset.favorite) {
    const id = button.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    write('forja.favorites', [...favorites]);
    shell();
    if ($('#grid')) renderGrid();
    if (dialog.open) detail(dialog.dataset.item);
  }
  if (button.dataset.category) {
    category = button.dataset.category;
    saveFilters();
    render();
  }
  if (button.hasAttribute('data-tier')) {
    tier = button.dataset.tier;
    saveFilters();
    render();
  }
  if (button.hasAttribute('data-reset')) {
    query = '';
    category = 'all';
    tier = '';
    sort = 'name';
    saveFilters();
    render();
  }
  if (button.dataset.start) {
    const mode = button.dataset.start;
    game = null;
    if (gameMode() === mode) renderGames();
    else location.hash = `games/${mode}`;
  }
  if (button.dataset.answer)
    submitAnswer(button.dataset.answer === game.round.target.id, button.dataset.answer);
  if (button.hasAttribute('data-skip')) submitAnswer(false);
  if (button.hasAttribute('data-next')) {
    if (game.index === 10) {
      game.finished = true;
      results();
    } else {
      game.index++;
      nextRound();
    }
  }
  if (button.hasAttribute('data-back')) {
    game = null;
    location.hash = 'games';
  }
  if (button.hasAttribute('data-retry')) init();
});
$('#locale').addEventListener('change', (event) => {
  locale = event.target.value;
  write('forja.locale', locale);
  t = dictionary(locale);
  if (payload) items = catalog(payload.data, locale);
  render();
  if (game?.finished) results();
  if (dialog.open) detail(dialog.dataset.item);
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#library') {
    game = null;
    render();
    document.getElementById('library')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  game = null;
  render();
  window.scrollTo(0, 0);
});
document.addEventListener('keydown', (event) => {
  if (
    event.key === '/' &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) &&
    !dialog.open &&
    $('#search')
  ) {
    event.preventDefault();
    $('#search').focus();
  }
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  }
});
// El gesto inicial lleva al arsenal; el resto de la página conserva su desplazamiento normal.
let heroScrollUntil = 0;
window.addEventListener(
  'wheel',
  (event) => {
    if (page() !== 'guide' || dialog.open || event.ctrlKey || event.deltaY <= 0) return;
    if (Date.now() < heroScrollUntil) {
      event.preventDefault();
      return;
    }
    const hero = $('#hero');
    if (
      !hero.hidden &&
      hero.getBoundingClientRect().bottom > window.innerHeight / 2 &&
      $('#library')
    ) {
      event.preventDefault();
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = 800;
      heroScrollUntil = Date.now() + (reducedMotion ? 0 : duration + 100);
      const start = window.scrollY;
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      const destination = Math.min(
        start + $('#library').getBoundingClientRect().top - padding,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      if (reducedMotion) {
        window.scrollTo({ top: destination, behavior: 'instant' });
        return;
      }
      const startedAt = performance.now();
      const animate = (now) => {
        if (page() !== 'guide' || dialog.open) return;
        const progress = Math.min((now - startedAt) / duration, 1);
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        window.scrollTo({ top: start + (destination - start) * eased, behavior: 'instant' });
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  },
  { passive: false },
);
const headerObserver = new ResizeObserver(([entry]) => {
  document.documentElement.style.setProperty('--header-height', entry.target.offsetHeight + 'px');
});
headerObserver.observe($('.header'));
async function init() {
  shell();
  $('#status').textContent = t.loading;
  try {
    payload = await loadCatalog();
    items = catalog(payload.data, locale);
    render();
  } catch {
    $('#status').innerHTML = `${t.error} <button class="button" data-retry>${t.retry}</button>`;
  }
}
init();

const list = document.querySelector('#works-list');
const dialog = document.querySelector('#gallery');
let works = [];
let loadFailed = false;
const labels = {glazba: 'Glazba', fotografija: 'Fotografija', razvoj: 'Inženjerstvo i razvoj'};
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
};
function safeUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value, document.baseURI);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}
let galleryWork = null;
let galleryIndex = 0;
function showGallery(work, index = 0) {
  galleryWork = work;
  galleryIndex = index;
  const photo = work.photos[index];
  const container = document.querySelector('#gallery-content');
  const heading = el('h2', work.title);
  heading.id = 'gallery-title';
  const figure = el('figure');
  const image = el('img');
  image.alt = photo.alt || work.title;
  image.decoding = 'async';
  const status = el('p', 'Učitavanje fotografije…', 'gallery-status');
  status.setAttribute('role', 'status');
  image.onload = () => { status.hidden = true; };
  image.onerror = () => { status.textContent = 'Fotografiju nije moguće učitati. Pokušaj ponovno.'; };
  // Assign only the selected image: other large files are never prefetched.
  image.src = safeUrl(photo.largeSrc) || safeUrl(photo.src);
  figure.append(image);
  if (photo.caption) figure.append(el('figcaption', photo.caption));
  const controls = el('div', '', 'gallery-controls');
  const previous = el('button', '← Prethodna');
  previous.type = 'button';
  previous.disabled = index === 0;
  previous.addEventListener('click', () => showGallery(work, index - 1));
  const count = el('span', `${index + 1} / ${work.photos.length}`);
  const next = el('button', 'Sljedeća →');
  next.type = 'button';
  next.disabled = index === work.photos.length - 1;
  next.addEventListener('click', () => showGallery(work, index + 1));
  controls.append(previous, count, next);
  container.replaceChildren(heading, status, figure, controls);
  if (!dialog.open) dialog.showModal();
  else dialog.querySelector('.close').focus({preventScroll: true});
  dialog.scrollTop = 0;
}
dialog.addEventListener('keydown', event => {
  if (!galleryWork) return;
  if (event.key === 'ArrowLeft' && galleryIndex > 0) {
    event.preventDefault(); showGallery(galleryWork, galleryIndex - 1);
  } else if (event.key === 'ArrowRight' && galleryIndex < galleryWork.photos.length - 1) {
    event.preventDefault(); showGallery(galleryWork, galleryIndex + 1);
  }
});
dialog.addEventListener('close', () => {
  galleryWork = null;
  document.querySelector('#gallery-content').replaceChildren();
});
function render(category = 'sve') {
  document.querySelectorAll('[data-filter]').forEach(button => {
    const active = button.dataset.filter === category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const selected = works.filter(work => category === 'sve' || work.category === category);
  list.replaceChildren();
  if (!selected.length) {
    const empty = el('div', '', 'empty');
    empty.append(el('span', '↗', 'empty-mark'));
    const copy = el('div');
    copy.append(el('h3', loadFailed ? 'Radove trenutačno nije moguće učitati.' : 'Prvi radovi stižu uskoro.'));
    copy.append(el('p', loadFailed ? 'Pokušaj ponovno kasnije. Za suradnju mi se možeš javiti e-mailom.' : 'Portfolio je u pripremi. U međuvremenu, slobodno se javi za suradnju.'));
    empty.append(copy);
    list.append(empty);
  }
  selected.forEach(work => {
    const card = el('article', '', 'work');
    if (work.thumbnailOnly) card.classList.add('thumbnail-collection');
    const cover = safeUrl(work.cover);
    if (cover) {
      const image = el('img', '', 'work-cover');
      image.src = cover; image.alt = work.coverAlt || work.title; image.loading = 'lazy';
      card.append(image);
    } else if (!work.thumbnailOnly) card.append(el('div', work.category === 'glazba' ? '♫' : '↗', 'work-placeholder'));
    card.append(el('div', [labels[work.category], work.year, work.role].filter(Boolean).join(' / '), 'work-meta'));
    card.append(el('h3', work.title));
    if (work.description) card.append(el('p', work.description));
    if (work.selectionNote) card.append(el('p', work.selectionNote, 'selection-note'));
    if (Array.isArray(work.photos) && work.photos.length) {
      if (work.thumbnailOnly) {
        const grid = el('div', '', 'photo-thumbnails');
        work.photos.forEach((photo, index) => {
          const src = safeUrl(photo.src);
          if (!src) return;
          const image = el('img');
          image.src = src;
          image.alt = photo.alt || work.title;
          image.loading = 'lazy';
          image.decoding = 'async';
          if (photo.width) image.width = photo.width;
          if (photo.height) image.height = photo.height;
          const button = el('button', '', 'photo-open');
          button.type = 'button';
          button.setAttribute('aria-label', `Povećaj: ${image.alt}`);
          button.setAttribute('aria-haspopup', 'dialog');
          button.addEventListener('click', () => showGallery(work, index));
          button.append(image);
          grid.append(button);
        });
        card.append(grid);
      } else {
      const button = el('button', 'Otvori galeriju ↗', 'gallery-open');
      button.type = 'button'; button.addEventListener('click', () => showGallery(work)); card.append(button);
      }
    }
    const audioUrl = safeUrl(work.audio);
    if (audioUrl) {
      const audio = el('audio'); audio.controls = true; audio.preload = 'none'; audio.src = audioUrl;
      audio.setAttribute('aria-label', work.title); card.append(audio);
    }
    const link = safeUrl(work.url);
    if (link) {
      const anchor = el('a', work.linkLabel || (work.category === 'glazba' ? 'Poslušaj ↗' : 'Pogledaj projekt ↗'));
      anchor.href = link; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; card.append(anchor);
    }
    list.append(card);
  });
}
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => render(button.dataset.filter)));
document.querySelectorAll('[data-category]').forEach(anchor => anchor.addEventListener('click', () => render(anchor.dataset.category)));
document.querySelector('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
document.addEventListener('play', event => { if (event.target.tagName === 'AUDIO') document.querySelectorAll('audio').forEach(audio => { if (audio !== event.target) audio.pause(); }); }, true);
document.querySelector('#year').textContent = new Date().getFullYear();
fetch('content/works.json', {cache: 'no-cache'}).then(response => { if (!response.ok) throw new Error('Loading failed'); return response.json(); }).then(data => {
  if (!Array.isArray(data.works)) throw new Error('Invalid works');
  works = data.works.filter(work => work.published !== false && labels[work.category] && typeof work.title === 'string');
  const active = document.querySelector('[data-filter].active');
  render(active ? active.dataset.filter : 'sve');
}).catch(() => { loadFailed = true; render(); });

// Public GitHub contributor totals count commits; GitHub may cache them for hours.
const contributionCacheKey = 'anyps5-ivica00-v1';
const contributionTTL = 15 * 60 * 1000;
let contributionRequest = false;
function displayContributions(data, stale = false) {
  document.querySelector('#anyps5-count').textContent = new Intl.NumberFormat('hr-HR').format(data.count);
  const checked = new Date(data.checkedAt).toLocaleString('hr-HR', {dateStyle: 'short', timeStyle: 'short'});
  document.querySelector('#anyps5-status').textContent = `${stale ? 'Zadnji spremljeni podatak' : 'Provjereno na GitHubu'}: ${checked}. GitHub može kasniti nekoliko sati.`;
}
function readContributions() {
  try {
    const data = JSON.parse(localStorage.getItem(contributionCacheKey));
    return data && Number.isSafeInteger(data.count) && data.count >= 0 && Number.isFinite(data.checkedAt) ? data : null;
  } catch { return null; }
}
async function updateContributions() {
  if (contributionRequest) return;
  const cached = readContributions();
  if (cached) displayContributions(cached);
  if (cached && Date.now() - cached.checkedAt < contributionTTL) return;
  contributionRequest = true;
  try {
    let url = 'https://api.github.com/repos/boykopovar/AnyPS5/contributors?per_page=100';
    let count = null;
    // Follow pagination even if the account moves outside the first 100 contributors.
    while (url) {
      const response = await fetch(url, {headers: {Accept: 'application/vnd.github+json'}, signal: AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error('GitHub unavailable');
      const contributors = response.status === 204 ? [] : await response.json();
      if (!Array.isArray(contributors)) throw new Error('Invalid contributors');
      const user = contributors.find(item => typeof item.login === 'string' && item.login.toLowerCase() === 'ivica00');
      if (user) { count = user.contributions; break; }
      const next = (response.headers.get('Link') || '').match(/<([^>]+)>; rel="next"/);
      url = next ? next[1] : null;
      if (url && (new URL(url).origin !== 'https://api.github.com' || !new URL(url).pathname.startsWith('/repos/boykopovar/AnyPS5/contributors'))) throw new Error('Invalid pagination');
    }
    if (count === null) count = 0;
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid count');
    const data = {count, checkedAt: Date.now()};
    displayContributions(data);
    try { localStorage.setItem(contributionCacheKey, JSON.stringify(data)); } catch { /* Storage is optional. */ }
  } catch {
    if (cached) displayContributions(cached, true);
    else document.querySelector('#anyps5-status').textContent = 'Broj trenutačno nije dostupan. Pogledaj doprinose na GitHubu.';
  } finally { contributionRequest = false; }
}
updateContributions();
setInterval(() => { if (!document.hidden) updateContributions(); }, contributionTTL);

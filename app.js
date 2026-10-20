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
function showGallery(work) {
  const container = document.querySelector('#gallery-content');
  container.replaceChildren(el('h2', work.title));
  work.photos.forEach(photo => {
    const src = safeUrl(photo.src);
    if (!src) return;
    const figure = el('figure');
    const image = el('img');
    image.src = src;
    image.alt = photo.alt || work.title;
    image.loading = 'lazy';
    figure.append(image);
    if (photo.caption) figure.append(el('figcaption', photo.caption));
    container.append(figure);
  });
  dialog.showModal();
  dialog.scrollTop = 0;
}
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
    const cover = safeUrl(work.cover);
    if (cover) {
      const image = el('img', '', 'work-cover');
      image.src = cover; image.alt = work.coverAlt || work.title; image.loading = 'lazy';
      card.append(image);
    } else card.append(el('div', work.category === 'glazba' ? '♫' : '↗', 'work-placeholder'));
    card.append(el('div', [labels[work.category], work.year, work.role].filter(Boolean).join(' / '), 'work-meta'));
    card.append(el('h3', work.title));
    if (work.description) card.append(el('p', work.description));
    if (Array.isArray(work.photos) && work.photos.length) {
      const button = el('button', 'Otvori galeriju ↗', 'gallery-open');
      button.type = 'button'; button.addEventListener('click', () => showGallery(work)); card.append(button);
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
fetch('content/works.json').then(response => { if (!response.ok) throw new Error('Loading failed'); return response.json(); }).then(data => {
  if (!Array.isArray(data.works)) throw new Error('Invalid works');
  works = data.works.filter(work => work.published !== false && labels[work.category] && typeof work.title === 'string');
  const active = document.querySelector('[data-filter].active');
  render(active ? active.dataset.filter : 'sve');
}).catch(() => { loadFailed = true; render(); });

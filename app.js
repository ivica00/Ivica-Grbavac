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
let musicPlayer = null;
const formatTime = value => Number.isFinite(value) ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '0:00';
function createMusicPlayer(tracks) {
  const panel = el('section', '', 'music-player');
  panel.setAttribute('aria-label', 'Glazbeni radovi');
  const audio = el('audio');
  audio.preload = 'none';
  const header = el('div', '', 'music-heading');
  header.append(el('span', 'MOJI ZVUKOVI', 'eyebrow'), el('span', `${tracks.length} snimki / ${formatTime(tracks.reduce((sum, track) => sum + track.duration, 0))}`, 'music-total'));
  const deck = el('div', '', 'music-deck');
  const visual = el('div', '', 'music-visual');
  visual.setAttribute('aria-hidden', 'true');
  visual.title = 'Frekvencijski spektar · bas → visoki tonovi';
  const bars = [];
  for (let i = 0; i < 17; i++) {
    const bar = el('i');
    bar.style.height = '3px';
    bars.push(bar);
    visual.append(bar);
  }
  let context = null;
  let source = null;
  let analyser = null;
  let spectrum = null;
  let frame = null;
  let disposed = false;
  let lastDraw = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function stopSpectrum() {
    cancelAnimationFrame(frame);
    frame = null;
    bars.forEach(bar => { bar.style.height = '3px'; });
  }
  function drawSpectrum(now) {
    if (disposed || audio.paused || audio.ended || document.hidden) { stopSpectrum(); return; }
    if (now - lastDraw >= (reducedMotion.matches ? 250 : 33)) {
      lastDraw = now;
      analyser.getByteFrequencyData(spectrum);
      const binHz = context.sampleRate / analyser.fftSize;
      const maxHz = Math.min(16000, context.sampleRate / 2);
      bars.forEach((bar, index) => {
        // Logarithmic frequency bands: bass on the left, treble on the right.
        const low = Math.max(1, Math.floor(45 * (maxHz / 45) ** (index / bars.length) / binHz));
        const high = Math.min(spectrum.length, Math.max(low + 1, Math.ceil(45 * (maxHz / 45) ** ((index + 1) / bars.length) / binHz)));
        let energy = 0;
        for (let bin = low; bin < high; bin++) energy += spectrum[bin] ** 2;
        const level = Math.sqrt(energy / (high - low)) / 255;
        bar.style.height = `${Math.max(4, level * 100)}%`;
      });
    }
    frame = requestAnimationFrame(drawSpectrum);
  }
  function startSpectrum() {
    if (analyser && frame === null && !document.hidden && !disposed) frame = requestAnimationFrame(drawSpectrum);
  }
  function visibilityChanged() { if (document.hidden) stopSpectrum(); else if (!audio.paused) startSpectrum(); }
  document.addEventListener('visibilitychange', visibilityChanged);
  function prepareSpectrum() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || disposed) return;
    try {
      if (!context) context = new AudioContextClass();
      if (!source) {
        source = context.createMediaElementSource(audio);
        // Keep audible playback connected even if analysis is unavailable.
        source.connect(context.destination);
      }
      if (!analyser) {
        analyser = context.createAnalyser();
        analyser.fftSize = 4096;
        analyser.smoothingTimeConstant = .75;
        analyser.minDecibels = -85;
        analyser.maxDecibels = -15;
        spectrum = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { /* Playback remains available without a spectrum. */ }
  }
  const info = el('div', '', 'music-info');
  const title = el('h3');
  const status = el('p', 'Odaberi snimku i poslušaj.');
  status.setAttribute('role', 'status');
  info.append(title, status);
  const controls = el('div', '', 'music-controls');
  function button(text, label, className) {
    const node = el('button', text, className);
    node.type = 'button'; node.setAttribute('aria-label', label);
    return node;
  }
  const previous = button('↤', 'Prethodna snimka');
  const play = button('▶', 'Reproduciraj', 'music-play');
  const next = button('↦', 'Sljedeća snimka');
  controls.append(previous, play, next);
  deck.append(visual, info, controls);
  const timeline = el('div', '', 'music-timeline');
  const elapsed = el('span', '0:00');
  const seek = el('input');
  seek.type = 'range'; seek.min = 0; seek.max = 1000; seek.value = 0;
  seek.setAttribute('aria-label', 'Položaj reprodukcije');
  const duration = el('span');
  timeline.append(elapsed, seek, duration);
  const playlist = el('div', '', 'music-tracks');
  let current = 0;
  let request = 0;
  const rows = tracks.map((track, index) => {
    const row = button('', `Poslušaj: ${track.title}`, 'music-track');
    row.append(el('span', String(index + 1).padStart(2, '0'), 'track-number'), el('span', track.title, 'track-title'), el('span', track.mastered ? 'MASTER' : 'SNIMKA', 'track-tag'), el('span', formatTime(track.duration), 'track-duration'));
    row.addEventListener('click', () => { if (index === current) toggle(); else select(index, true); });
    playlist.append(row); return row;
  });
  function update() {
    const playing = !audio.paused;
    panel.classList.toggle('is-playing', playing);
    play.textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', playing ? 'Pauziraj' : 'Reproduciraj');
    rows.forEach((row, index) => {
      row.classList.toggle('is-current', index === current);
      row.setAttribute('aria-pressed', String(index === current && playing));
    });
  }
  async function start() {
    prepareSpectrum();
    const attempt = ++request;
    status.textContent = 'Učitavanje…';
    try { await audio.play(); }
    catch { if (attempt === request) { status.textContent = 'Reprodukcija nije uspjela. Pokušaj ponovno.'; update(); } }
  }
  function select(index, autoplay = false) {
    request++;
    audio.pause(); current = (index + tracks.length) % tracks.length;
    audio.src = safeUrl(tracks[current].audio);
    title.textContent = tracks[current].title;
    duration.textContent = formatTime(tracks[current].duration);
    elapsed.textContent = '0:00'; seek.value = 0;
    status.textContent = 'Spremno za slušanje'; update();
    if (autoplay) start();
  }
  function toggle() { if (audio.paused) start(); else { request++; audio.pause(); } }
  play.addEventListener('click', toggle);
  previous.addEventListener('click', () => select(current - 1, true));
  next.addEventListener('click', () => select(current + 1, true));
  audio.addEventListener('playing', () => { status.textContent = 'Sada svira'; update(); startSpectrum(); });
  audio.addEventListener('pause', () => { status.textContent = 'Pauzirano'; update(); stopSpectrum(); });
  audio.addEventListener('waiting', () => { status.textContent = 'Učitavanje…'; stopSpectrum(); });
  audio.addEventListener('error', () => { status.textContent = 'Snimku nije moguće učitati. Pokušaj drugu.'; update(); stopSpectrum(); });
  audio.addEventListener('ended', () => { if (current < tracks.length - 1) select(current + 1, true); else { status.textContent = 'Sve snimke su odslušane'; update(); } });
  audio.addEventListener('timeupdate', () => {
    elapsed.textContent = formatTime(audio.currentTime);
    seek.value = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 1000 : 0;
    seek.setAttribute('aria-valuetext', `${formatTime(audio.currentTime)} od ${formatTime(audio.duration || tracks[current].duration)}`);
  });
  seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 1000 * audio.duration; });
  panel.append(header, deck, timeline, playlist, audio);
  select(0);
  return {panel, audio, dispose() {
    disposed = true; request++;
    audio.pause(); stopSpectrum();
    document.removeEventListener('visibilitychange', visibilityChanged);
    source?.disconnect(); analyser?.disconnect();
    if (context) context.close().catch(() => {});
  }};
}
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
  if (musicPlayer) { musicPlayer.dispose(); musicPlayer = null; }
  list.replaceChildren();
  const tracks = selected.filter(work => work.category === 'glazba' && safeUrl(work.audio));
  if (tracks.length) { musicPlayer = createMusicPlayer(tracks); list.append(musicPlayer.panel); }
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
    if (tracks.includes(work)) return;
    const card = el('article', '', 'work');
    if (work.thumbnailOnly) card.classList.add('thumbnail-collection');
    const cover = safeUrl(work.cover);
    if (cover) {
      const image = el('img', '', 'work-cover');
      image.src = cover; image.alt = work.coverAlt || work.title; image.loading = 'lazy';
      card.append(image);
    } else if (!work.thumbnailOnly && work.contributionCounter !== 'anyps5') card.append(el('div', work.category === 'glazba' ? '♫' : '↗', 'work-placeholder'));
    card.append(el('div', [labels[work.category], work.year, work.role].filter(Boolean).join(' / '), 'work-meta'));
    card.append(el('h3', work.title));
    if (work.description) card.append(el('p', work.description));
    if (work.selectionNote) card.append(el('p', work.selectionNote, 'selection-note'));
    if (work.contributionCounter === 'anyps5') {
      const stats = el('div', '', 'contributor-card');
      stats.append(el('span', 'MOJI DOPRINOSI / GITHUB', 'contributor-label'));
      const link = el('a', '', 'contributor-stat');
      link.href = 'https://github.com/boykopovar/AnyPS5/commits?author=ivica00';
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', 'Moji commitovi na projektu AnyPS5');
      const count = el('strong', '—'); count.id = 'anyps5-count';
      const label = el('span', 'doprinosa'); label.append(el('small', '(commitovi)'));
      link.append(count, label);
      const status = el('span', 'Dohvaćanje s GitHuba…', 'contributor-status');
      status.id = 'anyps5-status'; status.setAttribute('role', 'status');
      stats.append(link, status); card.append(stats);
    }
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
  if (document.querySelector('#anyps5-count')) updateContributions();
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
let contributionData = null;
function displayContributions(data, stale = false) {
  if (!document.querySelector('#anyps5-count')) return;
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
  const cached = contributionData || readContributions();
  if (cached) displayContributions(cached);
  if (contributionRequest) return;
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
    contributionData = data;
    displayContributions(data);
    try { localStorage.setItem(contributionCacheKey, JSON.stringify(data)); } catch { /* Storage is optional. */ }
  } catch {
    if (cached) displayContributions(cached, true);
    else if (document.querySelector('#anyps5-status')) document.querySelector('#anyps5-status').textContent = 'Broj trenutačno nije dostupan. Pogledaj doprinose na GitHubu.';
  } finally { contributionRequest = false; }
}
setInterval(() => { if (!document.hidden && document.querySelector('#anyps5-count')) updateContributions(); }, contributionTTL);

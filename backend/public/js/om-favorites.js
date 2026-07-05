(function () {
  const STORAGE_KEY = 'om:favorites:v1';
  const API =
    document.getElementById('om-global')?.getAttribute('api-base') || '/api/v1';

  function getFavoriteSlugs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s) : [];
    } catch {
      return [];
    }
  }

  function saveFavoriteSlugs(slugs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    window.dispatchEvent(new CustomEvent('om:favorites-changed'));
  }

  function formatDuration(ms) {
    if (!ms || ms < 1000) return '';
    const total = Math.floor(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function fetchTrack(slug) {
    const res = await fetch(`${API}/tracks/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return res.json();
  }

  function renderEmpty(root) {
    root.innerHTML = `
      <div class="empty-state favorites-empty">
        <div class="favorites-empty__icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <p class="empty-state__title">Пока пусто</p>
        <p>Отметьте трек сердечком в плеере — он появится здесь.</p>
        <a class="btn btn--primary" href="/music">Слушать альбомы</a>
      </div>`;
    document.getElementById('favorites-actions')?.setAttribute('hidden', '');
  }

  function renderTracks(root, tracks) {
    const jsonNode = document.getElementById('favorites-tracks-json');
    const summaries = tracks.map((t) => ({
      slug: t.slug,
      title: t.title,
      artistName: t.artistName,
      albumSlug: t.albumSlug,
      albumTitle: t.albumTitle,
      durationMs: t.durationMs,
      coverUrl: t.coverUrl,
      coverThumbUrl: t.coverThumbUrl,
      trackNumber: t.trackNumber,
      type: t.type,
      stream: t.stream,
    }));
    if (jsonNode) jsonNode.textContent = JSON.stringify(summaries);

    const actions = document.getElementById('favorites-actions');
    if (actions) actions.removeAttribute('hidden');

    root.innerHTML = `
      <ol class="favorites-list" role="list">
        ${tracks
          .map(
            (t, i) => `
          <li class="favorites-item" role="listitem" data-om-track="${escapeHtml(t.slug)}">
            <span class="favorites-item__index">${i + 1}</span>
            <button type="button" class="favorites-item__play" data-om-play-track="${escapeHtml(t.slug)}" aria-label="Слушать ${escapeHtml(t.title)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72L19 12 8 5.14z"/></svg>
            </button>
            <div class="favorites-item__cover">
              ${
                t.coverThumbUrl || t.coverUrl
                  ? `<img src="${escapeHtml(t.coverThumbUrl || t.coverUrl)}" alt="" loading="lazy">`
                  : '<div class="album-card__placeholder"></div>'
              }
            </div>
            <div class="favorites-item__meta">
              <button type="button" class="favorites-item__title" data-om-play-track="${escapeHtml(t.slug)}">${escapeHtml(t.title)}</button>
              <p class="favorites-item__artist">${escapeHtml(t.artistName || t.albumTitle || '')}</p>
            </div>
            <span class="favorites-item__duration">${formatDuration(t.durationMs)}</span>
            <button type="button" class="favorites-item__remove" data-fav-remove="${escapeHtml(t.slug)}" aria-label="Убрать из любимого">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </button>
          </li>`,
          )
          .join('')}
      </ol>`;

    root.querySelectorAll('[data-fav-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-fav-remove');
        if (!slug) return;
        const next = getFavoriteSlugs().filter((s) => s !== slug);
        saveFavoriteSlugs(next);
        void render();
      });
    });
  }

  async function render() {
    const root = document.getElementById('favorites-root');
    if (!root) return;

    const slugs = getFavoriteSlugs();
    if (slugs.length === 0) {
      const jsonNode = document.getElementById('favorites-tracks-json');
      if (jsonNode) jsonNode.textContent = '[]';
      renderEmpty(root);
      document.dispatchEvent(new CustomEvent('om:dynamic-content'));
      return;
    }

    root.innerHTML = '<p class="favorites-root__loading">Загрузка…</p>';

    const results = await Promise.all(slugs.map((slug) => fetchTrack(slug)));
    const bySlug = new Map(results.filter(Boolean).map((t) => [t.slug, t]));
    const tracks = slugs.map((slug) => bySlug.get(slug)).filter(Boolean);

    if (!document.getElementById('favorites-root')) return;

    if (tracks.length === 0) {
      renderEmpty(root);
      document.dispatchEvent(new CustomEvent('om:dynamic-content'));
      return;
    }

    renderTracks(root, tracks);
    document.dispatchEvent(new CustomEvent('om:dynamic-content'));
  }

  function initFavoritesPage() {
    if (!document.getElementById('favorites-root')) return;
    void render();
  }

  if (!window.__omFavoritesBound) {
    window.__omFavoritesBound = true;
    document.addEventListener('turbo:load', initFavoritesPage);
    document.addEventListener('turbo:render', initFavoritesPage);
    window.addEventListener('pageshow', initFavoritesPage);
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY) initFavoritesPage();
    });
    window.addEventListener('om:favorites-changed', initFavoritesPage);
  }

  initFavoritesPage();
})();

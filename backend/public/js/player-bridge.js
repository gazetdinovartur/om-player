(function () {
  const API = document.getElementById('om-global')?.getAttribute('api-base') || '/api/v1';
  let analyticsQueue = [];
  let analyticsTimer = null;
  let bridgeReady = false;
  let restorePromise = null;

  function getGlobalPlayer() {
    return document.getElementById('om-global');
  }

  function getSessionId() {
    let id = localStorage.getItem('om:session-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('om:session-id', id);
    }
    return id;
  }

  function pushAnalytics(type, trackSlug, positionMs) {
    if (!trackSlug) return;
    analyticsQueue.push({ type, trackSlug, positionMs, timestamp: new Date().toISOString() });
    if (!analyticsTimer) {
      analyticsTimer = setTimeout(flushAnalytics, 30000);
    }
  }

  function flushAnalytics() {
    analyticsTimer = null;
    if (!analyticsQueue.length) return;
    const events = analyticsQueue.splice(0, analyticsQueue.length);
    const body = JSON.stringify({ sessionId: getSessionId(), events });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(API + '/analytics/playback', new Blob([body], { type: 'application/json' }));
    } else {
      fetch(API + '/analytics/playback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true });
    }
  }

  function bindAnalytics() {
    if (bridgeReady) return;
    bridgeReady = true;
    ['om:play', 'om:pause', 'om:track-change', 'om:seek', 'om:skip'].forEach((ev) => {
      window.addEventListener(ev, (e) => {
        const detail = e.detail || {};
        const track = detail.track;
        const type = ev.replace('om:', '');
        const store = detail.store;
        pushAnalytics(type === 'track-change' ? 'skip' : type, track?.slug, store?.getPositionMs?.() ?? 0);
      });
    });
    window.addEventListener('beforeunload', flushAnalytics);
    document.addEventListener('turbo:before-visit', flushAnalytics);
  }

  function bindPlayButtons() {
    document.querySelectorAll('[data-om-play]').forEach((btn) => {
      if (btn.dataset.omBound) return;
      btn.dataset.omBound = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('[data-om-album]');
        const slug = card?.getAttribute('data-om-album') || btn.getAttribute('data-om-play-album');
        if (slug) getGlobalPlayer()?.playAlbumPublic?.(slug);
      });
    });

    document.querySelectorAll('[data-om-play-album]').forEach((btn) => {
      if (btn.dataset.omBound) return;
      btn.dataset.omBound = '1';
      btn.addEventListener('click', () => {
        const slug = btn.getAttribute('data-om-play-album');
        if (slug) getGlobalPlayer()?.playAlbumPublic?.(slug);
      });
    });
  }

  let mediaKeysBound = false;

  async function restoreMiniPlayerSession() {
    if (restorePromise) return restorePromise;

    const gp = getGlobalPlayer();
    if (!gp?.restoreSessionPublic) return null;

    await customElements.whenDefined('om-player');
    const audio = document.getElementById('om-audio-engine');
    if (audio?.src && !audio.ended && (!audio.paused || audio.currentTime > 0.25)) {
      return null;
    }

    restorePromise = gp.restoreSessionPublic().finally(() => {
      restorePromise = null;
    });
    return restorePromise;
  }

  async function ensurePlayerReady() {
    const gp = getGlobalPlayer();
    if (!gp) return null;
    await customElements.whenDefined('om-player');
    await restoreMiniPlayerSession();
    return gp;
  }

  function handleMediaPlayPauseKey(e) {
    e.preventDefault();
    void ensurePlayerReady().then((p) => p?.mediaPlayPausePublic?.());
  }

  function bindMediaKeys() {
    if (mediaKeysBound) return;
    mediaKeysBound = true;

    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleMediaPlayPauseKey(e);
        return;
      }
      if (e.code === 'ArrowRight') {
        void ensurePlayerReady().then((p) => p?.dispatchEvent(new CustomEvent('om:cmd-next', { bubbles: true })));
        return;
      }
      if (e.code === 'ArrowLeft') {
        void ensurePlayerReady().then((p) => p?.dispatchEvent(new CustomEvent('om:cmd-prev', { bubbles: true })));
        return;
      }

      if (e.code === 'MediaPlayPause') {
        handleMediaPlayPauseKey(e);
        return;
      }
      if (e.code === 'MediaStop') {
        e.preventDefault();
        void ensurePlayerReady().then((p) => p?.mediaStopPublic?.());
        return;
      }
      if (e.code === 'MediaTrackNext') {
        e.preventDefault();
        void ensurePlayerReady().then((p) => p?.dispatchEvent(new CustomEvent('om:cmd-next', { bubbles: true })));
        return;
      }
      if (e.code === 'MediaTrackPrevious') {
        e.preventDefault();
        void ensurePlayerReady().then((p) => p?.dispatchEvent(new CustomEvent('om:cmd-prev', { bubbles: true })));
      }
    });
  }

  function initBridge(isFullLoad) {
    bindAnalytics();
    bindPlayButtons();
    bindMediaKeys();

    if (isFullLoad) {
      const defer = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 80));
      defer(() => void restoreMiniPlayerSession());
    }
  }

  document.addEventListener('DOMContentLoaded', () => initBridge(true));
  document.addEventListener('turbo:load', () => bindPlayButtons());

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();

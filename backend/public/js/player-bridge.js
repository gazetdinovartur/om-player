(function () {
  const API = document.getElementById('om-global')?.getAttribute('api-base') || '/api/v1';
  const PLAYER_SRC = document.querySelector('script[src*="om-player"]')?.getAttribute('src')
    || '/build/player/om-player.iife.js';
  const PLAYER_MODULE = PLAYER_SRC.replace(/\.iife\.js$/, '.es.js');
  let analyticsQueue = [];
  let analyticsTimer = null;
  let bridgeReady = false;
  let restorePromise = null;
  let playerScriptPromise = null;

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

  function unlockAudioGesture() {
    window.omUnlockAudioGesture?.();
    getGlobalPlayer()?.unlockPlaybackPublic?.();
    getAlbumPagePlayer()?.unlockPlaybackPublic?.();
  }

  function getAlbumPagePlayer() {
    return document.querySelector('om-player.album-page__player')
      || document.querySelector('.player-shell om-player[mode="full"]');
  }

  function waitForAudioUnlock(timeoutMs = 200) {
    const engineUnlocked = () => {
      const audio = document.getElementById('om-audio-engine');
      return audio?.dataset.omPlaybackUnlocked === '1';
    };
    if (engineUnlocked()) return Promise.resolve();

    return new Promise((resolve) => {
      const started = performance.now();
      const tick = () => {
        if (engineUnlocked() || performance.now() - started >= timeoutMs) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  async function startAlbumPlayback(slug, tracks) {
    unlockAudioGesture();
    await ensurePlayerScript();
    await waitForAudioUnlock(400);
    const gp = getGlobalPlayer();
    if (!gp?.playAlbumPublic) return false;
    gp.playAlbumPublic(slug, tracks?.length ? tracks : undefined);
    getAlbumPagePlayer()?.requestUpdate?.();
    return true;
  }

  function playAlbum(slug) {
    if (!slug) return;
    unlockAudioGesture();
    const tracks = readTracksJson('album-tracks-json');

    void startAlbumPlayback(slug, tracks).then((ok) => {
      if (ok) return;
      void ensurePlayerReady({ skipRestore: true }).then(async (p) => {
        unlockAudioGesture();
        await waitForAudioUnlock(400);
        p?.playAlbumPublic?.(slug, tracks?.length ? tracks : undefined);
      });
    });
  }

  function bindPlayGestureUnlock(btn) {
    if (btn.dataset.omGestureBound) return;
    btn.dataset.omGestureBound = '1';
    btn.addEventListener(
      'pointerdown',
      () => {
        unlockAudioGesture();
      },
      { passive: true },
    );
  }

  function readTracksJson(sourceId) {
    const node = document.getElementById(sourceId);
    if (!node?.textContent) return null;
    try {
      const tracks = JSON.parse(node.textContent);
      return Array.isArray(tracks) && tracks.length ? tracks : null;
    } catch {
      return null;
    }
  }

  function playTracksFromJson(sourceId) {
    const tracks = readTracksJson(sourceId);
    if (!tracks) return;
    unlockAudioGesture();
    void waitForAudioUnlock(400).then(() =>
      ensurePlayerReady({ skipRestore: true }).then((p) => p?.playAlbumPublic?.('', tracks)),
    );
  }

  function playTrack(slug) {
    if (!slug) return;
    unlockAudioGesture();
    void waitForAudioUnlock(400).then(() =>
      ensurePlayerReady({ skipRestore: true }).then((p) => p?.loadTrackPublic?.(slug, 0, true)),
    );
  }

  function bindPlayButtons() {
    document.querySelectorAll('[data-om-play]').forEach((btn) => {
      if (btn.dataset.omBound) return;
      btn.dataset.omBound = '1';
      bindPlayGestureUnlock(btn);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const card = btn.closest('[data-om-album]');
        const slug = card?.getAttribute('data-om-album') || btn.getAttribute('data-om-play-album');
        playAlbum(slug);
      });
    });

    document.querySelectorAll('[data-om-play-album]').forEach((btn) => {
      if (btn.dataset.omBound) return;
      btn.dataset.omBound = '1';
      bindPlayGestureUnlock(btn);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const slug = btn.getAttribute('data-om-play-album');
        playAlbum(slug);
      });
    });

    document.querySelectorAll('[data-om-play-playlist]').forEach((btn) => {
      if (btn.dataset.omBoundPlaylist) return;
      btn.dataset.omBoundPlaylist = '1';
      bindPlayGestureUnlock(btn);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const slug = btn.getAttribute('data-om-play-playlist')
          || btn.closest('[data-om-playlist]')?.getAttribute('data-om-playlist');
        if (slug) {
          unlockAudioGesture();
          void ensurePlayerReady({ skipRestore: true }).then((p) => p?.playPlaylistPublic?.(slug));
        }
      });
    });

    document.querySelectorAll('[data-om-play-tracks]').forEach((btn) => {
      if (btn.dataset.omBoundPlayTracks) return;
      btn.dataset.omBoundPlayTracks = '1';
      bindPlayGestureUnlock(btn);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sourceId = btn.getAttribute('data-om-play-tracks');
        if (sourceId) playTracksFromJson(sourceId);
      });
    });

    document.querySelectorAll('[data-om-play-track]').forEach((btn) => {
      if (btn.dataset.omBoundPlayTrack) return;
      btn.dataset.omBoundPlayTrack = '1';
      bindPlayGestureUnlock(btn);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const slug = btn.getAttribute('data-om-play-track')
          || btn.closest('[data-om-track]')?.getAttribute('data-om-track');
        playTrack(slug);
      });
    });

    document.querySelectorAll('[data-om-queue]').forEach((btn) => {
      if (btn.dataset.omBoundQueue) return;
      btn.dataset.omBoundQueue = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const slug = btn.getAttribute('data-om-queue')
          || btn.closest('[data-om-track]')?.getAttribute('data-om-track');
        if (slug) {
          void ensurePlayerReady().then((p) => p?.addToQueuePublic?.(slug));
        }
      });
    });

    document.querySelectorAll('[data-om-queue-next]').forEach((btn) => {
      if (btn.dataset.omBoundQueueNext) return;
      btn.dataset.omBoundQueueNext = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const slug = btn.getAttribute('data-om-queue-next')
          || btn.closest('[data-om-track]')?.getAttribute('data-om-track');
        if (slug) {
          void ensurePlayerReady().then((p) => p?.addToQueueNextPublic?.(slug));
        }
      });
    });
  }

  let mediaKeysBound = false;

  function ensurePlayerScript() {
    if (customElements.get('om-player')) {
      return Promise.resolve();
    }
    if (playerScriptPromise) return playerScriptPromise;

    playerScriptPromise = import(PLAYER_MODULE)
      .then(() => customElements.whenDefined('om-player'))
      .catch(() => {
        playerScriptPromise = null;
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.type = 'module';
          script.src = PLAYER_SRC;
          script.dataset.omPlayerBootstrap = '1';
          script.onload = () => {
            customElements.whenDefined('om-player').then(resolve).catch(reject);
          };
          script.onerror = () => reject(new Error('om-player script failed'));
          document.head.appendChild(script);
        });
      });

    return playerScriptPromise;
  }

  function refreshGlobalPlayer() {
    const gp = getGlobalPlayer();
    gp?.requestUpdate?.();
    gp?.showPublic?.();
  }

  function hasHealthyAudio(audio) {
    return !!(
      audio?.src &&
      !audio.ended &&
      !audio.error &&
      audio.readyState >= HTMLMediaElement.HAVE_METADATA
    );
  }

  async function restoreMiniPlayerSession() {
    if (restorePromise) return restorePromise;

    await ensurePlayerScript();
    const gp = getGlobalPlayer();
    if (!gp?.restoreSessionPublic) return null;

    if (gp.hasLiveSessionPublic?.()) {
      refreshGlobalPlayer();
      return null;
    }

    const audio = document.getElementById('om-audio-engine');
    if (hasHealthyAudio(audio)) {
      refreshGlobalPlayer();
      return null;
    }

    restorePromise = gp.restoreSessionPublic().finally(() => {
      restorePromise = null;
    });
    return restorePromise;
  }

  async function ensurePlayerReady(options = {}) {
    await ensurePlayerScript();
    const gp = getGlobalPlayer();
    if (!gp) return null;
    if (!options.skipRestore) {
      await restoreMiniPlayerSession();
    }
    refreshGlobalPlayer();
    return gp;
  }

  function handleMediaPlayPauseKey(e) {
    e.preventDefault();
    unlockAudioGesture();
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

  function onTurboPage() {
    void ensurePlayerScript()
      .then(() => {
        bindPlayButtons();
        const gp = getGlobalPlayer();
        if (gp?.hasLiveSessionPublic?.()) {
          refreshGlobalPlayer();
          return;
        }
        const audio = document.getElementById('om-audio-engine');
        if (audio?.src && !audio.ended && !audio.error) {
          refreshGlobalPlayer();
          return;
        }
        void restoreMiniPlayerSession();
      })
      .catch(() => {});
  }

  function initBridge() {
    bindAnalytics();
    bindPlayButtons();
    bindMediaKeys();
    void ensurePlayerScript().catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', initBridge);
  document.addEventListener('turbo:load', onTurboPage);
  document.addEventListener('om:dynamic-content', onTurboPage);
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    const audio = document.getElementById('om-audio-engine');
    if (hasHealthyAudio(audio)) {
      refreshGlobalPlayer();
      return;
    }
    void restoreMiniPlayerSession();
  });
  document.addEventListener('turbo:before-cache', () => {
    getGlobalPlayer()?.closeQueueExpandedPublic?.();
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
})();

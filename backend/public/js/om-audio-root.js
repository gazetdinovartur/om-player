/**
 * Hoist #om-audio-engine onto <html>, outside Turbo's <body> snapshot.
 * The element is never morphed or moved — continuous playback across page visits.
 */
(function () {
  const ROOT_ID = 'om-persistent-root';
  const AUDIO_ID = 'om-audio-engine';
  const SILENT_WAV =
    'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

  if (!document.getElementById(AUDIO_ID)) {
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');

    const audio = document.createElement('audio');
    audio.id = AUDIO_ID;
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.setAttribute('x-webkit-airplay', 'allow');
    audio.hidden = true;

    root.appendChild(audio);
    document.documentElement.appendChild(root);
  }

  /** Unlock autoplay synchronously inside a user gesture — before om-player module loads. */
  function unlockAudioGestureSync() {
    const audio = document.getElementById(AUDIO_ID);
    if (!audio || audio.dataset.omPlaybackUnlocked === '1') return;

    if (!audio.paused && !audio.ended) {
      audio.dataset.omPlaybackUnlocked = '1';
      return;
    }

    const savedSrc = audio.currentSrc || audio.src;
    if (savedSrc && savedSrc !== SILENT_WAV) {
      audio.dataset.omPlaybackUnlocked = '1';
      return;
    }

    const wasMuted = audio.muted;
    audio.muted = true;
    audio.src = SILENT_WAV;

    const playAttempt = audio.play();
    if (playAttempt !== undefined) {
      audio.dataset.omPlaybackUnlocked = '1';
    }

    void playAttempt
      .then(() => {
        if (!audio.paused) audio.pause();
        if (audio.currentSrc === SILENT_WAV) {
          audio.removeAttribute('src');
          audio.load();
        }
        audio.dataset.omPlaybackUnlocked = '1';
      })
      .catch(() => {
        delete audio.dataset.omPlaybackUnlocked;
      })
      .finally(() => {
        audio.muted = wasMuted;
      });
  }

  window.omUnlockAudioGesture = unlockAudioGestureSync;

  document.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (
      target.closest(
        '[data-om-play], [data-om-play-album], [data-om-play-track], [data-om-play-playlist], [data-om-play-tracks], om-player',
      )
    ) {
      unlockAudioGestureSync();
    }
  }, { capture: true, passive: true });
})();

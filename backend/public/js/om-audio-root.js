/**
 * Hoist #om-audio-engine onto <html>, outside Turbo's <body> snapshot.
 * The element is never morphed or moved — continuous playback across page visits.
 */
(function () {
  const ROOT_ID = 'om-persistent-root';
  const AUDIO_ID = 'om-audio-engine';

  if (document.getElementById(AUDIO_ID)) return;

  const root = document.createElement('div');
  root.id = ROOT_ID;
  root.hidden = true;
  root.setAttribute('aria-hidden', 'true');

  const audio = document.createElement('audio');
  audio.id = AUDIO_ID;
  audio.preload = 'auto';
  audio.setAttribute('playsinline', '');
  audio.hidden = true;

  root.appendChild(audio);
  document.documentElement.appendChild(root);
})();

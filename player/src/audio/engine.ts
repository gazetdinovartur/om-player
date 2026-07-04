import type { TrackSummary } from '../api/types';

interface MediaHandlers {
  onNext: () => void;
  onPrev: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

const AUDIO_ID = 'om-audio-engine';

export class AudioEngine {
  private audio: HTMLAudioElement | null = null;
  private track: TrackSummary | null = null;
  private onTick: ((positionMs: number) => void) | null = null;
  private onEnd: (() => void) | null = null;
  private tickTimer: number | null = null;
  private mediaHandlers: MediaHandlers | null = null;
  private pendingSeekMs: number | null = null;
  private volume = 0.85;
  private onLoadComplete: (() => void) | null = null;
  private lastPositionStateAt = 0;
  private mediaHandlersBound = false;
  private loadAbort: AbortController | null = null;
  private loadReady: Promise<void> = Promise.resolve();
  private loadReadyResolve: (() => void) | null = null;
  private wiredAudio: HTMLAudioElement | null = null;
  private suppressSpuriousPause = false;
  private onSpuriousPauseFn: (() => void) | null = null;
  private onPlaybackStartedFn: (() => void) | null = null;
  private onLoadErrorFn: ((message: string) => void) | null = null;

  private safePlay(audio: HTMLAudioElement): Promise<void> {
    return audio.play().catch((err: unknown) => {
      console.error('OmPlayer: play failed', err);
      throw err;
    });
  }

  private runIntentionalPause(action: () => void): void {
    this.suppressSpuriousPause = true;
    try {
      action();
    } finally {
      queueMicrotask(() => {
        this.suppressSpuriousPause = false;
      });
    }
  }

  private beginLoadReady(): void {
    this.finishLoadReady();
    this.loadReady = new Promise((resolve) => {
      this.loadReadyResolve = resolve;
    });
  }

  private finishLoadReady(): void {
    this.loadReadyResolve?.();
    this.loadReadyResolve = null;
  }

  waitUntilReady(timeoutMs = 15000): Promise<void> {
    return Promise.race([
      this.loadReady,
      new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
    ]);
  }

  play(track: TrackSummary, startMs = 0): void {
    this.load(track, startMs, true);
  }

  /** Restart the current stream from the beginning without reloading src. */
  replayFromStart(): boolean {
    const audio = this.getActiveAudioElement();
    if (!audio?.src) return false;

    this.stopTimer();
    try {
      audio.currentTime = 0;
    } catch {
      return false;
    }

    void this.safePlay(audio)
      .then(() => {
        this.ensurePlaybackRunning();
      })
      .catch(() => {});

    this.onTick?.(0);
    this.syncMediaSessionState();
    return true;
  }

  load(track: TrackSummary, startMs = 0, autoplay = true, force = false): void {
    const url = track.stream?.url;
    if (!url) {
      if (startMs === 0 && autoplay && this.track?.slug === track.slug && this.replayFromStart()) {
        this.finishLoadReady();
        return;
      }
      this.finishLoadReady();
      throw new Error('No stream URL');
    }

    const audio = this.acquireAudioElement();

    if (
      !force &&
      startMs === 0 &&
      autoplay &&
      audio.ended &&
      this.track?.slug === track.slug &&
      audio.src &&
      this.sameStreamUrl(audio.src, url)
    ) {
      this.track = track;
      this.replayFromStart();
      this.finishLoadReady();
      return;
    }

    if (!force && this.shouldSkipReload(track, url, audio, startMs)) {
      this.track = track;
      if (startMs > 0 && Math.abs(this.getPositionMs() - startMs) > 500) {
        this.applySeek(startMs);
        this.onTick?.(this.getPositionMs());
      }
      if (autoplay && audio.paused) {
        void this.safePlay(audio).catch(() => {});
      }
      this.finishLoadReady();
      return;
    }

    this.stopTimer();
    this.loadAbort?.abort();
    this.loadAbort = new AbortController();
    const signal = this.loadAbort.signal;
    this.beginLoadReady();

    this.track = track;
    this.pendingSeekMs = startMs > 0 ? startMs : null;

    this.runIntentionalPause(() => {
      audio.pause();
    });
    audio.volume = this.volume;
    audio.preload = autoplay ? 'auto' : 'metadata';
    audio.src = url;
    this.audio = audio;

    const onLoaded = (): void => {
      const seekTo = this.pendingSeekMs ?? 0;
      this.pendingSeekMs = null;

      let finished = false;
      const finishLoad = (): void => {
        if (finished) return;
        finished = true;
        if (autoplay) {
          void this.safePlay(audio).catch(() => {
            this.onLoadErrorFn?.('Не удалось воспроизвести файл');
          });
        } else {
          this.onTick?.(this.getPositionMs());
        }
        this.updateMediaSession(track);
        this.onLoadComplete?.();
        this.finishLoadReady();
      };

      if (seekTo > 0) {
        this.applySeek(seekTo);
        audio.addEventListener('seeked', () => finishLoad(), { once: true, signal });
        window.setTimeout(finishLoad, 400);
      } else {
        finishLoad();
      }
    };

    audio.addEventListener('loadedmetadata', onLoaded, { once: true, signal });
    audio.load();
  }

  /** Keep the same element + position when the same track is requested again. */
  private shouldSkipReload(
    track: TrackSummary,
    url: string,
    audio: HTMLAudioElement,
    startMs: number,
  ): boolean {
    if (!audio.src || audio.ended || audio.error) return false;
    if (this.track?.slug !== track.slug) return false;
    if (startMs > 0 && Math.abs(this.getPositionMs() - startMs) > 500) return false;
    if (this.sameStreamUrl(audio.src, url)) return true;
    return !audio.paused || audio.currentTime > 0.25;
  }

  private acquireAudioElement(): HTMLAudioElement {
    const shell = document.getElementById('om-persistent-player');
    const domEl = document.getElementById(AUDIO_ID) as HTMLAudioElement | null;

    if (this.audio?.isConnected) {
      return this.audio;
    }

    if (this.audio?.src && !this.audio.isConnected) {
      (shell ?? document.body).appendChild(this.audio);
      return this.audio;
    }

    if (domEl?.isConnected) {
      this.wireAudioElement(domEl);
      this.audio = domEl;
      return domEl;
    }

    if (domEl?.src && !domEl.isConnected) {
      (shell ?? document.body).appendChild(domEl);
      this.wireAudioElement(domEl);
      this.audio = domEl;
      return domEl;
    }

    let el = domEl;
    if (!el) {
      el = document.createElement('audio');
      el.id = AUDIO_ID;
      el.setAttribute('data-turbo-permanent', '');
      el.preload = 'auto';
      el.setAttribute('playsinline', '');
      el.hidden = true;
    }

    if (!el.isConnected) {
      (shell ?? document.body).appendChild(el);
    }

    this.wireAudioElement(el);
    this.audio = el;
    return el;
  }

  private wireAudioElement(el: HTMLAudioElement): void {
    if (this.wiredAudio === el) return;
    this.wiredAudio = el;

    el.addEventListener('ended', () => {
      this.stopTimer();
      this.onEnd?.();
    });
    el.addEventListener('play', () => {
      this.startTimer();
      this.syncMediaSessionState();
      this.onPlaybackStartedFn?.();
    });
    el.addEventListener('pause', () => {
      this.stopTimer();
      this.syncMediaSessionState();
      if (!this.suppressSpuriousPause && el.src && !el.ended) {
        this.onSpuriousPauseFn?.();
      }
    });
    el.addEventListener('error', () => {
      console.error('OmPlayer: audio error', el.src, el.error);
      this.onLoadErrorFn?.('Аудиофайл недоступен');
      this.finishLoadReady();
    });
  }

  prepareForNewPlayback(): void {
    this.stopTimer();
    this.loadAbort?.abort();
    const audio = this.acquireAudioElement();
    this.runIntentionalPause(() => {
      audio.pause();
    });
  }

  ensureAudioConnected(): void {
    const shell = document.getElementById('om-persistent-player');
    const domEl = document.getElementById(AUDIO_ID) as HTMLAudioElement | null;

    if (this.audio?.isConnected) return;

    if (this.audio?.src && !this.audio.isConnected) {
      (shell ?? document.body).appendChild(this.audio);
      return;
    }

    if (domEl?.src && !domEl.isConnected) {
      (shell ?? document.body).appendChild(domEl);
    }

    if (domEl?.isConnected) {
      if (this.audio !== domEl) {
        this.wireAudioElement(domEl);
        this.audio = domEl;
      }
      return;
    }

    this.acquireAudioElement();
  }

  /** Read the live audio element without moving it in the DOM. */
  peekAudioElement(): HTMLAudioElement | null {
    const domEl = document.getElementById(AUDIO_ID) as HTMLAudioElement | null;
    if (domEl?.isConnected) {
      if (this.audio !== domEl) {
        this.wireAudioElement(domEl);
        this.audio = domEl;
      }
      return domEl;
    }
    if (this.audio?.isConnected) return this.audio;
    return this.audio ?? domEl;
  }

  getActiveAudioElement(): HTMLAudioElement | null {
    this.ensureAudioConnected();
    return this.peekAudioElement();
  }

  /** Continue playback after Turbo briefly pauses the element during DOM updates. */
  resumeIfPaused(): boolean {
    const audio = this.peekAudioElement();
    if (!audio?.src || audio.ended) return false;
    if (!audio.paused) return true;

    void this.safePlay(audio)
      .then(() => {
        this.ensurePlaybackRunning();
      })
      .catch(() => {});

    return false;
  }

  ensurePlaybackRunning(): void {
    const audio = this.peekAudioElement();
    if (!audio?.src || audio.paused) return;
    this.startTimer();
    this.syncMediaSessionState();
  }

  onSpuriousPause(fn: () => void): void {
    this.onSpuriousPauseFn = fn;
  }

  onPlaybackStarted(fn: () => void): void {
    this.onPlaybackStartedFn = fn;
  }

  hasActivePlayback(): boolean {
    const audio = this.audio ?? (document.getElementById(AUDIO_ID) as HTMLAudioElement | null);
    if (!audio?.src) return false;
    return this.isPlaying() || audio.currentTime > 0.5;
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.getActiveAudioElement();
  }

  toggleFromUserGesture(): boolean | null {
    const audio = this.peekAudioElement();
    if (!audio?.src) return null;
    return this.toggle();
  }

  async playFromAction(): Promise<boolean> {
    const audio = this.peekAudioElement();
    if (!audio?.src) return false;
    if (!audio.paused) return true;
    try {
      await this.safePlay(audio);
      return true;
    } catch {
      return false;
    }
  }

  pauseFromAction(): void {
    const audio = this.peekAudioElement();
    if (!audio) return;
    this.runIntentionalPause(() => {
      audio.pause();
    });
  }

  toggle(): boolean {
    const audio = this.peekAudioElement();
    if (!audio) return false;
    if (!audio.paused) {
      this.runIntentionalPause(() => {
        audio.pause();
      });
      return false;
    }
    void this.safePlay(audio).catch(() => {});
    return true;
  }

  pause(): void {
    const audio = this.peekAudioElement();
    if (!audio) return;
    this.runIntentionalPause(() => {
      audio.pause();
    });
  }

  previewSeek(ms: number): void {
    if (!this.audio) return;
    this.applySeek(this.clampMs(ms));
    this.onTick?.(this.getPositionMs());
  }

  seek(ms: number): void {
    if (!this.audio) return;
    const clamped = this.clampMs(ms);
    const audio = this.audio;

    const commit = (): void => {
      this.applySeek(clamped);
      this.onTick?.(this.getPositionMs());
      this.syncMediaSessionState();
    };

    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      commit();
      return;
    }

    this.pendingSeekMs = clamped;
    audio.addEventListener('loadedmetadata', commit, { once: true });
  }

  private sameStreamUrl(currentSrc: string, nextUrl: string): boolean {
    if (currentSrc === nextUrl) return true;
    try {
      const current = new URL(currentSrc, window.location.href);
      const next = new URL(nextUrl, window.location.href);
      return current.pathname === next.pathname;
    } catch {
      return currentSrc.endsWith(nextUrl) || nextUrl.endsWith(currentSrc);
    }
  }

  private clampMs(ms: number): number {
    const duration = this.getDurationMs();
    const max = duration > 0 ? duration : ms;
    return Math.max(0, Math.min(ms, max));
  }

  private applySeek(ms: number): void {
    if (!this.audio) return;
    const sec = ms / 1000;
    if (!Number.isFinite(sec)) return;
    try {
      this.audio.currentTime = sec;
    } catch {
      /* ignore seek errors on unloaded ranges */
    }
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.volume = this.volume;
  }

  getPositionMs(): number {
    if (!this.audio || !Number.isFinite(this.audio.currentTime)) return 0;
    return Math.floor(this.audio.currentTime * 1000);
  }

  getDurationMs(): number {
    if (this.audio && Number.isFinite(this.audio.duration) && this.audio.duration > 0) {
      return Math.floor(this.audio.duration * 1000);
    }
    return this.track?.durationMs ?? 0;
  }

  isPlaying(): boolean {
    const audio = this.peekAudioElement();
    return !!audio && !audio.paused && !audio.ended;
  }

  getCurrentTrack(): TrackSummary | null {
    return this.track;
  }

  onPosition(fn: (positionMs: number) => void): void {
    this.onTick = fn;
  }

  onLoaded(fn: () => void): void {
    this.onLoadComplete = fn;
  }

  onFinished(fn: () => void): void {
    this.onEnd = fn;
  }

  onLoadError(fn: (message: string) => void): void {
    this.onLoadErrorFn = fn;
  }

  hasPlayableSource(): boolean {
    const audio = this.peekAudioElement();
    return !!(audio?.src && !audio.error && audio.readyState >= HTMLMediaElement.HAVE_METADATA);
  }

  setMediaHandlers(handlers: MediaHandlers): void {
    this.mediaHandlers = handlers;
  }

  primeMediaSession(title: string, artist: string, wasPlaying: boolean): void {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: 'OmPlayer' });
    navigator.mediaSession.playbackState = wasPlaying ? 'playing' : 'paused';
  }

  private startTimer(): void {
    this.stopTimer();
    this.tickTimer = window.setInterval(() => {
      this.onTick?.(this.getPositionMs());
      this.syncMediaSessionState(true);
    }, 250);
  }

  private stopTimer(): void {
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  private safeAction(action: string, handler: ((details: MediaSessionActionDetails) => void) | null): void {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {
      /* action not supported in this browser */
    }
  }

  private bindMediaSessionHandlers(): void {
    if (!('mediaSession' in navigator) || this.mediaHandlersBound) return;

    const h = () => this.mediaHandlers;

    this.safeAction('play', () => h()?.onPlay());
    this.safeAction('pause', () => h()?.onPause());
    this.safeAction('stop', () => h()?.onStop());
    this.safeAction('nexttrack', () => h()?.onNext());
    this.safeAction('previoustrack', () => h()?.onPrev());
    this.safeAction('seekto', (details) => {
      if (details?.seekTime != null) {
        this.seek(Math.floor(details.seekTime * 1000));
      }
    });
    this.safeAction('seekbackward', (details) => {
      const step = details?.seekOffset ?? 10;
      this.seek(Math.max(0, this.getPositionMs() - step * 1000));
    });
    this.safeAction('seekforward', (details) => {
      const step = details?.seekOffset ?? 10;
      this.seek(this.getPositionMs() + step * 1000);
    });

    this.mediaHandlersBound = true;
  }

  private syncMediaSessionState(throttlePosition = false): void {
    if (!('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;
    ms.playbackState = this.isPlaying() ? 'playing' : this.audio ? 'paused' : 'none';

    if (!this.audio || !('setPositionState' in ms)) return;

    const durationSec = this.getDurationMs() / 1000;
    const positionSec = this.getPositionMs() / 1000;
    if (durationSec <= 0 || !Number.isFinite(durationSec) || !Number.isFinite(positionSec)) return;

    const now = Date.now();
    if (throttlePosition && now - this.lastPositionStateAt < 900) return;
    this.lastPositionStateAt = now;

    try {
      ms.setPositionState({
        duration: durationSec,
        playbackRate: this.audio.playbackRate || 1,
        position: Math.min(Math.max(0, positionSec), durationSec),
      });
    } catch {
      /* position can briefly exceed buffered range */
    }
  }

  private updateMediaSession(track: TrackSummary): void {
    if (!('mediaSession' in navigator)) return;

    const artwork: MediaImage[] = [];
    if (track.coverUrl) artwork.push({ src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' });
    if (track.coverThumbUrl && track.coverThumbUrl !== track.coverUrl) {
      artwork.push({ src: track.coverThumbUrl, sizes: '128x128', type: 'image/jpeg' });
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artistName,
      album: track.albumTitle ?? '',
      artwork,
    });

    this.bindMediaSessionHandlers();
    this.syncMediaSessionState();
  }
}

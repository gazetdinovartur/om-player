import type { TrackSummary } from '../api/types';

interface MediaHandlers {
  onNext: () => void;
  onPrev: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

const AUDIO_ID = 'om-audio-engine';
const AUDIO_ROOT_ID = 'om-persistent-root';
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

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
  private playbackUnlocked = false;
  private playInFlight: Promise<void> | null = null;

  /** Call synchronously inside click/pointerdown — unlocks autoplay after async loads. */
  unlockUserGesture(): void {
    const audio = this.acquireAudioElement();
    if (!audio.paused && !audio.ended) {
      this.markPlaybackUnlocked(audio);
      return;
    }

    const savedSrc = audio.currentSrc || audio.src;
    if (savedSrc && savedSrc !== SILENT_WAV) {
      this.markPlaybackUnlocked(audio);
      return;
    }

    const wasMuted = audio.muted;
    audio.muted = true;

    const finish = (ok: boolean): void => {
      audio.muted = wasMuted;
      if (ok) {
        this.markPlaybackUnlocked(audio);
      } else {
        this.clearPlaybackUnlocked(audio);
      }
    };

    audio.src = SILENT_WAV;
    const playAttempt = audio.play();
    if (playAttempt !== undefined) {
      this.markPlaybackUnlocked(audio);
    }
    void playAttempt
      .then(() => {
        if (!audio.paused) {
          this.runIntentionalPause(() => {
            audio.pause();
          });
        }
        if (audio.currentSrc === SILENT_WAV) {
          audio.removeAttribute('src');
          audio.load();
        }
        finish(true);
      })
      .catch(() => finish(false));
  }

  isPlaybackUnlocked(): boolean {
    if (this.playbackUnlocked) return true;
    const audio = document.getElementById(AUDIO_ID) as HTMLAudioElement | null;
    return audio?.dataset.omPlaybackUnlocked === '1';
  }

  private markPlaybackUnlocked(audio: HTMLAudioElement): void {
    this.playbackUnlocked = true;
    audio.dataset.omPlaybackUnlocked = '1';
  }

  private clearPlaybackUnlocked(audio: HTMLAudioElement): void {
    this.playbackUnlocked = false;
    delete audio.dataset.omPlaybackUnlocked;
  }

  private isNotAllowedError(err: unknown): boolean {
    return err instanceof DOMException && err.name === 'NotAllowedError';
  }

  private safePlay(audio: HTMLAudioElement): Promise<void> {
    return audio.play().catch((err: unknown) => {
      if (this.isNotAllowedError(err)) {
        this.clearPlaybackUnlocked(audio);
        return;
      }
      console.error('OmPlayer: play failed', err);
      throw err;
    });
  }

  /** Deduped play — prevents double-start glitches during Turbo navigation. */
  private requestPlay(audio: HTMLAudioElement): Promise<void> {
    if (!audio.paused && !audio.ended) {
      return Promise.resolve();
    }
    if (this.playInFlight) {
      return this.playInFlight;
    }
    this.playInFlight = this.safePlay(audio)
      .then(() => {
        this.ensurePlaybackRunning();
      })
      .finally(() => {
        this.playInFlight = null;
      });
    return this.playInFlight;
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
          void this.safePlay(audio).then(() => {
            if (audio.paused) {
              this.onTick?.(this.getPositionMs());
            }
          }).catch(() => {
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

    const positionMs = this.getPositionMs();
    const hasProgress = positionMs > 250 || audio.currentTime > 0.25;

    if (hasProgress) {
      if (startMs > 0 && Math.abs(positionMs - startMs) > 2000) {
        return false;
      }
      return true;
    }

    if (this.sameStreamUrl(audio.src, url)) return true;
    return !audio.paused;
  }

  private resolveAudioElement(): HTMLAudioElement | null {
    return document.getElementById(AUDIO_ID) as HTMLAudioElement | null;
  }

  private bindAudioElement(el: HTMLAudioElement): HTMLAudioElement {
    if (this.audio !== el) {
      this.wireAudioElement(el);
      this.audio = el;
    }
    return el;
  }

  private acquireAudioElement(): HTMLAudioElement {
    const domEl = this.resolveAudioElement();
    if (domEl) {
      return this.bindAudioElement(domEl);
    }

    const root =
      document.getElementById(AUDIO_ROOT_ID) ??
      document.getElementById('om-persistent-player') ??
      document.documentElement;
    const el = document.createElement('audio');
    el.id = AUDIO_ID;
    el.preload = 'auto';
    el.setAttribute('playsinline', '');
    el.hidden = true;
    root.appendChild(el);
    return this.bindAudioElement(el);
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
      if (el.dataset.omNavigating === '1') {
        this.stopTimer();
        return;
      }
      this.stopTimer();
      if (!this.suppressSpuriousPause && el.src && !el.ended) {
        this.onSpuriousPauseFn?.();
      }
      this.syncMediaSessionState();
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
    const domEl = this.resolveAudioElement();
    if (domEl) {
      this.bindAudioElement(domEl);
    }
  }

  /** Read the live audio element — never moves it in the DOM. */
  peekAudioElement(): HTMLAudioElement | null {
    const domEl = this.resolveAudioElement();
    if (domEl) {
      return this.bindAudioElement(domEl);
    }
    if (this.audio) return this.audio;
    return null;
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
    void this.requestPlay(audio).catch(() => {});
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
      await this.requestPlay(audio);
      return !audio.paused;
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

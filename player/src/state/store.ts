import type { TrackSummary } from '../api/types';
import { AudioEngine } from '../audio/engine';
import { getTabCoordinator } from './tab-coordinator';

export type RepeatMode = 'off' | 'all' | 'one';

export interface SavedPlayback {
  trackSlug: string | null;
  albumSlug: string | null;
  queueSlugs: string[];
  queueIndex: number;
  positionMs: number;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
  wasPlaying: boolean;
  trackTitle?: string | null;
  artistName?: string | null;
  updatedAt: string;
}

const STORAGE_KEY = 'om:playback:v1';
const SESSION_KEY = 'om:session-id';

export class PlayerStore {
  readonly engine = new AudioEngine();
  queue: TrackSummary[] = [];
  queueIndex = 0;
  volume = 0.85;
  repeat: RepeatMode = 'off';
  shuffle = false;
  originalQueue: TrackSummary[] = [];
  sessionId: string;
  private tabs = getTabCoordinator();
  private listeners = new Set<() => void>();
  private restoringPositionMs: number | null = null;
  private restoreFn: (() => Promise<void>) | null = null;
  private persistTimer: number | null = null;
  private wasPlayingBeforeNav = false;
  private navResumeGen = 0;
  private navigationPlaybackLock = false;
  private intendedPlaying = false;

  private isNavigatingPlayback(): boolean {
    return this.wasPlayingBeforeNav || this.navigationPlaybackLock;
  }

  private markPlaybackIntent(): void {
    this.intendedPlaying = true;
  }

  private clearPlaybackIntent(): void {
    this.intendedPlaying = false;
    this.clearNavigationLock();
  }

  private clearNavigationLock(): void {
    this.wasPlayingBeforeNav = false;
    this.navigationPlaybackLock = false;
    this.navResumeGen += 1;
  }

  private captureNavigationIntent(): void {
    const audio = this.engine.peekAudioElement();
    if (!audio?.src || audio.ended) return;
    if (this.isPlaying() || (this.intendedPlaying && audio.currentTime > 0.25)) {
      this.wasPlayingBeforeNav = true;
      this.navigationPlaybackLock = true;
    }
  }

  private isLivePlayback(): boolean {
    const audio = this.engine.getAudioElement();
    if (!audio?.src || audio.ended) return false;
    return this.isPlaying() || audio.currentTime > 0.25;
  }

  setRestoreHandler(fn: () => Promise<void>): void {
    this.restoreFn = fn;
  }

  private async restoreViaGlobalPlayer(): Promise<void> {
    await customElements.whenDefined('om-player');
    const gp = document.getElementById('om-global') as (HTMLElement & { restoreSessionPublic?: () => Promise<void> }) | null;
    await gp?.restoreSessionPublic?.();
  }

  private async ensureRestored(): Promise<void> {
    if (this.isLivePlayback()) return;

    const audio = this.engine.getAudioElement();
    if (this.engine.getCurrentTrack() && audio?.src) {
      return;
    }
    if (this.restoreFn) {
      await this.restoreFn();
      return;
    }
    await this.restoreViaGlobalPlayer();
  }

  constructor() {
    this.sessionId = localStorage.getItem(SESSION_KEY) ?? crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, this.sessionId);

    const saved = this.loadSaved();
    if (saved?.volume) this.volume = saved.volume;
    if (saved?.repeat) this.repeat = saved.repeat;
    if (saved?.shuffle) this.shuffle = saved.shuffle;
    if (saved?.trackSlug) {
      this.engine.primeMediaSession(
        saved.trackTitle ?? saved.trackSlug,
        saved.artistName ?? 'OmPlayer',
        saved.wasPlaying === true,
      );
    }

    this.engine.setVolume(this.volume);
    this.engine.onSpuriousPause(() => {
      if (this.isNavigatingPlayback()) {
        this.guardContinuousPlayback();
      }
    });
    this.engine.onPlaybackStarted(() => {
      this.markPlaybackIntent();
      this.notify();
    });
    this.engine.onFinished(() => this.onTrackEnd());
    this.engine.onPosition(() => this.persist());
    this.engine.onLoaded(() => {
      this.restoringPositionMs = null;
      this.persist();
      this.notify();
    });
    this.engine.setMediaHandlers({
      onNext: () => this.next(),
      onPrev: () => this.prev(),
      onPlay: () => { void this.handleMediaPlay(); },
      onPause: () => { void this.handleMediaPause(); },
      onStop: () => { void this.handleMediaStop(); },
    });

    this.restoreFn = () => this.restoreViaGlobalPlayer();

    this.tabs.onRemotePause(() => {
      this.clearPlaybackIntent();
      this.engine.pause();
      this.notify();
    });

    this.wireAudioNavigationGuard();

    document.addEventListener('turbo:click', () => {
      this.captureNavigationIntent();
    }, true);

    window.addEventListener('pagehide', () => this.persist(true));
    window.addEventListener('beforeunload', () => this.persist(true));
    window.addEventListener('turbo:before-visit', () => {
      this.captureNavigationIntent();
      this.persist(true, true);
    });
    document.addEventListener('turbo:before-render', () => {
      if (this.isNavigatingPlayback()) this.guardContinuousPlayback();
    });
    document.addEventListener('turbo:render', () => {
      if (this.isNavigatingPlayback()) this.guardContinuousPlayback();
    });
    window.addEventListener('turbo:load', () => {
      this.wireAudioNavigationGuard();
      if (!this.isNavigatingPlayback()) return;
      this.guardContinuousPlayback();
      requestAnimationFrame(() => {
        if (this.isNavigatingPlayback()) this.guardContinuousPlayback();
      });
      window.setTimeout(() => {
        if (this.isNavigatingPlayback()) this.guardContinuousPlayback();
        this.finalizeNavigationPlayback();
      }, 320);
    });
  }

  private finalizeNavigationPlayback(): void {
    const audio = this.engine.peekAudioElement();
    if (audio?.src && !audio.paused && !audio.ended) {
      this.markPlaybackIntent();
    }
    this.clearNavigationLock();
    this.notify();
  }

  private wireAudioNavigationGuard(): void {
    const audio = document.getElementById('om-audio-engine') as HTMLAudioElement | null;
    if (!audio || audio.dataset.omNavGuard === '1') return;
    audio.dataset.omNavGuard = '1';
    audio.addEventListener('play', () => this.markPlaybackIntent());
  }

  /** Keep album playing through Turbo page swaps — only audio.play(), never reload. */
  private guardContinuousPlayback(): void {
    if (!this.isNavigatingPlayback()) return;

    let audio = this.engine.peekAudioElement();
    if (!audio?.src) return;

    if (!audio.isConnected) {
      this.engine.ensureAudioConnected();
      audio = this.engine.peekAudioElement();
      if (!audio?.src) return;
    }

    if (!audio.paused && !audio.ended) {
      this.markPlaybackIntent();
      return;
    }

    this.engine.resumeIfPaused();
    this.armNavigationResume();
  }

  private armNavigationResume(): void {
    const gen = ++this.navResumeGen;
    const delays = [0, 40, 120, 280];

    const tryResume = (): void => {
      if (gen !== this.navResumeGen || !this.isNavigatingPlayback()) return;

      let audio = this.engine.peekAudioElement();
      if (!audio?.src || audio.ended) return;

      if (!audio.isConnected) {
        this.engine.ensureAudioConnected();
        audio = this.engine.peekAudioElement();
        if (!audio?.src) return;
      }

      if (!audio.paused) {
        this.markPlaybackIntent();
        return;
      }

      void audio.play().then(() => {
        if (!audio.paused) {
          this.markPlaybackIntent();
          this.engine.ensurePlaybackRunning();
        }
      }).catch(() => {});
    };

    delays.forEach((ms) => {
      if (ms === 0) tryResume();
      else window.setTimeout(tryResume, ms);
    });
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  loadSaved(): SavedPlayback | null {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) raw = localStorage.getItem('jmo:playback:v1');
      if (!raw) return null;
      const data = JSON.parse(raw) as SavedPlayback;
      const age = Date.now() - new Date(data.updatedAt).getTime();
      if (age > 7 * 86400000) return null;
      return data;
    } catch {
      return null;
    }
  }

  shouldAutoplayRestore(wasPlaying: boolean): boolean {
    return wasPlaying && document.visibilityState === 'visible';
  }

  playTrack(track: TrackSummary, startMs = 0): void {
    this.loadTrack(track, startMs, true);
  }

  loadTrack(track: TrackSummary, startMs = 0, autoplay = true): void {
    if (autoplay) this.markPlaybackIntent();
    this.loadTrackInternal(track, startMs, autoplay, false);
  }

  private loadTrackInternal(track: TrackSummary, startMs: number, autoplay: boolean, force: boolean): void {
    if (autoplay) this.tabs.announcePlayback();
    this.queue = [track];
    this.originalQueue = [track];
    this.queueIndex = 0;
    this.restoringPositionMs = startMs > 0 ? startMs : null;
    this.engine.load(track, startMs, autoplay, force);
    this.emit(autoplay ? 'om:play' : 'om:session-restore', track);
    this.notify();
  }

  setQueue(tracks: TrackSummary[], startIndex = 0, startMs = 0, autoplay = true, force = false): void {
    const prevSlug = this.engine.getCurrentTrack()?.slug;

    if (force) {
      this.engine.prepareForNewPlayback();
    }

    this.originalQueue = [...tracks];
    this.queue = this.shuffle ? this.shuffledCopy(tracks) : [...tracks];
    this.queueIndex = startIndex;
    const track = this.queue[startIndex];
    if (!track) return;

    if (
      !force &&
      track.slug === prevSlug &&
      this.engine.getAudioElement()?.src &&
      this.isLivePlayback() &&
      (startMs === 0 || Math.abs(this.getPositionMs() - startMs) < 2500)
    ) {
      if (autoplay && !this.isPlaying()) {
        this.tabs.announcePlayback();
        void this.engine.playFromAction();
      }
      this.notify();
      return;
    }

    if (autoplay) this.tabs.announcePlayback();
    this.restoringPositionMs = startMs > 0 ? startMs : null;
    this.engine.load(track, startMs, autoplay, force);
    this.emit(autoplay ? 'om:play' : 'om:session-restore', track);
    this.notify();
  }

  restoreQueue(fullAlbum: TrackSummary[], queue: TrackSummary[], startIndex: number, startMs: number, autoplay = true): void {
    const track = queue[startIndex];
    if (!track) return;

    const prevSlug = this.engine.getCurrentTrack()?.slug;
    const audio = this.engine.getAudioElement();
    if (
      track.slug === prevSlug &&
      audio?.src &&
      this.isLivePlayback() &&
      Math.abs(this.getPositionMs() - startMs) < 2500
    ) {
      this.originalQueue = [...fullAlbum];
      this.queue = [...queue];
      this.queueIndex = startIndex;
      this.notify();
      return;
    }

    if (autoplay) this.tabs.announcePlayback();
    this.originalQueue = [...fullAlbum];
    this.queue = [...queue];
    this.queueIndex = startIndex;
    this.restoringPositionMs = startMs > 0 ? startMs : null;
    this.engine.load(track, startMs, autoplay);
    this.emit(autoplay ? 'om:play' : 'om:session-restore', track);
    this.notify();
  }

  toggle(): void {
    const wasPlaying = this.isPlaying();
    if (!wasPlaying) this.tabs.announcePlayback();
    const playing = this.engine.toggle();
    if (playing) this.markPlaybackIntent();
    else this.clearPlaybackIntent();
    this.emit(playing ? 'om:play' : 'om:pause', this.engine.getCurrentTrack());
    this.persist(!playing);
    this.notify();
  }

  toggleFromUserGesture(): boolean | null {
    const wasPlaying = this.isPlaying();
    if (!wasPlaying) this.tabs.announcePlayback();
    const playing = this.engine.toggleFromUserGesture();
    if (playing === null) return null;
    if (playing) this.markPlaybackIntent();
    else this.clearPlaybackIntent();
    this.emit(playing ? 'om:play' : 'om:pause', this.engine.getCurrentTrack());
    this.persist(!playing);
    this.notify();
    return playing;
  }

  async handleMediaPlay(): Promise<void> {
    await this.ensureRestored();
    if (!this.engine.getCurrentTrack()) return;
    await this.engine.waitUntilReady();
    if (this.isPlaying()) return;
    this.tabs.announcePlayback();
    const ok = await this.engine.playFromAction();
    if (!ok) return;
    this.emit('om:play', this.engine.getCurrentTrack());
    this.persist();
    this.notify();
  }

  async handleMediaPause(): Promise<void> {
    await this.ensureRestored();
    if (!this.engine.getCurrentTrack()) return;
    await this.engine.waitUntilReady();
    if (!this.isPlaying()) return;
    this.engine.pauseFromAction();
    this.clearPlaybackIntent();
    this.emit('om:pause', this.engine.getCurrentTrack());
    this.persist(true);
    this.notify();
  }

  async handleMediaStop(): Promise<void> {
    await this.ensureRestored();
    if (!this.engine.getCurrentTrack()) return;
    await this.engine.waitUntilReady();
    if (this.isPlaying()) this.engine.pauseFromAction();
    if (this.getPositionMs() > 0) this.seek(0);
    this.clearPlaybackIntent();
    this.emit('om:pause', this.engine.getCurrentTrack());
    this.persist(true);
    this.notify();
  }

  waitUntilReady(): Promise<void> {
    return this.engine.waitUntilReady();
  }

  private onTrackEnd(): void {
    if (this.repeat === 'one') {
      this.tabs.announcePlayback();
      this.markPlaybackIntent();
      if (this.engine.replayFromStart()) {
        this.persist();
        this.notify();
        return;
      }
      const track = this.engine.getCurrentTrack() ?? this.queue[this.queueIndex];
      if (track) {
        this.engine.load(track, 0, true, true);
        this.persist();
        this.notify();
      }
      return;
    }
    if (this.queueIndex < this.queue.length - 1) {
      this.next();
      return;
    }
    if (this.repeat === 'all' && this.queue.length > 0) {
      this.tabs.announcePlayback();
      this.queueIndex = 0;
      this.engine.play(this.queue[0], 0);
      this.emit('om:track-change', this.queue[0]);
      this.notify();
      return;
    }
    this.emit('om:queue-end', this.engine.getCurrentTrack());
    this.notify();
  }

  next(): void {
    if (this.queueIndex < this.queue.length - 1) {
      this.tabs.announcePlayback();
      this.queueIndex += 1;
      const track = this.queue[this.queueIndex];
      this.engine.play(track);
      this.persist();
      this.emit('om:track-change', track);
      this.emit('om:skip', track);
      this.notify();
    } else if (this.repeat === 'all' && this.queue.length > 0) {
      this.tabs.announcePlayback();
      this.queueIndex = 0;
      this.engine.play(this.queue[0], 0);
      this.emit('om:track-change', this.queue[0]);
      this.notify();
    }
  }

  prev(): void {
    if (this.getPositionMs() > 3000) {
      this.engine.seek(0);
      return;
    }
    if (this.queueIndex > 0) {
      this.tabs.announcePlayback();
      this.queueIndex -= 1;
      const track = this.queue[this.queueIndex];
      this.engine.play(track);
      this.persist();
      this.emit('om:track-change', track);
      this.notify();
    }
  }

  previewSeek(ms: number): void {
    this.engine.previewSeek(ms);
    this.notify();
  }

  seek(ms: number): void {
    this.engine.seek(ms);
    this.persist();
    this.emit('om:seek', this.engine.getCurrentTrack());
    this.notify();
  }

  setVolume(v: number): void {
    this.volume = v;
    this.engine.setVolume(v);
    this.persist();
    this.notify();
  }

  cycleRepeat(): void {
    this.repeat = this.repeat === 'off' ? 'all' : this.repeat === 'all' ? 'one' : 'off';
    this.persist();
    this.notify();
  }

  toggleShuffle(): void {
    this.shuffle = !this.shuffle;
    const current = this.engine.getCurrentTrack();
    if (this.shuffle && this.originalQueue.length > 1) {
      const rest = this.originalQueue.filter((t) => t.slug !== current?.slug);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      this.queue = current ? [current, ...rest] : this.shuffledCopy(this.originalQueue);
      this.queueIndex = 0;
    } else {
      this.queue = [...this.originalQueue];
      this.queueIndex = current ? this.queue.findIndex((t) => t.slug === current.slug) : 0;
      if (this.queueIndex < 0) this.queueIndex = 0;
    }
    this.persist();
    this.notify();
  }

  getPositionMs(): number {
    return this.engine.getPositionMs();
  }

  getDurationMs(): number {
    return this.engine.getDurationMs();
  }

  isPlaying(): boolean {
    return this.engine.isPlaying();
  }

  getCurrentTrack(): TrackSummary | null {
    return this.engine.getCurrentTrack();
  }

  private shuffledCopy(tracks: TrackSummary[]): TrackSummary[] {
    const copy = [...tracks];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  persist(flush = false, preservePlaying = false): void {
    if (flush) {
      if (this.persistTimer !== null) {
        clearTimeout(this.persistTimer);
        this.persistTimer = null;
      }
      this.writeSaved(preservePlaying);
      return;
    }
    if (this.persistTimer !== null) return;
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = null;
      this.writeSaved();
    }, 800);
  }

  private writeSaved(preservePlaying = false): void {
    const track = this.engine.getCurrentTrack();
    const livePosition = this.getPositionMs();
    const positionMs =
      this.restoringPositionMs !== null && livePosition < 1000
        ? this.restoringPositionMs
        : livePosition;
    const saved: SavedPlayback = {
      trackSlug: track?.slug ?? null,
      albumSlug: track?.albumSlug ?? null,
      queueSlugs: this.queue.map((t) => t.slug),
      queueIndex: this.queueIndex,
      positionMs,
      volume: this.volume,
      repeat: this.repeat,
      shuffle: this.shuffle,
      wasPlaying: preservePlaying
        ? (this.isNavigatingPlayback() || this.isPlaying())
        : this.isPlaying(),
      trackTitle: track?.title ?? null,
      artistName: track?.artistName ?? null,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }

  private emit(name: string, track: TrackSummary | null): void {
    window.dispatchEvent(new CustomEvent(name, { detail: { track, store: this } }));
  }
}

let singleton: PlayerStore | null = null;

export function getPlayerStore(): PlayerStore {
  if (!singleton) singleton = new PlayerStore();
  return singleton;
}

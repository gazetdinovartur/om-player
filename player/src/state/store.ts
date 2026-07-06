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
  private navigationPlaybackLock = false;
  private navigationSnapshotMs = 0;
  private shouldResumeAfterNav = false;
  private intendedPlaying = false;
  private lastKnownPositionMs = 0;
  private backgroundPlayback = false;
  private backgroundResumeTimer: number | null = null;

  private resolvePersistedPosition(livePosition: number): number {
    if (livePosition > 1000) {
      this.lastKnownPositionMs = livePosition;
      return livePosition;
    }
    if (this.restoringPositionMs !== null && this.restoringPositionMs > 1000) {
      return this.restoringPositionMs;
    }
    if (this.lastKnownPositionMs > 1000) {
      return this.lastKnownPositionMs;
    }
    const track = this.engine.getCurrentTrack();
    const saved = this.loadSaved();
    if (
      saved?.trackSlug &&
      track?.slug === saved.trackSlug &&
      saved.positionMs > 1000
    ) {
      return saved.positionMs;
    }
    return livePosition;
  }

  syncSavedPlaybackPosition(): void {
    if (this.isNavigatingPlayback() || this.isPlaying() || this.intendedPlaying) return;

    const audio = this.engine.peekAudioElement();
    const saved = this.loadSaved();
    const track = this.engine.getCurrentTrack();
    if (!audio?.src || audio.ended || !saved?.trackSlug || !track) return;
    if (track.slug !== saved.trackSlug) return;
    if (!audio.paused) return;

    const pos = this.getPositionMs();
    if (saved.positionMs > 1500 && pos < 1000) {
      this.engine.seek(saved.positionMs);
      this.lastKnownPositionMs = saved.positionMs;
    }
  }

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
    this.shouldResumeAfterNav = false;
    this.navigationSnapshotMs = 0;
    this.setNavigatingAudioFlag(false);
  }

  private setNavigatingAudioFlag(active: boolean): void {
    const audio = this.engine.peekAudioElement();
    if (!audio) return;
    if (active) {
      audio.dataset.omNavigating = '1';
    } else {
      delete audio.dataset.omNavigating;
    }
  }

  /** Active playback that must not be interrupted by restore/reload. */
  hasActiveSession(): boolean {
    const audio = this.engine.peekAudioElement();
    const track = this.engine.getCurrentTrack();
    if (!track || !audio?.src || audio.ended || audio.error) return false;
    if (this.isNavigatingPlayback()) return true;
    if (this.isPlaying() || this.intendedPlaying) return true;
    return audio.currentTime > 0.25 || this.engine.getPositionMs() > 250;
  }

  isNavigating(): boolean {
    return this.isNavigatingPlayback();
  }

  completeNavigation(): void {
    this.finalizeNavigationPlayback();
  }

  repairNavigationPositionPublic(): void {
    this.repairNavigationPositionBeforeResume();
    this.notify();
  }

  private captureNavigationIntent(_unlockGesture = false): void {
    const audio = this.engine.peekAudioElement();
    if (!audio?.src || audio.ended) return;

    const live = this.engine.getPositionMs();
    const pos = Math.max(live, this.lastKnownPositionMs, Math.round(audio.currentTime * 1000));
    const wasActive =
      this.isPlaying() ||
      this.intendedPlaying ||
      pos > 250 ||
      audio.currentTime > 0.25;

    if (!wasActive) return;

    this.shouldResumeAfterNav = this.isPlaying() || this.intendedPlaying;
    this.wasPlayingBeforeNav = true;
    this.navigationPlaybackLock = true;

    const snapshot = Math.max(pos, this.lastKnownPositionMs);
    if (snapshot > 250) {
      this.navigationSnapshotMs = snapshot;
      this.lastKnownPositionMs = snapshot;
    }

    this.setNavigatingAudioFlag(true);
  }

  private isLivePlayback(): boolean {
    const audio = this.engine.peekAudioElement();
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
    if (this.hasActiveSession()) return;

    const audio = this.engine.peekAudioElement();
    if (
      this.engine.getCurrentTrack() &&
      audio?.src &&
      !audio.error &&
      this.engine.hasPlayableSource()
    ) {
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
    if (saved?.positionMs > 1000) this.lastKnownPositionMs = saved.positionMs;
    if (saved?.trackSlug) {
      this.engine.primeMediaSession(
        saved.trackTitle ?? saved.trackSlug,
        saved.artistName ?? 'OmPlayer',
        saved.wasPlaying === true,
      );
    }

    this.engine.setVolume(this.volume);
    this.engine.onSpuriousPause(() => {
      if (this.isNavigatingPlayback()) return;
      if (!this.intendedPlaying && !this.backgroundPlayback) return;
      this.scheduleBackgroundResume();
    });
    this.engine.onPlaybackStarted(() => {
      if (this.isNavigatingPlayback()) return;
      this.markPlaybackIntent();
      this.notify();
    });
    this.engine.onFinished(() => this.onTrackEnd());
    this.engine.onPosition(() => {
      const pos = this.getPositionMs();
      if (pos > 500) this.lastKnownPositionMs = pos;
      if (!this.isNavigatingPlayback()) {
        this.persist();
      }
    });
    this.engine.onLoaded(() => {
      const expected = this.restoringPositionMs;
      if (expected !== null && expected > 1000) {
        const confirmSeek = (): void => {
          const pos = this.getPositionMs();
          if (pos > 1000 || Math.abs(pos - expected) < 2500) {
            this.restoringPositionMs = null;
            if (pos > 500) this.lastKnownPositionMs = pos;
            this.persist();
            this.notify();
            return;
          }
          window.setTimeout(confirmSeek, 60);
        };
        window.setTimeout(confirmSeek, 0);
        return;
      }
      this.restoringPositionMs = null;
      const pos = this.getPositionMs();
      if (pos > 500) this.lastKnownPositionMs = pos;
      this.persist();
      this.notify();
    });
    this.engine.onLoadError(() => {
      this.clearPlaybackIntent();
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
    this.wireBackgroundPlayback();

    document.addEventListener('turbo:click', () => {
      this.captureNavigationIntent();
    }, true);

    window.addEventListener('pagehide', () => this.persist(true, true));
    window.addEventListener('beforeunload', () => this.persist(true, true));
    window.addEventListener('turbo:before-visit', () => {
      this.captureNavigationIntent();
      this.persist(true, true);
    });
    window.addEventListener('turbo:load', () => {
      this.wireAudioNavigationGuard();
      void this.completeNavigationQuietly();
    });
  }

  /**
   * Yandex-style navigation: never touch audio while Turbo runs.
   * Resume only as a last resort if the browser genuinely paused the element.
   */
  private async completeNavigationQuietly(): Promise<void> {
    if (!this.isNavigatingPlayback()) {
      this.notify();
      return;
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
    });

    const audio = this.engine.peekAudioElement();

    if (audio?.src && !audio.paused && !audio.ended) {
      this.finalizeNavigationPlayback();
      return;
    }

    if (this.shouldResumeAfterNav && audio?.src && audio.paused && !audio.ended) {
      const live = Math.round(audio.currentTime * 1000);
      const target = Math.max(this.navigationSnapshotMs, this.lastKnownPositionMs);
      if (live < 30 && target > live + 2000) {
        this.engine.seek(target);
      }
      await this.engine.playFromAction();
    }

    this.finalizeNavigationPlayback();
  }

  private finalizeNavigationPlayback(): void {
    const audio = this.engine.peekAudioElement();
    if (audio?.src && !audio.paused && !audio.ended) {
      this.markPlaybackIntent();
    }
    this.clearNavigationLock();
    window.requestAnimationFrame(() => this.persist());
    this.notify();
  }

  /**
   * Seek only when Turbo clearly zeroed currentTime.
   * Must run while paused and before play() — never seek during playback.
   */
  private repairNavigationPositionBeforeResume(): void {
    const audio = this.engine.peekAudioElement();
    if (!audio?.src || audio.ended || !audio.paused) return;

    const live = Math.round(audio.currentTime * 1000);
    if (live > 30) return;

    const savedPos = this.loadSaved()?.positionMs ?? 0;
    const target = Math.max(this.navigationSnapshotMs, this.lastKnownPositionMs, savedPos);
    if (target < live + 3000) return;

    this.engine.seek(target);
    this.lastKnownPositionMs = target;
  }

  private wireBackgroundPlayback(): void {
    const onHidden = (): void => {
      if (this.isPlaying()) {
        this.backgroundPlayback = true;
        this.markPlaybackIntent();
      }
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        onHidden();
        return;
      }
      void this.resumeAfterBackground();
    });

    window.addEventListener('pagehide', onHidden);
    document.addEventListener('freeze', onHidden);
    document.addEventListener('resume', () => {
      void this.resumeAfterBackground();
    });
  }

  private scheduleBackgroundResume(): void {
    if (this.backgroundResumeTimer !== null) return;
    this.backgroundResumeTimer = window.setTimeout(() => {
      this.backgroundResumeTimer = null;
      void this.resumeAfterBackground();
    }, 120);
  }

  private async resumeAfterBackground(): Promise<void> {
    if (this.isNavigatingPlayback()) return;

    const audio = this.engine.peekAudioElement();
    if (!audio?.src || audio.ended) {
      this.backgroundPlayback = false;
      return;
    }

    if (!this.intendedPlaying && !this.backgroundPlayback) return;

    if (!audio.paused) {
      this.backgroundPlayback = false;
      this.markPlaybackIntent();
      this.engine.ensurePlaybackRunning();
      return;
    }

    const ok = await this.engine.playFromAction();
    if (ok) {
      this.backgroundPlayback = false;
      this.markPlaybackIntent();
      this.engine.ensureMediaSessionHandlers();
      this.notify();
      return;
    }

    if (document.visibilityState === 'visible') {
      this.backgroundPlayback = false;
    }
  }

  private wireAudioNavigationGuard(): void {
    const audio = document.getElementById('om-audio-engine') as HTMLAudioElement | null;
    if (!audio || audio.dataset.omNavGuard === '1') return;
    audio.dataset.omNavGuard = '1';
    audio.addEventListener('play', () => this.markPlaybackIntent());
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

  shouldAutoplayRestore(_wasPlaying: boolean): boolean {
    // Browsers block programmatic play without a user gesture — restore paused.
    return false;
  }

  playTrack(track: TrackSummary, startMs = 0, force = false): void {
    this.loadTrack(track, startMs, true, force);
  }

  loadTrack(track: TrackSummary, startMs = 0, autoplay = true, force = false): void {
    if (autoplay) this.markPlaybackIntent();
    try {
      this.loadTrackInternal(track, startMs, autoplay, force);
    } catch {
      this.clearPlaybackIntent();
      this.notify();
      throw new Error('No stream URL');
    }
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

    let effectiveStartMs = startMs;
    if (
      !force &&
      startMs === 0 &&
      track.slug === prevSlug &&
      this.getPositionMs() > 1000
    ) {
      effectiveStartMs = this.getPositionMs();
    }

    const audio = this.engine.peekAudioElement();

    if (
      !force &&
      track.slug === prevSlug &&
      audio?.src &&
      this.hasActiveSession() &&
      (effectiveStartMs === 0 || Math.abs(this.getPositionMs() - effectiveStartMs) < 2500)
    ) {
      if (autoplay && !this.isPlaying()) {
        this.tabs.announcePlayback();
        void this.engine.playFromAction();
      }
      this.notify();
      return;
    }

    if (autoplay) this.tabs.announcePlayback();
    this.restoringPositionMs = effectiveStartMs > 0 ? effectiveStartMs : null;
    try {
      this.engine.load(track, effectiveStartMs, autoplay, force);
    } catch {
      this.clearPlaybackIntent();
      this.notify();
      throw new Error('No stream URL');
    }
    this.emit(autoplay ? 'om:play' : 'om:session-restore', track);
    this.notify();
  }

  restoreQueue(fullAlbum: TrackSummary[], queue: TrackSummary[], startIndex: number, startMs: number, autoplay = true): void {
    const track = queue[startIndex];
    if (!track) return;

    const prevSlug = this.engine.getCurrentTrack()?.slug;
    const audio = this.engine.peekAudioElement();
    if (
      track.slug === prevSlug &&
      audio?.src &&
      this.hasActiveSession() &&
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
    const audio = this.engine.peekAudioElement();
    const track = this.engine.getCurrentTrack();
    if (track && audio?.src && audio.paused && !audio.ended) {
      this.tabs.announcePlayback();
      const ok = await this.engine.playFromAction();
      if (ok) {
        this.markPlaybackIntent();
        this.backgroundPlayback = false;
        this.emit('om:play', track);
        this.persist();
        this.notify();
        return;
      }
    }

    await this.ensureRestored();
    if (!this.engine.getCurrentTrack()) return;
    await this.engine.waitUntilReady();
    if (this.isPlaying()) return;
    this.tabs.announcePlayback();
    const ok = await this.engine.playFromAction();
    if (!ok) return;
    this.markPlaybackIntent();
    this.backgroundPlayback = false;
    this.emit('om:play', this.engine.getCurrentTrack());
    this.persist();
    this.notify();
  }

  async handleMediaPause(): Promise<void> {
    const audio = this.engine.peekAudioElement();
    if (audio?.src && !audio.paused) {
      this.engine.pauseFromAction();
      this.clearPlaybackIntent();
      this.backgroundPlayback = false;
      this.emit('om:pause', this.engine.getCurrentTrack());
      this.persist(true);
      this.notify();
      return;
    }

    await this.ensureRestored();
    if (!this.engine.getCurrentTrack()) return;
    await this.engine.waitUntilReady();
    if (!this.isPlaying()) return;
    this.engine.pauseFromAction();
    this.clearPlaybackIntent();
    this.backgroundPlayback = false;
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
    const live = this.engine.getPositionMs();
    if (this.isNavigatingPlayback() && live < 500) {
      if (this.navigationSnapshotMs > 500) return this.navigationSnapshotMs;
      if (this.lastKnownPositionMs > 500) return this.lastKnownPositionMs;
    }
    return live;
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

  hasInQueue(slug: string): boolean {
    return this.queue.some((t) => t.slug === slug);
  }

  queueIndexOf(slug: string): number {
    return this.queue.findIndex((t) => t.slug === slug);
  }

  removeBySlug(slug: string): boolean {
    const idx = this.queueIndexOf(slug);
    if (idx < 0) return false;
    this.removeAt(idx);
    return true;
  }

  moveQueueItem(from: number, to: number): void {
    if (from === to || from < 0 || to < 0 || from >= this.queue.length) return;

    const item = this.queue[from];
    this.queue.splice(from, 1);
    const insertAt = Math.max(0, Math.min(to, this.queue.length));
    this.queue.splice(insertAt, 0, item);

    const current = this.engine.getCurrentTrack();
    if (current) {
      const idx = this.queue.findIndex((t) => t.slug === current.slug);
      if (idx >= 0) this.queueIndex = idx;
    }

    if (!this.shuffle) {
      this.originalQueue = [...this.queue];
    }

    this.persist();
    this.notify();
  }

  addToQueue(track: TrackSummary): boolean {
    if (this.hasInQueue(track.slug)) return false;

    this.originalQueue.push(track);
    this.queue.push(track);
    this.persist();
    this.notify();
    return true;
  }

  playNext(track: TrackSummary): boolean {
    const existingIdx = this.queueIndexOf(track.slug);
    const current = this.engine.getCurrentTrack();

    if (existingIdx >= 0) {
      if (existingIdx === this.queueIndex) return false;
      const target = this.queueIndex + 1;
      if (existingIdx !== target) {
        this.moveQueueItem(existingIdx, target);
      }
      return true;
    }

    if (!current || this.queue.length === 0) {
      this.loadTrack(track, 0, true);
      return true;
    }

    const insertAt = this.queueIndex + 1;
    this.queue.splice(insertAt, 0, track);

    if (!this.shuffle) {
      this.originalQueue = [...this.queue];
    } else {
      this.originalQueue.push(track);
    }

    this.persist();
    this.notify();
    return true;
  }

  removeAt(index: number): void {
    if (index < 0 || index >= this.queue.length) return;

    const removed = this.queue[index];
    this.queue.splice(index, 1);
    const origIdx = this.originalQueue.findIndex((t) => t.slug === removed.slug);
    if (origIdx >= 0) this.originalQueue.splice(origIdx, 1);

    if (this.queue.length === 0) {
      this.queueIndex = 0;
      this.engine.pause();
      this.clearPlaybackIntent();
      this.persist();
      this.notify();
      return;
    }

    if (index < this.queueIndex) {
      this.queueIndex -= 1;
    } else if (index === this.queueIndex) {
      if (this.queueIndex >= this.queue.length) {
        this.queueIndex = this.queue.length - 1;
      }
      const next = this.queue[this.queueIndex];
      if (next) {
        this.tabs.announcePlayback();
        this.engine.play(next, 0);
        this.emit('om:track-change', next);
      }
    }

    this.persist();
    this.notify();
  }

  clearQueue(): void {
    const current = this.engine.getCurrentTrack();
    if (!current) {
      this.queue = [];
      this.originalQueue = [];
      this.queueIndex = 0;
    } else {
      this.queue = [current];
      this.originalQueue = [current];
      this.queueIndex = 0;
    }
    this.persist();
    this.notify();
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
    let livePosition = this.engine.getPositionMs();
    if (this.isNavigatingPlayback() && livePosition < 500 && this.navigationSnapshotMs > 500) {
      livePosition = this.navigationSnapshotMs;
    }
    const positionMs = this.resolvePersistedPosition(livePosition);
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

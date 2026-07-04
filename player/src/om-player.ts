import { html, LitElement, nothing, unsafeCSS } from 'lit';
import { OmApiClient } from './api/client';
import { withAbsoluteStream } from './api/resolve-url';
import type { TrackSummary } from './api/types';
import {
  iconHeart,
  iconHeartFilled,
  iconNext,
  iconPause,
  iconPlay,
  iconPrev,
  iconRepeat,
  iconRepeatOne,
  iconShuffle,
  iconSpinner,
  iconVolume,
} from './icons';
import { getFavoritesStore } from './state/favorites';
import { getPlayerStore } from './state/store';
import type { RepeatMode } from './state/store';
import { renderVisualizer } from './visualizer';
import playerStyles from './styles/player.css?inline';

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export class OmPlayer extends LitElement {
  static styles = unsafeCSS(playerStyles);

  static properties = {
    mode: { type: String, reflect: true },
    apiBase: { attribute: 'api-base' },
    theme: { type: String, reflect: true },
    track: { type: String },
    album: { type: String },
    playlist: { type: String },
    albumCover: { attribute: 'album-cover' },
    albumTitle: { attribute: 'album-title' },
    albumArtist: { attribute: 'album-artist' },
    autoPlay: { type: Boolean, attribute: 'auto-play' },
    loading: { state: true },
    error: { state: true },
    visible: { state: true },
    seeking: { state: true },
    scrubMs: { state: true },
    previewTrack: { state: true },
  };

  declare mode: 'embed' | 'mini' | 'full';
  declare apiBase: string;
  declare theme: 'light' | 'dark';
  declare track: string;
  declare album: string;
  declare playlist: string;
  declare albumCover: string;
  declare albumTitle: string;
  declare albumArtist: string;
  declare autoPlay: boolean;
  declare loading: boolean;
  declare error: string;
  declare visible: boolean;
  declare seeking: boolean;
  declare scrubMs: number;
  declare previewTrack: TrackSummary | null;

  constructor() {
    super();
    this.mode = 'mini';
    this.apiBase = '/api/v1';
    this.theme = 'light';
    this.track = '';
    this.album = '';
    this.playlist = '';
    this.albumCover = '';
    this.albumTitle = '';
    this.albumArtist = '';
    this.autoPlay = false;
    this.loading = false;
    this.error = '';
    this.visible = false;
    this.seeking = false;
    this.scrubMs = 0;
    this.previewTrack = null;
  }

  private store = getPlayerStore();
  private favorites = getFavoritesStore();
  private client: OmApiClient | null = null;
  private unsub: (() => void) | null = null;
  private unsubFav: (() => void) | null = null;
  private restoreInFlight: Promise<void> | null = null;
  private progressTimer: number | null = null;
  private heartClickHandler: ((e: Event) => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.client = new OmApiClient(this.apiBase);
    this.unsub = this.store.subscribe(() => {
      if (!this.isConnected) return;
      if (this.mode === 'mini' && (this.store.getCurrentTrack() || this.hasLiveAudio())) {
        this.visible = true;
      }
      if (!this.seeking) {
        this.scheduleUiUpdate();
      }
    });
    this.unsubFav = this.favorites.subscribe(() => {
      this.scheduleUiUpdate();
    });
    this.store.engine.onLoadError((message) => {
      if (!this.isConnected) return;
      this.error = message;
      this.loading = false;
      this.scheduleUiUpdate();
    });
    if (this.mode === 'mini') {
      this.store.setRestoreHandler(() => this.restoreSessionPublic());
      const audio = this.store.engine.getAudioElement();
      if (audio?.src && !audio.ended) {
        this.visible = true;
      } else {
        const saved = this.store.loadSaved();
        const needsRestore =
          !this.store.getCurrentTrack() &&
          !this.store.engine.hasActivePlayback() &&
          !!saved?.trackSlug;
        if (needsRestore) {
          const run = (): void => {
            if (this.isConnected) void this.restoreSessionPublic();
          };
          if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(run, { timeout: 2000 });
          } else {
            setTimeout(run, 120);
          }
        }
      }
    }
    if (this.store.getCurrentTrack()) this.visible = true;

    this.addEventListener('om:cmd-next', () => this.store.next());
    this.addEventListener('om:cmd-prev', () => this.store.prev());

    if (this.mode === 'full') {
      this.hydrateQueueFromPage();
    } else if (this.mode === 'embed' && this.track) {
      if (this.autoPlay) void this.playSlug(this.track);
      else this.scheduleEmbedPreload();
    }

    if (this.mode === 'mini' || this.mode === 'full' || this.mode === 'embed') {
      this.startProgressTimer();
    }

    this.heartClickHandler = (e: Event) => {
      const btn = (e.target as Element).closest('.btn--heart');
      if (!btn || !this.renderRoot.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      const slug = btn.getAttribute('data-slug');
      if (!slug) return;
      this.favorites.toggle(slug);
      this.requestUpdate();
    };
    this.renderRoot.addEventListener('click', this.heartClickHandler);
  }

  disconnectedCallback(): void {
    this.stopProgressTimer();
    if (this.heartClickHandler) {
      this.renderRoot.removeEventListener('click', this.heartClickHandler);
      this.heartClickHandler = null;
    }
    this.unsub?.();
    this.unsubFav?.();
    this.unsub = null;
    this.unsubFav = null;
    super.disconnectedCallback();
  }

  protected override requestUpdate(name?: PropertyKey, oldValue?: unknown): void {
    if (!this.isConnected) return;
    super.requestUpdate(name, oldValue);
  }

  protected override performUpdate(): void {
    if (!this.isConnected) return;
    super.performUpdate();
  }

  protected override updated(changed: Map<string, unknown>): void {
    if (!this.isConnected) return;
    if (changed.has('theme')) this.setAttribute('theme', this.theme);
    if (this.mode === 'embed' && changed.has('track') && this.track && !this.autoPlay) {
      this.scheduleEmbedPreload();
    }
  }

  /** Load embed metadata after first paint — keeps navigation snappy. */
  private scheduleEmbedPreload(): void {
    const run = (): void => {
      if (this.isConnected) void this.preloadEmbedTrack();
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 120);
    }
  }

  /** Defer Lit update so Turbo teardown can finish first. */
  private scheduleUiUpdate(): void {
    queueMicrotask(() => {
      if (!this.isConnected || this.seeking) return;
      this.requestUpdate();
    });
  }

  private startProgressTimer(): void {
    this.stopProgressTimer();
    this.progressTimer = window.setInterval(() => {
      if (!this.isConnected || this.seeking) return;

      const hasTrack = this.mode === 'embed'
        ? !!(this.hasLiveAudio() || this.embedSource)
        : !!this.store.getCurrentTrack();
      if (!hasTrack) return;

      const duration = this.resolveScrubDurationMs();
      if (duration > 0) {
        if (this.seeking) {
          this.syncProgressDom(this.scrubMs, duration);
        } else {
          this.scheduleUiUpdate();
        }
      }
    }, 250);
  }

  private hasLiveAudio(): boolean {
    const audio = this.store.engine.peekAudioElement();
    return !!(audio?.src && !audio.ended);
  }

  private stopProgressTimer(): void {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private playQueueIndex(index: number): void {
    void this.playQueueIndexAsync(index);
  }

  private queueNeedsStreams(tracks: TrackSummary[]): boolean {
    return tracks.some((t) => !t.stream?.url);
  }

  private mergeQueueStreams(full: TrackSummary[], base: TrackSummary[]): TrackSummary[] {
    const bySlug = new Map(full.map((t) => [t.slug, t]));
    return base.map((t) => bySlug.get(t.slug) ?? t);
  }

  private async resolveQueueStreams(tracks: TrackSummary[]): Promise<TrackSummary[]> {
    if (!this.client || !this.queueNeedsStreams(tracks)) return tracks;
    if (this.album) {
      const { data } = await this.client.getAlbumTracks(this.album);
      return this.mergeQueueStreams(data, tracks).map((t) => withAbsoluteStream(this.apiBase, t));
    }
    return Promise.all(
      tracks.map(async (track) => {
        if (track.stream?.url) return withAbsoluteStream(this.apiBase, track);
        return withAbsoluteStream(this.apiBase, await this.client!.getTrack(track.slug));
      }),
    );
  }

  private async playQueueIndexAsync(index: number): Promise<void> {
    if (!this.client) return;
    try {
      const tracks = await this.resolveQueueStreams(this.queue);
      this.store.originalQueue = this.mergeQueueStreams(tracks, this.store.originalQueue);
      this.store.queue = [...tracks];
      this.store.setQueue(tracks, index);
    } catch {
      if (this.isConnected) this.error = 'Трек недоступен';
    }
  }

  private get embedSource(): TrackSummary | null {
    if (this.mode !== 'embed') return this.current;
    if (this.hasLiveAudio() && this.current) return this.current;
    if (this.previewTrack?.slug === this.track) return this.previewTrack;
    return this.previewTrack;
  }

  private async preloadEmbedTrack(): Promise<void> {
    if (!this.client || !this.track || this.mode !== 'embed') return;
    if (this.current?.slug === this.track || this.previewTrack?.slug === this.track) return;

    this.loading = true;
    this.error = '';
    try {
      const detail = withAbsoluteStream(this.apiBase, await this.client.getTrack(this.track));
      if (!detail.stream?.url) {
        if (!this.isConnected) return;
        this.previewTrack = null;
        this.error = 'Аудиофайл недоступен на сервере';
        return;
      }
      this.previewTrack = detail;
      this.albumCover = detail.coverThumbUrl ?? detail.coverUrl ?? '';
      this.requestUpdate();
    } catch {
      if (!this.isConnected) return;
      this.previewTrack = null;
      this.error = 'Трек недоступен';
    } finally {
      if (this.isConnected) this.loading = false;
    }
  }

  private get current(): TrackSummary | null {
    return this.store.getCurrentTrack();
  }

  private get playing(): boolean {
    return this.store.isPlaying();
  }

  private get positionMs(): number {
    return this.store.getPositionMs();
  }

  private get queue(): TrackSummary[] {
    return this.store.queue;
  }

  private get displayTitle(): string {
    const source = this.mode === 'embed' ? this.embedSource : this.current;
    return source?.title ?? this.albumTitle ?? 'Выберите трек';
  }

  private get displayArtist(): string {
    const source = this.mode === 'embed' ? this.embedSource : this.current;
    return source?.artistName ?? this.albumArtist ?? '';
  }

  private get coverUrl(): string {
    const source = this.mode === 'embed' ? this.embedSource : this.current;
    return source?.coverThumbUrl ?? source?.coverUrl ?? this.albumCover ?? '';
  }

  private renderPlayButton(size: 'md' | 'lg' = 'md', playing = this.playing): unknown {
    const cls = size === 'lg' ? 'btn btn--play btn--play-lg' : 'btn btn--play';
    return html`
      <button
        class=${cls}
        @pointerdown=${this.onPlayPointerDown}
        @click=${this.onPlayClick}
        ?disabled=${this.loading}
        aria-label=${playing ? 'Пауза' : 'Воспроизвести'}
        aria-busy=${this.loading ? 'true' : 'false'}
      >
        ${this.loading ? iconSpinner : playing ? iconPause : iconPlay}
      </button>
    `;
  }

  private renderHeart(slug: string | undefined): unknown {
    if (!slug) return nothing;
    const active = this.favorites.isFavorite(slug);
    return html`
      <button
        type="button"
        class="btn btn--heart${active ? ' is-active' : ''}"
        data-slug=${slug}
        aria-label=${active ? 'Убрать из избранного' : 'В избранное'}
        aria-pressed=${active ? 'true' : 'false'}
      >
        ${active ? iconHeartFilled : iconHeart}
      </button>
    `;
  }

  private get displayPositionMs(): number {
    return this.seeking ? this.scrubMs : this.positionMs;
  }

  private resolveScrubDurationMs(): number {
    const fromEngine = this.store.getDurationMs();
    if (fromEngine > 0) return fromEngine;
    if (this.current?.durationMs) return this.current.durationMs;
    if (this.mode === 'embed') return this.embedSource?.durationMs ?? 0;
    return 0;
  }

  private canScrub(): boolean {
    if (this.mode === 'embed') {
      return this.hasLiveAudio() && this.resolveScrubDurationMs() > 0;
    }
    return !!this.store.getCurrentTrack() && this.resolveScrubDurationMs() > 0;
  }

  private renderProgress(duration: number, compact = false): unknown {
    const max = this.resolveScrubDurationMs() || duration || 1;
    const pos = this.displayPositionMs;
    const pct = Math.min(100, Math.max(0, (pos / max) * 100));
    const readonly = !this.canScrub();
    return html`
      <div class="progress-wrap${compact ? ' progress-wrap--compact' : ''}${this.seeking ? ' is-scrubbing' : ''}${readonly ? ' progress-wrap--readonly' : ''}">
        <span class="time">${formatMs(pos)}</span>
        <div
          class="progress-track"
          role="slider"
          tabindex=${readonly ? -1 : 0}
          aria-label="Прогресс"
          aria-valuemin="0"
          aria-valuemax=${max}
          aria-valuenow=${Math.round(pos)}
          aria-disabled=${readonly ? 'true' : 'false'}
          @pointerdown=${this.onProgressPointerDown}
        >
          <div class="progress-rail" aria-hidden="true"></div>
          <div class="progress-fill" style=${`width:${pct}%`}></div>
          <div class="progress-thumb" style=${`left:${pct}%`} aria-hidden="true"></div>
        </div>
        <span class="time">${formatMs(max)}</span>
      </div>
    `;
  }

  private seekFromPointer(e: PointerEvent, durationMs: number): number {
    const track = this.renderRoot.querySelector('.progress-track') as HTMLElement | null;
    if (!track) return this.scrubMs;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return Math.floor(ratio * durationMs);
  }

  private syncProgressDom(ms: number, durationMs: number): void {
    const pct = Math.min(100, Math.max(0, durationMs > 0 ? (ms / durationMs) * 100 : 0));
    const track = this.renderRoot.querySelector('.progress-track');
    if (!track) return;
    const fill = track.querySelector('.progress-fill') as HTMLElement | null;
    const thumb = track.querySelector('.progress-thumb') as HTMLElement | null;
    if (fill) fill.style.width = `${pct}%`;
    if (thumb) thumb.style.left = `${pct}%`;
  }

  private onProgressPointerDown(e: PointerEvent): void {
    if (!this.canScrub()) return;

    const durationMs = this.resolveScrubDurationMs();
    if (durationMs <= 0) return;

    const trackEl = e.currentTarget as HTMLElement;
    e.preventDefault();
    trackEl.setPointerCapture(e.pointerId);
    this.seeking = true;
    this.scrubMs = this.seekFromPointer(e, durationMs);
    this.syncProgressDom(this.scrubMs, durationMs);
    this.requestUpdate();

    const onMove = (ev: PointerEvent): void => {
      if (!this.seeking) return;
      this.scrubMs = this.seekFromPointer(ev, durationMs);
      this.syncProgressDom(this.scrubMs, durationMs);
      this.requestUpdate();
    };

    const onUp = (ev: PointerEvent): void => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (trackEl.hasPointerCapture(ev.pointerId)) {
        trackEl.releasePointerCapture(ev.pointerId);
      }
      if (!this.seeking) return;
      this.seeking = false;
      this.store.seek(this.scrubMs);
      this.scrubMs = this.store.getPositionMs();
      this.scheduleUiUpdate();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  private renderCover(size: 'sm' | 'md' | 'lg' = 'sm'): unknown {
    const url = this.coverUrl;
    const cls = `cover cover--${size}`;
    return url
      ? html`<img class=${cls} src=${url} alt=${this.displayTitle} loading="lazy">`
      : html`<div class=${cls}></div>`;
  }

  private hydrateQueueFromPage(): boolean {
    const sourceId = this.getAttribute('data-queue-source');
    if (!sourceId) return false;

    const node = document.getElementById(sourceId);
    if (!node?.textContent) return false;

    try {
      const tracks = JSON.parse(node.textContent) as TrackSummary[];
      if (!Array.isArray(tracks) || tracks.length === 0) return false;
      this.store.originalQueue = tracks;
      this.store.queue = [...tracks];
      const current = this.store.getCurrentTrack();
      if (current) {
        const idx = tracks.findIndex((t) => t.slug === current.slug);
        if (idx >= 0) this.store.queueIndex = idx;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async loadQueue(autoStart: boolean): Promise<void> {
    if (!this.client) return;

    if (this.hydrateQueueFromPage()) {
      if (autoStart && this.store.queue.length) {
        const albumSlug = this.album || this.store.originalQueue[0]?.albumSlug || '';
        if (albumSlug && this.shouldSkipAlbumStart(albumSlug)) {
          this.visible = true;
          return;
        }
        this.loading = true;
        this.error = '';
        try {
          const tracks = await this.resolveQueueStreams(this.store.originalQueue);
          this.store.originalQueue = tracks;
          this.store.queue = [...tracks];
          this.store.setQueue(tracks, 0, 0, true, true);
          this.visible = true;
        } catch {
          this.error = 'Не удалось загрузить треки';
        } finally {
          if (this.isConnected) this.loading = false;
        }
      }
      return;
    }

    const cachedAlbum = this.store.originalQueue[0]?.albumSlug;
    if (this.album && cachedAlbum === this.album && this.store.originalQueue.length > 0) {
      this.store.queue = [...this.store.originalQueue];
      if (autoStart && this.store.queue.length) {
        if (this.shouldSkipAlbumStart(this.album)) {
          this.visible = true;
          return;
        }
        this.store.setQueue(this.store.originalQueue, 0, 0, true, true);
        this.visible = true;
      }
      return;
    }

    this.loading = true;
    this.error = '';
    try {
      let tracks: TrackSummary[] = [];
      if (this.album) {
        tracks = (await this.client.getAlbumTracks(this.album)).data;
      } else if (this.playlist) {
        tracks = (await this.client.getPlaylistTracks(this.playlist)).tracks;
      }
      this.store.originalQueue = tracks;
      this.store.queue = [...tracks];
      if (autoStart && tracks.length) {
        if (this.album && this.shouldSkipAlbumStart(this.album)) {
          this.visible = true;
          return;
        }
        this.store.setQueue(tracks, 0, 0, true, true);
        this.visible = true;
      }
    } catch {
      this.error = 'Не удалось загрузить треки';
    } finally {
      if (this.isConnected) this.loading = false;
    }
  }

  private async playSlug(slug: string, startMs = 0): Promise<void> {
    if (!this.client) return;
    this.loading = true;
    this.error = '';
    try {
      const detail = withAbsoluteStream(this.apiBase, await this.client.getTrack(slug));
      if (!detail.stream?.url) {
        if (this.isConnected) this.error = 'Аудиофайл недоступен на сервере';
        return;
      }
      const forceReload = this.mode === 'embed' || !!this.store.engine.peekAudioElement()?.error;
      if (this.mode === 'embed') this.previewTrack = detail;
      this.store.playTrack(detail, startMs, forceReload || this.mode === 'embed');
      this.visible = true;
      this.dispatchEvent(new CustomEvent('om:play', { bubbles: true, composed: true, detail: { track: detail } }));
    } catch {
      if (this.isConnected) this.error = 'Трек недоступен';
    } finally {
      if (this.isConnected) this.loading = false;
    }
  }

  private shouldSkipAlbumStart(albumSlug: string): boolean {
    if (!this.store.isPlaying()) return false;
    const current = this.store.getCurrentTrack();
    if (current?.albumSlug === albumSlug) return true;
    return true;
  }

  private async playAlbum(slug: string): Promise<void> {
    if (!this.client) return;
    if (this.shouldSkipAlbumStart(slug)) return;

    this.loading = true;
    try {
      const { data } = await this.client.getAlbumTracks(slug);
      if (data.length) {
        this.store.setQueue(data, 0, 0, true, true);
        this.visible = true;
      }
    } catch {
      this.error = 'Альбом недоступен';
    } finally {
      if (this.isConnected) this.loading = false;
    }
  }

  private async playPlaylist(slug: string): Promise<void> {
    if (!this.client) return;

    this.loading = true;
    try {
      const { tracks } = await this.client.getPlaylistTracks(slug);
      if (tracks.length) {
        this.store.setQueue(tracks, 0, 0, true, true);
        this.visible = true;
      }
    } catch {
      this.error = 'Плейлист недоступен';
    } finally {
      if (this.isConnected) this.loading = false;
    }
  }

  private onPlayPointerDown = (e: PointerEvent): void => {
    if (this.loading || e.button !== 0) return;

    if (this.mode === 'embed') {
      if (this.isEmbedPlaying()) {
        this.trySyncPlayPause();
      }
      return;
    }
    if (this.mode === 'full' && !this.current && this.album) return;

    if (this.trySyncPlayPause()) {
      e.preventDefault();
    }
  };

  private onPlayClick = (e: Event): void => {
    if (this.loading) return;

    if (this.mode === 'embed') {
      if (this.isEmbedPlaying()) {
        e.preventDefault();
        this.store.toggleFromUserGesture();
        return;
      }
      if (this.track) void this.playSlug(this.track);
      else if (this.album) void this.playAlbum(this.album);
      return;
    }
    if (this.mode === 'full' && !this.current && this.album) {
      void this.loadQueue(true);
      return;
    }

    if (this.store.getCurrentTrack() || this.store.engine.getAudioElement()?.src) {
      e.preventDefault();
      return;
    }

    void this.mediaPlayPausePublic();
  };

  /** Play/pause synchronously while the user-gesture is still active. */
  trySyncPlayPausePublic(): boolean {
    return this.trySyncPlayPause();
  }

  private trySyncPlayPause(): boolean {
    if (this.store.isPlaying()) {
      this.store.toggleFromUserGesture();
      return true;
    }
    if (this.store.getCurrentTrack() && this.store.engine.hasPlayableSource()) {
      this.store.toggleFromUserGesture();
      return true;
    }
    return false;
  }

  private isEmbedPlaying(): boolean {
    if (!this.track) return false;
    const audio = this.store.engine.peekAudioElement();
    if (!audio?.src || audio.paused || audio.ended) return false;
    const slug = this.current?.slug ?? this.store.queue[this.store.queueIndex]?.slug;
    return slug === this.track;
  }

  private repeatIcon(mode: RepeatMode): unknown {
    return mode === 'one' ? iconRepeatOne : iconRepeat;
  }

  private repeatAriaLabel(): string {
    if (this.store.repeat === 'one') return 'Повтор одного трека';
    if (this.store.repeat === 'all') return 'Повтор всего';
    return 'Повтор выключен';
  }

  private renderMiniOptions(): unknown {
    return html`
      <div class="mini-options">
        <button
          class="btn${this.store.shuffle ? ' is-active' : ''}"
          @click=${() => this.store.toggleShuffle()}
          aria-label="Случайный порядок"
          title="Случайный порядок"
        >${iconShuffle}</button>
        <button
          class="btn${this.store.repeat !== 'off' ? ' is-active' : ''}"
          @click=${() => this.store.cycleRepeat()}
          aria-label=${this.repeatAriaLabel()}
          title=${this.repeatAriaLabel()}
        >${this.repeatIcon(this.store.repeat)}</button>
      </div>
    `;
  }

  render() {
    if (this.mode === 'mini' && !this.visible && !this.current) {
      return html`<div class="player player--hidden" aria-hidden="true"></div>`;
    }

    if (this.mode === 'embed') {
      const source = this.embedSource;
      const live = this.hasLiveAudio();
      const duration = (live ? this.current?.durationMs : undefined) ?? source?.durationMs ?? 0;
      const showProgress = duration > 0 && !!source;
      const playingHere = this.isEmbedPlaying();
      return html`
        <div class="player player--embed" role="group" aria-label="Плеер">
          ${this.renderCover('md')}
          <div class="embed-body">
            <div class="embed-meta-row">
              <div class="meta">
                <div class="title">${this.displayTitle}</div>
                <div class="artist">${this.displayArtist}</div>
              </div>
              <div class="embed-controls">
                ${renderVisualizer(playingHere)}
                ${this.renderPlayButton('lg', playingHere)}
                ${this.renderHeart(this.track || source?.slug)}
              </div>
            </div>
            ${showProgress ? this.renderProgress(duration, true) : nothing}
            ${this.error ? html`<p class="error-text">${this.error}</p>` : nothing}
          </div>
        </div>
      `;
    }

    if (this.mode === 'full') {
      const duration = this.current?.durationMs ?? 0;
      const idle = !this.current && !this.loading;
      return html`
        <div class="player player--full" role="region" aria-label="Плеер альбома">
          ${this.loading ? html`<div class="state">Загрузка треков…</div>` : nothing}
          ${this.error ? html`<div class="state state--error">${this.error}</div>` : nothing}
          <div class="full-layout">
            <aside class="full-now">
              <div class="full-cover-wrap">
                ${this.renderCover('lg')}
                ${renderVisualizer(this.playing)}
              </div>
              <div class="meta meta--full${idle ? ' meta--idle' : ''}">
                <div class="meta-row">
                  <div class="meta-text">
                    <div class="title">${this.displayTitle}</div>
                    <div class="artist">${this.displayArtist}</div>
                  </div>
                  ${this.renderHeart(this.current?.slug)}
                </div>
              </div>
              <div class="controls controls--center">
                <button class="btn${this.store.shuffle ? ' is-active' : ''}" @click=${() => this.store.toggleShuffle()} aria-label="Случайный порядок" title="Случайный порядок">${iconShuffle}</button>
                <button class="btn" @click=${() => this.store.prev()} aria-label="Предыдущий">${iconPrev}</button>
                ${this.renderPlayButton('lg')}
                <button class="btn" @click=${() => this.store.next()} aria-label="Следующий">${iconNext}</button>
                <button class="btn${this.store.repeat !== 'off' ? ' is-active' : ''}" @click=${() => this.store.cycleRepeat()} aria-label=${this.repeatAriaLabel()} title=${this.repeatAriaLabel()}>${this.repeatIcon(this.store.repeat)}</button>
              </div>
              ${this.current ? this.renderProgress(duration) : nothing}
              ${idle && this.album
                ? html`<button class="btn-start-album" @click=${() => this.loadQueue(true)}>Слушать альбом</button>`
                : nothing}
            </aside>
            <div class="full-tracks">
              <h2 class="queue-title">Треки</h2>
              <ol class="queue queue--scroll" role="list">
                ${this.queue.length === 0 && !this.loading
                  ? html`<li class="queue-empty">Треков пока нет</li>`
                  : this.queue.map(
                      (t, i) => html`
                        <li
                          role="listitem"
                          class="queue-item${i === this.store.queueIndex ? ' is-active' : ''}"
                        >
                          <span class="queue-index" @click=${() => this.playQueueIndex(i)}>${i === this.store.queueIndex && this.playing ? html`<span class="queue-playing">${renderVisualizer(true)}</span>` : (t.trackNumber ?? i + 1)}</span>
                          <span class="queue-title-text" @click=${() => this.playQueueIndex(i)}>${t.title}</span>
                          <span class="queue-actions">
                            ${this.renderHeart(t.slug)}
                            <span class="queue-duration">${formatMs(t.durationMs)}</span>
                          </span>
                        </li>
                      `,
                    )}
              </ol>
            </div>
          </div>
        </div>
      `;
    }

    const duration = this.current?.durationMs ?? 0;
    return html`
      <div class="player player--mini" role="region" aria-label="Мини-плеер">
        <div class="mini-row">
          ${this.renderCover('sm')}
          <div class="meta">
            <div class="title">${this.displayTitle}</div>
            <div class="artist">${this.displayArtist}</div>
          </div>
          <div class="mini-viz">${renderVisualizer(this.playing)}</div>
          <div class="controls">
            ${this.renderHeart(this.current?.slug)}
            <button class="btn" @click=${() => this.store.prev()} aria-label="Предыдущий">${iconPrev}</button>
            ${this.renderPlayButton('md')}
            <button class="btn" @click=${() => this.store.next()} aria-label="Следующий">${iconNext}</button>
          </div>
          ${this.renderMiniOptions()}
          <label class="volume-wrap" aria-label="Громкость">
            ${iconVolume}
            <input
              class="volume"
              type="range"
              min="0"
              max="100"
              .value=${String(Math.round(this.store.volume * 100))}
              @input=${(e: Event) => this.store.setVolume(Number((e.target as HTMLInputElement).value) / 100)}
            />
          </label>
        </div>
        ${this.renderProgress(duration, true)}
      </div>
    `;
  }

  async playAlbumPublic(slug: string): Promise<void> {
    this.visible = true;
    await this.playAlbum(slug);
  }

  async playPlaylistPublic(slug: string): Promise<void> {
    this.visible = true;
    await this.playPlaylist(slug);
  }

  async restoreQueuePublic(albumSlug: string, trackSlug: string, queueSlugs: string[], queueIndex: number, positionMs: number, autoplay = true): Promise<void> {
    if (!this.client) return;
    this.visible = true;
    this.loading = true;
    try {
      const { data } = await this.client.getAlbumTracks(albumSlug);
      const bySlug = new Map(data.map((t) => [t.slug, t]));
      let queue = queueSlugs.map((s) => bySlug.get(s)).filter((t): t is TrackSummary => !!t);
      if (queue.length === 0) queue = data;
      const idx = Math.max(0, Math.min(queueIndex, queue.length - 1));
      this.store.restoreQueue(data, queue, idx, positionMs, autoplay);
      await this.store.waitUntilReady();
    } catch {
      await this.loadTrackPublic(trackSlug, positionMs, autoplay);
    } finally {
      if (this.isConnected) this.loading = false;
    }
  }

  async loadTrackPublic(slug: string, positionMs: number, autoplay = true): Promise<void> {
    if (!this.client) return;
    this.loading = true;
    this.error = '';
    try {
      const detail = withAbsoluteStream(this.apiBase, await this.client.getTrack(slug));
      this.store.loadTrack(detail, positionMs, autoplay);
      this.visible = true;
      await this.store.waitUntilReady();
    } catch {
      this.error = 'Трек недоступен';
    } finally {
      if (this.isConnected) this.loading = false;
    }
  }

  async restoreSessionPublic(): Promise<void> {
    if (this.restoreInFlight) {
      await this.restoreInFlight;
      return;
    }

    const audio = this.store.engine.getAudioElement();
    if (audio?.src && !audio.ended) {
      this.visible = true;
      return;
    }

    if (
      this.store.engine.hasActivePlayback() ||
      (this.store.engine.getCurrentTrack() && audio?.src)
    ) {
      this.visible = true;
      return;
    }
    const saved = this.store.loadSaved();
    if (!saved?.trackSlug) return;

    this.visible = true;
    this.loading = true;
    const autoplay = this.store.shouldAutoplayRestore(saved.wasPlaying === true);

    this.restoreInFlight = (async () => {
      try {
        if (saved.albumSlug && saved.queueSlugs?.length > 1) {
          await this.restoreQueuePublic(
            saved.albumSlug,
            saved.trackSlug,
            saved.queueSlugs,
            saved.queueIndex,
            saved.positionMs,
            autoplay,
          );
        } else {
          await this.loadTrackPublic(saved.trackSlug, saved.positionMs, autoplay);
        }
      } finally {
        if (this.isConnected) this.loading = false;
      }
    })();

    try {
      await this.restoreInFlight;
    } finally {
      this.restoreInFlight = null;
    }
  }

  /** @deprecated use loadTrackPublic or restoreSessionPublic */
  async resumePublic(slug: string, positionMs: number): Promise<void> {
    this.visible = true;
    await this.loadTrackPublic(slug, positionMs, true);
  }

  async togglePublic(): Promise<void> {
    await this.mediaPlayPausePublic();
  }

  async mediaPlayPausePublic(): Promise<void> {
    if (this.trySyncPlayPause()) return;

    await this.restoreSessionPublic();
    if (!this.store.getCurrentTrack()) return;
    await this.store.waitUntilReady();
    this.visible = true;
    this.store.toggleFromUserGesture();
  }

  async mediaStopPublic(): Promise<void> {
    await this.restoreSessionPublic();
    if (!this.store.getCurrentTrack()) return;
    await this.store.waitUntilReady();
    this.visible = true;
    await this.store.handleMediaStop();
  }

  showPublic(): void {
    this.visible = true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'om-player': OmPlayer;
  }
}

if (!customElements.get('om-player')) {
  customElements.define('om-player', OmPlayer);
}

import { html, LitElement, nothing, unsafeCSS } from 'lit';
import { OmApiClient } from './api/client';
import { withAbsoluteStream } from './api/resolve-url';
import type { TrackDetail, TrackSummary } from './api/types';
import {
  iconCheck,
  iconChevronDown,
  iconClose,
  iconGrip,
  iconHeart,
  iconHeartFilled,
  iconInfo,
  iconListMusic,
  iconMore,
  iconNext,
  iconPause,
  iconPlay,
  iconPlus,
  iconPrev,
  iconQueueNext,
  iconRepeat,
  iconRepeatOne,
  iconShuffle,
  iconSpinner,
  iconTrash,
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

function pluralTracks(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} трек`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} трека`;
  return `${n} треков`;
}

function getGlobalPlayerEl(): (HTMLElement & { showPublic?: () => void }) | null {
  return document.getElementById('om-global') as (HTMLElement & { showPublic?: () => void }) | null;
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
    heroContext: { type: Boolean, attribute: 'hero-context' },
    autoPlay: { type: Boolean, attribute: 'auto-play' },
    loading: { state: true },
    error: { state: true },
    visible: { state: true },
    seeking: { state: true },
    scrubMs: { state: true },
    previewTrack: { state: true },
    queueExpanded: { state: true },
    pageTracks: { state: true },
    queueNotice: { state: true },
    queueDragFrom: { state: true },
    queueDragOver: { state: true },
    trackInfoOpen: { state: true },
    trackInfoLoading: { state: true },
    trackInfoDetail: { state: true },
    trackInfoError: { state: true },
    trackInfoSlug: { state: true },
    queueRowActionsSlug: { state: true },
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
  declare heroContext: boolean;
  declare autoPlay: boolean;
  declare loading: boolean;
  declare error: string;
  declare visible: boolean;
  declare seeking: boolean;
  declare scrubMs: number;
  declare previewTrack: TrackSummary | null;
  declare queueExpanded: boolean;
  declare pageTracks: TrackSummary[];
  declare queueNotice: string;
  declare queueDragFrom: number | null;
  declare queueDragOver: number | null;
  declare trackInfoOpen: boolean;
  declare trackInfoLoading: boolean;
  declare trackInfoDetail: TrackDetail | null;
  declare trackInfoError: string;
  declare trackInfoSlug: string | null;
  declare queueRowActionsSlug: string | null;

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
    this.queueExpanded = false;
    this.pageTracks = [];
    this.queueNotice = '';
    this.queueDragFrom = null;
    this.queueDragOver = null;
    this.trackInfoOpen = false;
    this.trackInfoLoading = false;
    this.trackInfoDetail = null;
    this.trackInfoError = '';
    this.trackInfoSlug = null;
    this.queueRowActionsSlug = null;
  }

  private queueActionsOutsideHandler = (e: Event): void => {
    if (!this.queueRowActionsSlug || this.mode !== 'full') return;
    const target = e.target as Element;
    if (target.closest?.('.btn--queue-more')) return;
    if (target.closest?.('.queue--album .is-actions-open .queue-actions')) return;
    this.queueRowActionsSlug = null;
    this.requestUpdate();
  };

  private store = getPlayerStore();
  private favorites = getFavoritesStore();
  private client: OmApiClient | null = null;
  private unsub: (() => void) | null = null;
  private unsubFav: (() => void) | null = null;
  private restoreInFlight: Promise<void> | null = null;
  private playGestureHandled = false;
  private progressTimer: number | null = null;
  private heartClickHandler: ((e: Event) => void) | null = null;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;
  private sheetDragStartY = 0;
  private sheetDragOffset = 0;
  private sheetDragging = false;
  private queueDragPointerId: number | null = null;
  private queueDragCleanup: (() => void) | null = null;
  private readonly onCmdNext = (): void => {
    this.store.next();
  };
  private readonly onCmdPrev = (): void => {
    this.store.prev();
  };

  connectedCallback(): void {
    super.connectedCallback();
    this.client = new OmApiClient(this.apiBase);
    this.unsub = this.store.subscribe(() => {
      if (!this.isConnected) return;
      if (this.mode === 'mini' && (this.store.getCurrentTrack() || this.hasLiveAudio())) {
        this.visible = true;
      }
      if (this.mode === 'full' && this.trackInfoOpen) {
        const slug = this.current?.slug;
        if (slug && slug !== this.trackInfoSlug) {
          void this.loadTrackInfo(slug);
        }
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
      if (this.store.hasActiveSession() || this.hasHealthySession()) {
        this.visible = true;
      } else {
        const saved = this.store.loadSaved();
        if (saved?.trackSlug) {
          queueMicrotask(() => {
            if (
              !this.isConnected ||
              this.store.hasActiveSession() ||
              this.hasHealthySession()
            ) {
              return;
            }
            void this.restoreSessionPublic();
          });
        }
      }
    }
    if (this.store.getCurrentTrack()) this.visible = true;

    this.addEventListener('om:cmd-next', this.onCmdNext);
    this.addEventListener('om:cmd-prev', this.onCmdPrev);

    if (this.mode === 'full') {
      this.loadPageTracksFromPage();
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

    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (this.trackInfoOpen) {
        this.closeTrackInfo();
        return;
      }
      if (this.queueExpanded) this.closeQueueExpanded();
    };
    document.addEventListener('keydown', this.escapeHandler);
    if (this.mode === 'full') {
      document.addEventListener('click', this.queueActionsOutsideHandler, true);
    }
  }

  disconnectedCallback(): void {
    this.stopProgressTimer();
    this.removeEventListener('om:cmd-next', this.onCmdNext);
    this.removeEventListener('om:cmd-prev', this.onCmdPrev);
    if (this.heartClickHandler) {
      this.renderRoot.removeEventListener('click', this.heartClickHandler);
      this.heartClickHandler = null;
    }
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    document.removeEventListener('click', this.queueActionsOutsideHandler, true);
    this.clearQueueDrag();
    this.setBodyScrollLock(false);
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
    if (!this.client || !this.queueNeedsStreams(tracks)) {
      return tracks.map((t) => withAbsoluteStream(this.apiBase, t));
    }
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
      const startMs =
        tracks[index]?.slug === this.store.getCurrentTrack()?.slug
          ? this.store.getPositionMs()
          : 0;
      this.store.setQueue(tracks, index, startMs);
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

  private renderProgress(duration: number, compact = false, inline = false): unknown {
    const max = this.resolveScrubDurationMs() || duration || 1;
    const pos = this.displayPositionMs;
    const pct = Math.min(100, Math.max(0, (pos / max) * 100));
    const readonly = !this.canScrub();
    return html`
      <div class="progress-wrap${compact ? ' progress-wrap--compact' : ''}${inline ? ' progress-wrap--inline' : ''}${this.seeking ? ' is-scrubbing' : ''}${readonly ? ' progress-wrap--readonly' : ''}">
        ${inline ? nothing : html`<span class="time">${formatMs(pos)}</span>`}
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
        ${inline ? nothing : html`<span class="time">${formatMs(max)}</span>`}
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

  private loadPageTracksFromPage(): boolean {
    const sourceId = this.getAttribute('data-queue-source');
    if (!sourceId) return false;

    const node = document.getElementById(sourceId);
    if (!node?.textContent) return false;

    try {
      const tracks = JSON.parse(node.textContent) as TrackSummary[];
      if (!Array.isArray(tracks) || tracks.length === 0) return false;
      this.pageTracks = tracks;
      return true;
    } catch {
      return false;
    }
  }

  private async playPageTrack(index: number): Promise<void> {
    if (!this.client) return;

    if (this.pageTracks.length === 0 && !this.loadPageTracksFromPage()) return;

    this.queueRowActionsSlug = null;
    this.store.engine.unlockUserGesture();
    this.error = '';
    try {
      const tracks = await this.resolveQueueStreams(this.pageTracks);
      this.pageTracks = tracks;
      this.store.setQueue(tracks, index, 0, true, true);
      this.visible = true;
    } catch {
      if (this.isConnected) this.error = 'Трек недоступен';
    }
  }

  private showQueueNotice(message: string): void {
    this.queueNotice = message;
    this.requestUpdate();
    window.setTimeout(() => {
      if (this.queueNotice === message) {
        this.queueNotice = '';
        this.requestUpdate();
      }
    }, 2200);
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

    if (this.pageTracks.length === 0) {
      this.loadPageTracksFromPage();
    }

    if (this.pageTracks.length > 0) {
      if (autoStart) {
        await this.playPageTrack(0);
      }
      return;
    }

    if (this.hydrateQueueFromPage()) {
      if (autoStart && this.store.queue.length) {
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
        tracks = (await this.client.getAlbumTracks(this.album)).data.map((t) =>
          withAbsoluteStream(this.apiBase, t),
        );
      } else if (this.playlist) {
        tracks = (await this.client.getPlaylistTracks(this.playlist)).tracks;
      }
      this.store.originalQueue = tracks;
      this.store.queue = [...tracks];
      if (autoStart && tracks.length) {
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

  private async playAlbum(slug: string): Promise<void> {
    if (!this.client) return;

    this.loading = true;
    try {
      const { data } = await this.client.getAlbumTracks(slug);
      if (data.length) {
        const tracks = data.map((t) => withAbsoluteStream(this.apiBase, t));
        this.store.setQueue(tracks, 0, 0, true, true);
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
    if (e.button !== 0) return;
    this.store.engine.unlockUserGesture();

    if (this.mode === 'embed' && this.isEmbedPlaying()) {
      this.playGestureHandled = this.trySyncPlayPause();
      if (this.playGestureHandled) {
        e.preventDefault();
      }
    }
  };

  private onPlayClick = (e: Event): void => {
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

    if (this.playGestureHandled) {
      this.playGestureHandled = false;
      e.preventDefault();
      return;
    }

    e.preventDefault();
    if (this.loading) {
      void this.mediaPlayPausePublic();
      return;
    }

    void this.mediaPlayPausePublic();
  };

  /** Play/pause synchronously while the user-gesture is still active. */
  trySyncPlayPausePublic(): boolean {
    return this.trySyncPlayPause();
  }

  private audioReadyForToggle(): boolean {
    if (this.store.engine.hasPlayableSource()) return true;
    const audio = this.store.engine.peekAudioElement();
    return !!(
      audio?.src &&
      !audio.error &&
      !audio.ended &&
      audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
    );
  }

  private trySyncPlayPause(): boolean {
    if (this.store.isPlaying()) {
      this.store.toggleFromUserGesture();
      return true;
    }
    if (this.store.getCurrentTrack() && this.audioReadyForToggle()) {
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
        <button
          class="btn btn--queue-toggle${this.queueExpanded ? ' is-active' : ''}"
          @click=${() => this.toggleQueueExpanded()}
          aria-label=${this.queueExpanded ? 'Свернуть очередь' : 'Развернуть очередь'}
          aria-expanded=${this.queueExpanded ? 'true' : 'false'}
          title="Очередь"
        >${iconListMusic}</button>
      </div>
    `;
  }

  private toggleQueueExpanded(): void {
    this.queueExpanded = !this.queueExpanded;
    this.setBodyScrollLock(this.queueExpanded);
    if (this.queueExpanded) {
      this.setAttribute('queue-expanded', '');
    } else {
      this.removeAttribute('queue-expanded');
    }
    this.requestUpdate();
  }

  closeQueueExpanded(): void {
    if (!this.queueExpanded) return;
    this.clearQueueDrag();
    this.queueExpanded = false;
    this.setBodyScrollLock(false);
    this.removeAttribute('queue-expanded');
    this.requestUpdate();
  }

  private setBodyScrollLock(locked: boolean): void {
    if (this.mode !== 'mini') return;
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  private onSheetPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.sheetDragging = true;
    this.sheetDragStartY = e.clientY;
    this.sheetDragOffset = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  private onSheetPointerMove(e: PointerEvent): void {
    if (!this.sheetDragging) return;
    const delta = e.clientY - this.sheetDragStartY;
    this.sheetDragOffset = Math.max(0, delta);
    const sheet = this.renderRoot.querySelector('.queue-sheet') as HTMLElement | null;
    if (sheet) {
      sheet.style.setProperty('--sheet-drag', `${this.sheetDragOffset}px`);
    }
  }

  private onSheetPointerUp(e: PointerEvent): void {
    if (!this.sheetDragging) return;
    this.sheetDragging = false;
    const sheet = this.renderRoot.querySelector('.queue-sheet') as HTMLElement | null;
    if (sheet) sheet.style.removeProperty('--sheet-drag');
    if (this.sheetDragOffset > 80) this.closeQueueExpanded();
    this.sheetDragOffset = 0;
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }

  private closeTrackInfo(): void {
    this.trackInfoOpen = false;
    this.trackInfoDetail = null;
    this.trackInfoSlug = null;
    this.trackInfoError = '';
    this.trackInfoLoading = false;
    this.requestUpdate();
  }

  private toggleTrackInfo(slug: string): void {
    if (this.trackInfoOpen && this.trackInfoSlug === slug) {
      this.closeTrackInfo();
      return;
    }
    this.trackInfoOpen = true;
    void this.loadTrackInfo(slug);
  }

  private async loadTrackInfo(slug: string): Promise<void> {
    if (!this.client) return;
    this.trackInfoSlug = slug;
    this.trackInfoLoading = true;
    this.trackInfoError = '';
    this.requestUpdate();
    try {
      const detail = withAbsoluteStream(this.apiBase, await this.client.getTrack(slug));
      if (this.trackInfoSlug !== slug) return;
      this.trackInfoDetail = detail;
    } catch {
      if (this.trackInfoSlug === slug) {
        this.trackInfoDetail = null;
        this.trackInfoError = 'Не удалось загрузить информацию о треке';
      }
    } finally {
      if (this.trackInfoSlug === slug) {
        this.trackInfoLoading = false;
        this.requestUpdate();
      }
    }
  }

  private renderTrackInfoButton(slug: string): unknown {
    const active = this.trackInfoOpen && this.trackInfoSlug === slug;
    return html`
      <button
        type="button"
        class="btn btn--track-info${active ? ' is-active' : ''}"
        @click=${(e: Event) => {
          e.stopPropagation();
          this.toggleTrackInfo(slug);
        }}
        aria-label="О треке"
        title="О треке"
        aria-pressed=${active ? 'true' : 'false'}
      >${iconInfo}</button>
    `;
  }

  private renderTrackInfoSections(detail: TrackDetail): unknown {
    const credits = detail.credits?.trim() ?? '';
    const description = detail.description?.trim() ?? '';
    const lyrics = detail.lyrics?.trim() ?? '';
    if (!credits && !description && !lyrics) {
      return html`<p class="track-info-panel__state">Нет дополнительной информации</p>`;
    }
    return html`
      ${credits
        ? html`<section class="track-info-section"><h4 class="track-info-section__title">Участники</h4><p class="track-info-section__text">${credits}</p></section>`
        : nothing}
      ${description
        ? html`<section class="track-info-section"><h4 class="track-info-section__title">Описание</h4><p class="track-info-section__text">${description}</p></section>`
        : nothing}
      ${lyrics
        ? html`<section class="track-info-section"><h4 class="track-info-section__title">Текст</h4><pre class="track-info-lyrics">${lyrics}</pre></section>`
        : nothing}
    `;
  }

  private renderTrackInfoPanel(): unknown {
    if (!this.trackInfoOpen) return nothing;
    const detail = this.trackInfoDetail;
    return html`
      <aside class="track-info-panel" role="complementary" aria-label="О треке">
        <div class="track-info-panel__header">
          <h3 class="track-info-panel__title">О треке</h3>
          <button type="button" class="btn btn--track-info-close" @click=${() => this.closeTrackInfo()} aria-label="Закрыть">${iconClose}</button>
        </div>
        ${this.trackInfoLoading ? html`<p class="track-info-panel__state">Загрузка…</p>` : nothing}
        ${this.trackInfoError ? html`<p class="track-info-panel__state track-info-panel__state--error">${this.trackInfoError}</p>` : nothing}
        ${!this.trackInfoLoading && detail ? this.renderTrackInfoSections(detail) : nothing}
      </aside>
    `;
  }

  private toggleQueueRowActions(slug: string, e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    this.queueRowActionsSlug = this.queueRowActionsSlug === slug ? null : slug;
  }

  private renderAlbumTrackList(): unknown {
    const tracks = this.pageTracks;
    return html`
      <ol class="queue queue--scroll queue--album" role="list">
        ${tracks.length === 0 && !this.loading
          ? html`<li class="queue-empty">Треков пока нет</li>`
          : tracks.map((t, i) => {
              const isActive = t.slug === this.current?.slug;
              const inQueue = this.store.hasInQueue(t.slug);
              const actionsOpen = this.queueRowActionsSlug === t.slug;
              return html`
                <li role="listitem" class="queue-item${isActive ? ' is-active' : ''}${actionsOpen ? ' is-actions-open' : ''}">
                  <span class="queue-index" @pointerdown=${() => this.store.engine.unlockUserGesture()} @click=${() => this.playPageTrack(i)}>
                    ${isActive && this.playing
                      ? html`<span class="queue-playing">${renderVisualizer(true)}</span>`
                      : (t.trackNumber ?? i + 1)}
                  </span>
                  <button type="button" class="queue-title-btn" @pointerdown=${() => this.store.engine.unlockUserGesture()} @click=${() => this.playPageTrack(i)}>
                    <span class="queue-title-text">${t.title}</span>
                  </button>
                  <div class="queue-row-tail">
                    <span class="queue-duration">${formatMs(t.durationMs)}</span>
                    <button
                      type="button"
                      class="btn btn--queue-more"
                      @click=${(e: Event) => this.toggleQueueRowActions(t.slug, e)}
                      aria-label="Действия с треком"
                      aria-expanded=${actionsOpen ? 'true' : 'false'}
                    >${iconMore}</button>
                    <span class="queue-actions">
                      <span class="queue-action-slot">
                        <button
                          type="button"
                          class="btn btn--queue-add${inQueue ? ' is-added' : ''}"
                          @click=${(e: Event) => {
                            e.stopPropagation();
                            if (inQueue) void this.removeTrackFromQueue(t.slug);
                            else void this.addTrackToQueue(t, false);
                          }}
                          aria-label=${inQueue ? 'Убрать из очереди' : 'Добавить в очередь'}
                          title=${inQueue ? 'Убрать из очереди' : 'В очередь'}
                        >${inQueue ? iconCheck : iconPlus}</button>
                      </span>
                      <span class="queue-action-slot">
                        <button
                          type="button"
                          class="btn btn--queue-next"
                          @click=${(e: Event) => {
                            e.stopPropagation();
                            void this.addTrackToQueue(t, true);
                          }}
                          aria-label="Играть следующим"
                          title="Следующим"
                        >${iconQueueNext}</button>
                      </span>
                      <span class="queue-action-slot">${this.renderTrackInfoButton(t.slug)}</span>
                      <span class="queue-action-slot">${this.renderHeart(t.slug)}</span>
                    </span>
                  </div>
                </li>
              `;
            })}
      </ol>
    `;
  }

  private async addTrackToQueue(track: TrackSummary, next: boolean): Promise<void> {
    if (!this.client) return;
    try {
      const detail = track.stream?.url
        ? withAbsoluteStream(this.apiBase, track)
        : withAbsoluteStream(this.apiBase, await this.client.getTrack(track.slug));
      const wasInQueue = this.store.hasInQueue(track.slug);
      const ok = next ? this.store.playNext(detail) : this.store.addToQueue(detail);
      if (ok) {
        this.visible = true;
        if (next) {
          this.showQueueNotice(wasInQueue ? 'Перемещено вверх' : 'Будет следующим');
        } else {
          this.showQueueNotice('Добавлено в очередь');
        }
        getGlobalPlayerEl()?.showPublic?.();
      }
    } catch {
      this.showQueueNotice('Не удалось добавить');
    }
  }

  private removeTrackFromQueue(slug: string): void {
    if (this.store.removeBySlug(slug)) {
      this.showQueueNotice('Убрано из очереди');
      this.requestUpdate();
    }
  }

  private clearQueueDrag(): void {
    this.queueDragCleanup?.();
    this.queueDragCleanup = null;
    this.queueDragPointerId = null;
    this.queueDragFrom = null;
    this.queueDragOver = null;
  }

  private getQueueDragPreview(): number[] {
    const indices = this.queue.map((_, i) => i);
    const from = this.queueDragFrom;
    const to = this.queueDragOver;
    if (from === null || to === null || from === to) return indices;

    const result = [...indices];
    const [moved] = result.splice(from, 1);
    const insertAt = Math.max(0, Math.min(to, result.length));
    result.splice(insertAt, 0, moved);
    return result;
  }

  private getQueueListIndices(upcomingOnly = false): number[] {
    const order = this.queueDragFrom !== null ? this.getQueueDragPreview() : this.queue.map((_, i) => i);
    if (!upcomingOnly) return order;
    return order.filter((i) => i >= this.store.queueIndex);
  }

  private resolveQueueDragIndex(clientY: number): number | null {
    const rows = this.renderRoot.querySelectorAll<HTMLElement>('[data-queue-index]');
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) {
        return Number(row.dataset.queueIndex);
      }
    }
    if (rows.length > 0) {
      return rows.length;
    }
    return null;
  }

  private onQueueDragStart(e: PointerEvent, index: number): void {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    this.clearQueueDrag();
    this.queueDragFrom = index;
    this.queueDragOver = index;
    this.queueDragPointerId = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent): void => {
      if (ev.pointerId !== this.queueDragPointerId) return;
      const over = this.resolveQueueDragIndex(ev.clientY);
      if (over === null) return;
      const changed = over !== this.queueDragOver;
      this.queueDragOver = over;
      if (changed && typeof navigator.vibrate === 'function') {
        navigator.vibrate(10);
      }
      this.requestUpdate();
    };

    const onUp = (ev: PointerEvent): void => {
      if (ev.pointerId !== this.queueDragPointerId) return;
      const from = this.queueDragFrom;
      const to = this.queueDragOver;
      this.clearQueueDrag();
      if (from !== null && to !== null && from !== to) {
        this.store.moveQueueItem(from, to);
      }
      this.requestUpdate();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    this.queueDragCleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }

  private renderQueueList(options: { removable?: boolean; draggable?: boolean; upcomingOnly?: boolean } = {}): unknown {
    const { removable = false, draggable = false, upcomingOnly = false } = options;
    const indices = this.getQueueListIndices(upcomingOnly);
    const isDragging = this.queueDragFrom !== null;

    return html`
      <ol class="queue queue--scroll${isDragging ? ' queue--is-dragging' : ''}" role="list">
        ${indices.length === 0 && !this.loading
          ? html`<li class="queue-empty">${upcomingOnly ? 'Следующих треков нет' : 'Очередь пуста'}</li>`
          : indices.map((i, pos) => {
              const t = this.queue[i];
              if (!t) return nothing;
              const isCurrent = i === this.store.queueIndex;
              const dropTarget = isDragging && this.queueDragOver === i && this.queueDragFrom !== i;
              const orderLabel = upcomingOnly
                ? i - this.store.queueIndex + 1
                : (t.trackNumber ?? i + 1);
              return html`
              <li
                role="listitem"
                data-queue-index=${i}
                class="queue-item${draggable ? ' queue-item--draggable' : ''}${isCurrent ? ' is-active' : ''}${this.queueDragFrom === i ? ' is-dragging' : ''}${dropTarget ? ' is-drag-over' : ''}"
              >
                ${draggable
                  ? html`
                      <button
                        type="button"
                        class="btn queue-drag-handle"
                        aria-label="Переместить"
                        @pointerdown=${(e: PointerEvent) => this.onQueueDragStart(e, i)}
                      >${iconGrip}</button>
                    `
                  : nothing}
                <span class="queue-index" @click=${() => this.playQueueIndex(i)}>
                  ${isCurrent && this.playing
                    ? html`<span class="queue-playing">${renderVisualizer(true)}</span>`
                    : orderLabel}
                </span>
                <span class="queue-title-text" @click=${() => this.playQueueIndex(i)}>${t.title}</span>
                <span class="queue-actions">
                  ${this.renderHeart(t.slug)}
                  ${removable && this.queue.length > 1
                    ? html`
                        <button
                          type="button"
                          class="btn btn--queue-remove"
                          @click=${(e: Event) => { e.stopPropagation(); this.store.removeAt(i); }}
                          aria-label="Убрать из очереди"
                          title="Убрать"
                        >${iconTrash}</button>
                      `
                    : nothing}
                  <span class="queue-duration">${formatMs(t.durationMs)}</span>
                </span>
              </li>
            `;
            })}
      </ol>
    `;
  }

  private renderQueueSheet(): unknown {
    if (!this.queueExpanded || this.mode !== 'mini') return nothing;

    const duration = this.current?.durationMs ?? 0;
    const queueCount = this.queue.length;

    return html`
      <div
        class="queue-backdrop"
        @click=${() => this.closeQueueExpanded()}
        aria-hidden="true"
      ></div>
      <div
        class="queue-sheet"
        role="dialog"
        aria-label="Очередь воспроизведения"
        aria-modal="true"
      >
        <div
          class="queue-sheet__handle"
          @pointerdown=${this.onSheetPointerDown}
          @pointermove=${this.onSheetPointerMove}
          @pointerup=${this.onSheetPointerUp}
          @pointercancel=${this.onSheetPointerUp}
        >
          <span class="queue-sheet__grab" aria-hidden="true"></span>
        </div>
        <button
          type="button"
          class="btn btn--sheet-close"
          @click=${() => this.closeQueueExpanded()}
          aria-label="Закрыть"
        >${iconChevronDown}</button>

        ${this.queueNotice
          ? html`<div class="queue-toast" role="status">${this.queueNotice}</div>`
          : nothing}

        <div class="queue-sheet__body">
          <div class="queue-sheet__now">
            <div class="queue-sheet__cover-wrap">
              ${this.renderCover('lg')}
              <div class="cover-viz">${renderVisualizer(this.playing)}</div>
              <div class="cover-heart">${this.renderHeart(this.current?.slug)}</div>
            </div>
            <div class="meta meta--sheet">
              <div class="title">${this.displayTitle}</div>
              <div class="artist">${this.displayArtist}</div>
            </div>
            <div class="controls controls--center">
              <button class="btn${this.store.shuffle ? ' is-active' : ''}" @click=${() => this.store.toggleShuffle()} aria-label="Случайный порядок">${iconShuffle}</button>
              <button class="btn" @click=${() => this.store.prev()} aria-label="Предыдущий">${iconPrev}</button>
              ${this.renderPlayButton('lg')}
              <button class="btn" @click=${() => this.store.next()} aria-label="Следующий">${iconNext}</button>
              <button class="btn${this.store.repeat !== 'off' ? ' is-active' : ''}" @click=${() => this.store.cycleRepeat()} aria-label=${this.repeatAriaLabel()}>${this.repeatIcon(this.store.repeat)}</button>
            </div>
            ${this.current ? this.renderProgress(duration) : nothing}
          </div>

          <div class="queue-sheet__list">
            <div class="queue-sheet__list-header">
              <h2 class="queue-title">Очередь</h2>
              ${queueCount > 0
                ? html`<span class="queue-count">${pluralTracks(queueCount)}</span>`
                : nothing}
            </div>
            ${this.renderQueueList({ removable: true, draggable: true })}
          </div>
        </div>
      </div>
    `;
  }

  private onMiniMetaClick(): void {
    if (this.current) this.toggleQueueExpanded();
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
      const hero = this.heroContext;
      const showMeta = !hero || !!this.current;
      return html`
        <div class="player player--full${hero ? ' player--hero-context' : ''}" role="region" aria-label="Плеер альбома">
          ${this.loading && !this.current && this.pageTracks.length === 0 ? html`<div class="state">Загрузка треков…</div>` : nothing}
          ${this.error ? html`<div class="state state--error">${this.error}</div>` : nothing}
          <div class="full-layout${this.trackInfoOpen ? ' full-layout--info-open' : ''}">
            <section class="full-column full-column--now">
              <h2 class="queue-title full-layout__heading">Сейчас играет</h2>
              <aside class="full-now">
                ${hero
                  ? nothing
                  : html`
                      <div class="full-cover-wrap">
                        ${this.renderCover('lg')}
                        ${renderVisualizer(this.playing)}
                      </div>
                    `}
                ${showMeta
                  ? html`
                      <div class="meta meta--full${idle ? ' meta--idle' : ''}">
                        <div class="meta-row">
                          <div class="meta-text">
                            <div class="title">${this.displayTitle}</div>
                            <div class="artist">${this.displayArtist || '\u00a0'}</div>
                          </div>
                          <div class="meta-actions">
                            <span class="meta-action-slot meta-action-slot--info">
                              ${this.current ? this.renderTrackInfoButton(this.current.slug) : nothing}
                            </span>
                            <span class="meta-action-slot meta-action-slot--heart">
                              ${this.renderHeart(this.current?.slug)}
                            </span>
                          </div>
                        </div>
                      </div>
                    `
                  : nothing}
                <div class="full-now__deck">
                  <div class="controls controls--center">
                    <button class="btn${this.store.shuffle ? ' is-active' : ''}" @click=${() => this.store.toggleShuffle()} aria-label="Случайный порядок" title="Случайный порядок">${iconShuffle}</button>
                    <button class="btn" @click=${() => this.store.prev()} aria-label="Предыдущий">${iconPrev}</button>
                    ${this.renderPlayButton('lg')}
                    <button class="btn" @click=${() => this.store.next()} aria-label="Следующий">${iconNext}</button>
                    <button class="btn${this.store.repeat !== 'off' ? ' is-active' : ''}" @click=${() => this.store.cycleRepeat()} aria-label=${this.repeatAriaLabel()} title=${this.repeatAriaLabel()}>${this.repeatIcon(this.store.repeat)}</button>
                  </div>
                  <div class="full-now__progress">
                    ${this.current
                      ? this.renderProgress(duration)
                      : html`<div class="full-now__progress-placeholder" aria-hidden="true"></div>`}
                  </div>
                  ${idle && this.album && !hero
                    ? html`<button class="btn-start-album" @pointerdown=${() => this.store.engine.unlockUserGesture()} @click=${() => this.loadQueue(true)}>Слушать альбом</button>`
                    : nothing}
                </div>
              </aside>
            </section>
            <section class="full-column full-column--tracks">
              <h2 class="queue-title full-layout__heading">Треки</h2>
              <div class="full-tracks">
                ${this.renderAlbumTrackList()}
              </div>
            </section>
            ${this.renderTrackInfoPanel()}
          </div>
        </div>
      `;
    }

    const duration = this.current?.durationMs ?? 0;
    if (this.queueExpanded) {
      return html`${this.renderQueueSheet()}`;
    }

    return html`
      <div class="player player--mini" role="region" aria-label="Мини-плеер">
        <div class="mini-row">
          <button type="button" class="mini-cover-btn" @click=${() => this.onMiniMetaClick()} aria-label="Развернуть плеер">
            ${this.renderCover('sm')}
          </button>
          <button type="button" class="mini-meta-btn" @click=${() => this.onMiniMetaClick()} aria-label="Развернуть плеер">
            <div class="meta">
              <div class="title">${this.displayTitle}</div>
              <div class="artist">${this.displayArtist}</div>
            </div>
          </button>
          ${this.current ? this.renderProgress(duration, true, true) : nothing}
          <div class="mini-viz">${renderVisualizer(this.playing)}</div>
          <div class="mini-toolbar">
            <div class="controls">
              ${this.renderHeart(this.current?.slug)}
              <button class="btn" @click=${() => this.store.prev()} aria-label="Предыдущий">${iconPrev}</button>
              ${this.renderPlayButton('md')}
              <button class="btn" @click=${() => this.store.next()} aria-label="Следующий">${iconNext}</button>
            </div>
            ${this.renderMiniOptions()}
          </div>
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
      </div>
    `;
  }

  unlockPlaybackPublic(): void {
    this.store.engine.unlockUserGesture();
  }

  playAlbumPublic(slug: string, pageTracks?: TrackSummary[]): void {
    this.store.engine.unlockUserGesture();
    this.visible = true;

    if (pageTracks?.length) {
      const tracks = pageTracks.map((t) => withAbsoluteStream(this.apiBase, t));
      if (tracks.some((t) => t.stream?.url)) {
        this.store.setQueue(tracks, 0, 0, true, true);
        return;
      }
    }

    void this.playAlbum(slug);
  }

  async playPlaylistPublic(slug: string): Promise<void> {
    this.store.engine.unlockUserGesture();
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

  private hasHealthySession(): boolean {
    const saved = this.store.loadSaved();
    const track = this.store.getCurrentTrack();
    const audio = this.store.engine.peekAudioElement();
    if (!saved?.trackSlug || !track || track.slug !== saved.trackSlug) {
      return false;
    }
    if (!audio?.src || audio.ended || audio.error) {
      return false;
    }
    return this.store.engine.hasPlayableSource() || audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }

  async restoreSessionPublic(): Promise<void> {
    if (this.restoreInFlight) {
      await this.restoreInFlight;
      return;
    }

    if (this.store.hasActiveSession()) {
      this.visible = true;
      return;
    }

    const saved = this.store.loadSaved();
    if (this.hasHealthySession()) {
      this.visible = true;
      await this.store.waitUntilReady();
      if (!this.store.isNavigating()) {
        this.store.syncSavedPlaybackPosition();
      }
      return;
    }
    if (!saved?.trackSlug) return;
    const trackSlug = saved.trackSlug;

    this.visible = true;
    this.loading = true;
    const autoplay = this.store.shouldAutoplayRestore(saved.wasPlaying === true);

    this.restoreInFlight = (async () => {
      try {
        if (saved.albumSlug && saved.queueSlugs?.length > 1) {
          await this.restoreQueuePublic(
            saved.albumSlug,
            trackSlug,
            saved.queueSlugs,
            saved.queueIndex,
            saved.positionMs,
            autoplay,
          );
        } else {
          await this.loadTrackPublic(trackSlug, saved.positionMs, autoplay);
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
    if (this.restoreInFlight) {
      await this.restoreInFlight;
    }
    this.store.engine.unlockUserGesture();
    if (this.trySyncPlayPause()) return;

    await this.restoreSessionPublic();
    if (!this.store.getCurrentTrack()) return;
    await this.store.waitUntilReady();
    this.visible = true;

    const toggled = this.store.toggleFromUserGesture();
    if (toggled !== null) return;

    const track = this.store.getCurrentTrack();
    if (!track) return;
    const saved = this.store.loadSaved();
    const positionMs = this.store.getPositionMs() || saved?.positionMs || 0;
    await this.loadTrackPublic(track.slug, positionMs, true);
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

  hasLiveSessionPublic(): boolean {
    return this.store.hasActiveSession();
  }

  completeNavigationPublic(): void {
    this.store.completeNavigation();
  }

  toggleQueueExpandedPublic(): void {
    this.toggleQueueExpanded();
  }

  closeQueueExpandedPublic(): void {
    this.closeQueueExpanded();
  }

  async addToQueuePublic(slug: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const detail = withAbsoluteStream(this.apiBase, await this.client.getTrack(slug));
      const added = this.store.addToQueue(detail);
      if (added) {
        this.visible = true;
        this.showQueueNotice('Добавлено в очередь');
        this.dispatchEvent(new CustomEvent('om:queue-add', { bubbles: true, composed: true, detail: { track: detail } }));
      }
      return added;
    } catch {
      return false;
    }
  }

  async addToQueueNextPublic(slug: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const detail = withAbsoluteStream(this.apiBase, await this.client.getTrack(slug));
      const wasInQueue = this.store.hasInQueue(slug);
      const added = this.store.playNext(detail);
      if (added) {
        this.visible = true;
        this.showQueueNotice(wasInQueue ? 'Перемещено вверх' : 'Будет следующим');
        this.dispatchEvent(new CustomEvent('om:queue-add', { bubbles: true, composed: true, detail: { track: detail, next: true } }));
      }
      return added;
    } catch {
      return false;
    }
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

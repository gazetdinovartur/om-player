export interface StreamInfo {
  url: string;
  mimeType: string;
  expiresAt: string | null;
}

export interface TrackSummary {
  slug: string;
  title: string;
  artistName: string;
  albumSlug?: string | null;
  albumTitle?: string | null;
  /** ISO date (Y-m-d) from album release */
  albumReleasedAt?: string | null;
  durationMs: number;
  type: string;
  coverUrl?: string | null;
  coverThumbUrl?: string | null;
  trackNumber?: number | null;
  stream?: StreamInfo;
}

export interface TrackDetail extends TrackSummary {
  description?: string | null;
  credits?: string | null;
  lyrics?: string | null;
  genre?: string | null;
  album?: { slug: string; title: string; releasedAt?: string | null; coverUrl?: string | null } | null;
  stream: StreamInfo;
}

export interface AlbumTracksResponse {
  album: {
    slug: string;
    title: string;
    artistName?: string;
    releasedAt?: string | null;
    coverUrl?: string | null;
    coverThumbUrl?: string | null;
  };
  data: TrackSummary[];
}

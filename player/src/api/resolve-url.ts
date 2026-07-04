import type { TrackSummary } from './types';

/** Turn /media/... stream paths into absolute URLs (required for embed on external sites). */
export function resolveMediaUrl(apiBase: string, url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;

  try {
    const origin = new URL(apiBase.endsWith('/') ? apiBase : `${apiBase}/`).origin;
    return new URL(url.startsWith('/') ? url : `/${url}`, `${origin}/`).href;
  } catch {
    return url;
  }
}

export function withAbsoluteStream<T extends TrackSummary>(apiBase: string, track: T): T {
  const streamUrl = track.stream?.url;
  if (!streamUrl) return track;

  const absolute = resolveMediaUrl(apiBase, streamUrl);
  if (!absolute || absolute === streamUrl) return track;

  return {
    ...track,
    stream: { ...track.stream!, url: absolute },
  };
}

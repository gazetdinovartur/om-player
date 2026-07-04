import type { AlbumTracksResponse, TrackDetail } from './types';

export class OmApiClient {
  constructor(private readonly baseUrl: string) {}

  async getTrack(slug: string): Promise<TrackDetail> {
    const res = await fetch(`${this.baseUrl}/tracks/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('Track not found');
    return res.json();
  }

  async getAlbumTracks(slug: string): Promise<AlbumTracksResponse> {
    const res = await fetch(`${this.baseUrl}/albums/${encodeURIComponent(slug)}/tracks`);
    if (!res.ok) throw new Error('Album not found');
    return res.json();
  }

  async getPlaylistTracks(slug: string): Promise<{ tracks: AlbumTracksResponse['data'] }> {
    const res = await fetch(`${this.baseUrl}/playlists/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('Playlist not found');
    return res.json();
  }
}

# Метаданные трека

Как OmPlayer получает и использует информацию о треке, альбоме и обложке.

---

## Цепочка загрузки

```
GET /api/v1/tracks/{slug}
        │
        ▼
   OmApiClient.getTrack()
        │
        ▼
   PlayerStore.playTrack()  →  AudioEngine.load()
        │
        ├── audio.src = stream.url
        ├── UI: title, artist, cover
        └── Media Session: lock screen metadata
```

Для альбома:

```
GET /api/v1/albums/{slug}/tracks
        │
        ▼
   OmApiClient.getAlbumTracks()
        │
        ▼
   PlayerStore.setQueue(tracks, startIndex)
```

---

## Поля API → плеер

### TrackSummary (список и очередь)

| Поле API | Источник (Symfony) | Использование в плеере |
|----------|-------------------|------------------------|
| `slug` | Track.slug | Идентификатор, избранное, session restore |
| `title` | Track.title / ID3 | UI, Media Session |
| `artistName` | Track.artistName / ID3 | UI, Media Session |
| `albumSlug` | Album.slug | Навигация, очередь |
| `albumTitle` | Album.title / ID3 | UI, Media Session `album` |
| `albumReleasedAt` | Album.releasedAt (ID3 year) | Доступно в данных; год на UI хоста |
| `durationMs` | Track.durationMs / ID3 | Прогресс-бар, `setPositionState` |
| `type` | Track.type enum | studio / live / demo |
| `coverUrl` | Track или Album cover | UI, Media Session artwork 512px |
| `coverThumbUrl` | Thumb variant | UI preview, artwork 128px |
| `trackNumber` | ID3 TRCK | Очередь full mode |
| `stream.url` | `/media/audio/...` | `HTMLAudioElement.src` |
| `stream.mimeType` | audio/mpeg | Content-Type hint |

### TrackDetail (одиночный трек)

Дополнительно к summary:

| Поле | Источник | Использование |
|------|----------|---------------|
| `description` | Admin / manual | Хост-страница |
| `credits` | Admin | Хост-страница |
| `lyrics` | Admin / ID3 | Хост-страница |
| `genre` | ID3 TCON | Доступно в API |
| `album.releasedAt` | Album.releasedAt | Год релиза альбома |
| `album.coverUrl` | Album cover | Fallback обложки |
| `publishedAt` | Track.createdAt | API only |

### AlbumTracksResponse.album

При загрузке альбома объект `album` содержит:

- `slug`, `title`, `artistName`
- `releasedAt` — дата релиза (ISO `Y-m-d`)
- `coverUrl`, `coverThumbUrl`

Embed/full mode может использовать атрибуты хоста до ответа API:

```html
<om-player
  mode="full"
  album="album-slug"
  album-title="Название"
  album-artist="Артист"
  album-cover="/media/covers/album.jpg"
></om-player>
```

---

## Откуда берутся данные на backend

1. **Загрузка MP3** → `AudioMetadataExtractor` (getID3): title, artist, album, year, genre, embedded cover
2. **CatalogResolver** → создаёт/связывает Artist, Album
3. **Year** → `Album.releasedAt` (не на Track)
4. **Cover** → track cover или fallback на album cover (`getEffectiveCoverPath()`)
5. **TrackApiSerializer** → JSON для API

---

## Media Session (lock screen)

При старте воспроизведения `AudioEngine.updateMediaSession()`:

```typescript
new MediaMetadata({
  title: track.title,
  artist: track.artistName,
  album: track.albumTitle ?? '',
  artwork: [{ src: coverUrl, sizes: '512x512' }, ...]
});
```

На iOS/Android это даёт обложку и управление с lock screen / Control Center.

---

## Session restore

Ключ `localStorage`: `om:playback:v1`

Сохраняется: slug трека, позиция, очередь, shuffle/repeat.  
При возврате на сайт mini-player вызывает `restoreSessionPublic()` → повторный `GET /tracks/{slug}` или `/albums/{slug}/tracks` **только если** нет активного `audio.src` (правило continuous playback).

---

## Проверка

```bash
# Один трек — все поля detail
curl -s http://127.0.0.1:8000/api/v1/tracks/{slug} | jq .

# Альбом — album meta + tracks со stream
curl -s http://127.0.0.1:8000/api/v1/albums/{slug}/tracks | jq .
```

Ожидаемые поля: `title`, `artistName`, `albumTitle`, `albumReleasedAt`, `coverUrl`, `stream.url`.

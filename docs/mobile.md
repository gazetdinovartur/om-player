# OmPlayer на мобильных устройствах

Как пользоваться плеером с телефона и что работает «из коробки».

---

## Для слушателя

### Запуск

1. Нажмите **Play** на карточке трека или в mini-player внизу экрана
2. На iOS первый tap может потребоваться для **разблокировки autoplay** — это ограничение Safari, не баг плеера
3. Переключайте страницы сайта — **музыка продолжит играть**, если сайт использует Turbo/SPA с persistent shell

### Управление

| Действие | Как |
|----------|-----|
| Play / Pause | Кнопка в центре mini-player или embed |
| Следующий / предыдущий | Стрелки в mini-player (full mode) |
| Перемотка | Потяните ползунок прогресса |
| Громкость | Кнопка volume (desktop; на iOS — системная) |
| Избранное | Сердечко на embed/full |

### Экран блокировки

После начала воспроизведения на lock screen отображаются:

- **Название трека**
- **Артист**
- **Альбом**
- **Обложка**

Управление: play/pause, next/prev (если есть очередь), перемотка с наушников.

Работает через **Media Session API** — без отдельного нативного приложения.

### Наушники и CarPlay

Кнопки на гarniture и руль автомобиля мапятся на play/pause/next/prev через Media Session.

---

## Для разработчика

### Обязательные атрибуты audio

```html
<audio id="om-audio-engine" playsinline hidden preload="auto"></audio>
```

- `playsinline` — не уходит в fullscreen video-mode на iOS
- `hidden` — нативные controls скрыты, UI у Web Component

### Touch UX

- Кнопки play/next — минимум **44×44 px** touch target
- Progress bar — `pointerdown` + drag, не только click
- Mini-player — fixed footer, `safe-area-inset-bottom` для iPhone с home indicator

### Viewport

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

### PWA / offline

Service worker — на уровне **хост-сайта** (`sw.js`), не внутри `@om/player`.

Стратегия для «Живая Музыка Ом»:

- Кэш shell + player JS
- Аудио — network-first или cache-on-play (см. `docs/09-offline-and-pwa.md` в корне monorepo)

### iOS quirks

1. **Autoplay** — только после user gesture; используйте `@pointerdown` на play
2. **Background audio** — нужен активный Media Session + не паузить audio при Turbo render
3. **Low Power Mode** — может ограничить prefetch; stream URL должен быть прямым и с Range support

### Android

Chrome и Samsung Internet полностью поддерживают Media Session и `playsinline`.

---

## Режимы на мобилке

| mode | Mobile UX |
|------|-----------|
| `embed` | Карточка в контенте, одна колонка, крупный play |
| `mini` | Sticky footer, не перекрывает контент (`padding-bottom` на body) |
| `full` | Hero + queue list, swipe-friendly |

---

## Проверка на устройстве

1. Safari iOS: play → lock screen → verify artwork
2. Background: открыть другое приложение → audio continues
3. Turbo navigation: play → перейти на другую страницу → no gap
4. Seek: drag progress → position updates without reload

---

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Нет обложки на lock screen | Проверить `coverUrl` в API — абсолютный HTTPS URL |
| Пауза при переходе страницы | Persistent `#om-audio-engine`, не пересоздавать audio |
| Не играет без tap | Убрать autoplay до первого gesture |
| CORS error | Настроить CORS на API и `/media/` |

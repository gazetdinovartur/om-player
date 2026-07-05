<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Enum\PlaybackEventType;
use App\Repository\PlaybackEventRepository;
use App\Repository\TrackRepository;
use App\Service\TrackUploadHandler;
use App\Service\UploadFileValidator;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminDashboard;
use EasyCorp\Bundle\EasyAdminBundle\Attribute\AdminRoute;
use EasyCorp\Bundle\EasyAdminBundle\Config\Assets;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\Locale;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Config\Option\ColorScheme;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Security\Csrf\CsrfTokenManagerInterface;

#[AdminDashboard(routePath: '/admin', routeName: 'admin')]
class DashboardController extends AbstractDashboardController
{
    public function __construct(
        private readonly TrackUploadHandler $trackUploadHandler,
        private readonly UploadFileValidator $uploadFileValidator,
        private readonly CsrfTokenManagerInterface $csrfTokenManager,
    ) {
    }

    public function index(): Response
    {
        return $this->render('admin/dashboard.html.twig');
    }

    #[AdminRoute(path: '/analytics', name: 'analytics')]
    public function analytics(
        PlaybackEventRepository $events,
        TrackRepository $tracks,
    ): Response {
        $since7 = new \DateTimeImmutable('-7 days');
        $since30 = new \DateTimeImmutable('-30 days');

        $topRaw = $events->topTracksByPlays(10, $since30);
        $topTracks = [];
        foreach ($topRaw as $row) {
            $track = $tracks->findOneBySlug($row['slug']);
            $topTracks[] = [
                'slug' => $row['slug'],
                'title' => $track?->getTitle() ?? $row['slug'],
                'count' => $row['count'],
            ];
        }

        $daily = $events->dailyPlayCounts(14);
        $maxDaily = $daily !== [] ? max($daily) : 1;

        return $this->render('admin/analytics.html.twig', [
            'plays7' => $events->countByTypeSince(PlaybackEventType::PLAY, $since7),
            'plays30' => $events->countByTypeSince(PlaybackEventType::PLAY, $since30),
            'events7' => $events->countSince($since7),
            'sessions7' => $events->countUniqueSessionsSince($since7),
            'topTracks' => $topTracks,
            'daily' => $daily,
            'maxDaily' => $maxDaily,
        ]);
    }

    #[AdminRoute(path: '/upload-track', name: 'upload_track', options: ['methods' => ['GET', 'POST']])]
    public function uploadTrack(Request $request): Response
    {
        $wantsJson = $request->isXmlHttpRequest()
            || str_contains((string) $request->headers->get('Accept'), 'application/json');

        if ($request->isMethod('POST')) {
            if ($request->request->get('step') === 'confirm-batch') {
                return $this->handleConfirmBatch($request, $wantsJson);
            }
            if ($request->request->get('step') === 'confirm') {
                return $this->handleConfirm($request, $wantsJson);
            }

            return $this->handleStage($request, $wantsJson);
        }

        return $this->renderUpload();
    }

    /** @param array<string, mixed> $vars */
    private function renderUpload(array $vars = []): Response
    {
        return $this->render('admin/upload_track.html.twig', array_merge($this->uploadPageDefaults(), $vars));
    }

    /** @return array<string, mixed> */
    private function uploadPageDefaults(): array
    {
        return [
            'upload_url' => $this->generateUrl('admin_upload_track'),
            'error' => null,
            'success' => null,
            'preview' => null,
            'token' => null,
            'fileName' => null,
        ];
    }

    private function handleStage(Request $request, bool $wantsJson): Response
    {
        if ($request->files->count() === 0 && $request->getContentLength() > 0 && $request->request->count() === 0) {
            return $this->uploadError($this->uploadFileValidator->postTooLargeHint(), $wantsJson);
        }

        $files = $this->collectUploadedAudioFiles($request);
        if ($files === []) {
            return $this->uploadError('Выберите один или несколько аудиофайлов (MP3 или M4A).', $wantsJson);
        }

        foreach ($files as $file) {
            $error = $this->uploadFileValidator->describeError($file);
            if ($error !== null) {
                return $this->uploadError($error, $wantsJson);
            }
        }

        try {
            if (count($files) === 1) {
                $file = $files[0];
                $staged = $this->trackUploadHandler->stageUpload($file);

                if ($wantsJson) {
                    return new JsonResponse([
                        'ok' => true,
                        'batch' => false,
                        'token' => $staged['token'],
                        'preview' => $staged['preview'],
                        'fileName' => $file->getClientOriginalName(),
                    ]);
                }

                return $this->renderUpload([
                    'token' => $staged['token'],
                    'preview' => $staged['preview'],
                    'fileName' => $file->getClientOriginalName(),
                ]);
            }

            $items = $this->trackUploadHandler->stageBatchUpload($files);
            $successful = array_values(array_filter($items, static fn (array $item): bool => !isset($item['error'])));
            if ($successful === []) {
                $firstError = $items[0]['error'] ?? 'Не удалось обработать файлы.';

                return $this->uploadError($firstError, $wantsJson);
            }

            if ($wantsJson) {
                return new JsonResponse([
                    'ok' => true,
                    'batch' => true,
                    'items' => $items,
                ]);
            }

            return $this->renderUpload([
                'batchItems' => $items,
            ]);
        } catch (\Throwable $e) {
            return $this->uploadError($e->getMessage(), $wantsJson);
        }
    }

    private function handleConfirmBatch(Request $request, bool $wantsJson): Response
    {
        try {
            $rawItems = (string) $request->request->get('items', '[]');
            $items = json_decode($rawItems, true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($items) || $items === []) {
                throw new \InvalidArgumentException('Список файлов для сохранения пуст.');
            }

            $defaults = [
                'artist' => $request->request->get('artist'),
                'album' => $request->request->get('album'),
                'released_at' => $request->request->get('released_at'),
                'album_type' => $request->request->get('album_type'),
                'publish' => $request->request->get('publish'),
                'publish_album' => $request->request->get('publish_album'),
            ];

            $tracks = $this->trackUploadHandler->confirmBatchStagedUpload($items, $defaults);
            $titles = array_map(static fn ($track) => '«'.$track->getTitle().'»', $tracks);
            $message = sprintf('Сохранено треков: %d — %s', count($tracks), implode(', ', $titles));

            if ($wantsJson) {
                return new JsonResponse([
                    'ok' => true,
                    'message' => $message,
                    'count' => count($tracks),
                    'tracks' => array_map(static fn ($track) => [
                        'title' => $track->getTitle(),
                        'slug' => $track->getSlug(),
                    ], $tracks),
                ]);
            }

            return $this->renderUpload(['success' => $message]);
        } catch (\Throwable $e) {
            return $this->uploadError($e->getMessage(), $wantsJson);
        }
    }

    /** @return UploadedFile[] */
    private function collectUploadedAudioFiles(Request $request): array
    {
        $fromArray = $this->uploadFileValidator->collectAudioFiles($request->files->all('audio'));
        if ($fromArray !== []) {
            return $fromArray;
        }

        return $this->uploadFileValidator->collectAudioFiles($request->files->get('audio'));
    }

    private function handleConfirm(Request $request, bool $wantsJson): Response
    {
        try {
            $token = (string) $request->request->get('token', '');
            $track = $this->trackUploadHandler->confirmStagedUpload($token, [
                'title' => $request->request->get('title'),
                'artist' => $request->request->get('artist'),
                'album' => $request->request->get('album'),
                'trackNumber' => $request->request->get('trackNumber'),
                'year' => $request->request->get('year'),
                'publish' => $request->request->get('publish'),
                'publish_album' => $request->request->get('publish_album'),
            ]);
            $message = sprintf('Трек «%s» сохранён (slug: %s).', $track->getTitle(), $track->getSlug());

            if ($wantsJson) {
                return new JsonResponse([
                    'ok' => true,
                    'message' => $message,
                    'track' => [
                        'title' => $track->getTitle(),
                        'slug' => $track->getSlug(),
                    ],
                ]);
            }

            return $this->renderUpload(['success' => $message]);
        } catch (\Throwable $e) {
            return $this->uploadError($e->getMessage(), $wantsJson);
        }
    }

    private function uploadError(string $message, bool $wantsJson): Response
    {
        if ($wantsJson) {
            return new JsonResponse(['ok' => false, 'error' => $message], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return $this->renderUpload(['error' => $message]);
    }

    public function configureDashboard(): Dashboard
    {
        return Dashboard::new()
            ->setTitle('OmPlayer')
            ->setFaviconPath('favicon.svg')
            ->setLocales([Locale::new('ru', 'Русский')])
            ->setDefaultColorScheme(ColorScheme::DARK)
            ->renderContentMaximized();
    }

    public function configureAssets(): Assets
    {
        $sortCsrf = htmlspecialchars(
            $this->csrfTokenManager->getToken(AdminCollectionSortController::CSRF_TOKEN_ID)->getValue(),
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8',
        );

        return Assets::new()
            ->addCssFile('css/admin.css')
            ->addCssFile('css/admin-upload.css')
            ->addJsFile('js/admin-sortable.js')
            ->addHtmlContentToHead(
                '<link rel="preconnect" href="https://fonts.googleapis.com">'
                . '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
                . '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">'
                . '<meta name="om-admin-sort-csrf" content="'.$sortCsrf.'">'
            );
    }

    public function configureMenuItems(): iterable
    {
        yield MenuItem::linkToDashboard('Панель', 'fa fa-home');
        yield MenuItem::linkToRoute('Загрузить треки', 'fa fa-upload', 'admin_upload_track');
        yield MenuItem::linkToRoute('Аналитика', 'fa fa-chart-bar', 'admin_analytics');
        yield MenuItem::linkTo(PlaylistCrudController::class, 'Плейлисты', 'fa fa-list');
        yield MenuItem::linkTo(TrackCrudController::class, 'Треки', 'fa fa-music');
        yield MenuItem::linkTo(AlbumCrudController::class, 'Альбомы', 'fa fa-compact-disc');
        yield MenuItem::linkTo(ArtistCrudController::class, 'Артисты', 'fa fa-user');
        yield MenuItem::linkToUrl('Сайт', 'fa fa-home', $this->generateUrl('web_home'));
    }
}

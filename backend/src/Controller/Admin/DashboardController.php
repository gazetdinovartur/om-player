<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Service\TrackUploadHandler;
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

#[AdminDashboard(routePath: '/admin', routeName: 'admin')]
class DashboardController extends AbstractDashboardController
{
    public function __construct(private readonly TrackUploadHandler $trackUploadHandler)
    {
    }

    public function index(): Response
    {
        return $this->render('admin/dashboard.html.twig');
    }

    #[AdminRoute(path: '/upload-track', name: 'upload_track', options: ['methods' => ['GET', 'POST']])]
    public function uploadTrack(Request $request): Response
    {
        $wantsJson = $request->isXmlHttpRequest()
            || str_contains((string) $request->headers->get('Accept'), 'application/json');

        if ($request->isMethod('POST')) {
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
        $file = $request->files->get('audio');
        if (!$file instanceof UploadedFile) {
            return $this->uploadError('Выберите аудиофайл (MP3 или M4A).', $wantsJson);
        }
        if (!$file->isValid()) {
            return $this->uploadError($file->getErrorMessage() ?: 'Не удалось загрузить файл.', $wantsJson);
        }

        try {
            $staged = $this->trackUploadHandler->stageUpload($file);

            if ($wantsJson) {
                return new JsonResponse([
                    'ok' => true,
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
        } catch (\Throwable $e) {
            return $this->uploadError($e->getMessage(), $wantsJson);
        }
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
            ->setLocales([Locale::new('ru', 'Русский')])
            ->setDefaultColorScheme(ColorScheme::DARK)
            ->renderContentMaximized();
    }

    public function configureAssets(): Assets
    {
        return Assets::new()
            ->addCssFile('css/admin.css')
            ->addCssFile('css/admin-upload.css')
            ->addHtmlContentToHead(
                '<link rel="preconnect" href="https://fonts.googleapis.com">'
                . '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
                . '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">'
            );
    }

    public function configureMenuItems(): iterable
    {
        yield MenuItem::linkToDashboard('Панель', 'fa fa-home');
        yield MenuItem::linkToRoute('Загрузить трек', 'fa fa-upload', 'admin_upload_track');
        yield MenuItem::linkTo(PlaylistCrudController::class, 'Плейлисты', 'fa fa-list');
        yield MenuItem::linkTo(PlaylistItemCrudController::class, 'Треки плейлистов', 'fa fa-list-ol');
        yield MenuItem::linkTo(TrackCrudController::class, 'Треки', 'fa fa-music');
        yield MenuItem::linkTo(AlbumCrudController::class, 'Альбомы', 'fa fa-compact-disc');
        yield MenuItem::linkTo(ArtistCrudController::class, 'Артисты', 'fa fa-user');
        yield MenuItem::linkToUrl('Сайт', 'fa fa-home', $this->generateUrl('web_home'));
    }
}

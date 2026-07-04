<?php

declare(strict_types=1);

namespace App\Controller\Web;

use App\Repository\AlbumRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class HomeController extends AbstractController
{
    #[Route('/', name: 'web_home')]
    public function index(AlbumRepository $albumRepository): Response
    {
        $albums = $albumRepository->findPublishedSummaries();

        return $this->render('web/home.html.twig', [
            'albums' => array_slice($albums, 0, 6),
            'hasMoreAlbums' => count($albums) > 6,
            'latestAlbum' => $albums[0] ?? null,
        ]);
    }
}

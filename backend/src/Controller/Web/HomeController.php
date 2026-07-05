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
        $allAlbums = $albumRepository->findPublishedSummaries();
        $latestAlbum = $allAlbums[0] ?? null;
        $otherAlbums = $latestAlbum !== null ? array_slice($allAlbums, 1) : $allAlbums;

        return $this->render('web/home.html.twig', [
            'albums' => array_slice($otherAlbums, 0, 6),
            'hasMoreAlbums' => count($otherAlbums) > 6,
            'latestAlbum' => $latestAlbum,
        ]);
    }
}

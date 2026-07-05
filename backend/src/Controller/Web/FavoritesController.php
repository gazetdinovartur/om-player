<?php

declare(strict_types=1);

namespace App\Controller\Web;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class FavoritesController extends AbstractController
{
    #[Route('/music/favorites', name: 'web_music_favorites', priority: 10)]
    public function index(): Response
    {
        return $this->render('web/music/favorites.html.twig');
    }
}

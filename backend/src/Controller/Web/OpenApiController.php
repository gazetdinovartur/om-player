<?php

declare(strict_types=1);

namespace App\Controller\Web;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class OpenApiController extends AbstractController
{
    #[Route('/api/openapi.yaml', name: 'api_openapi_yaml', methods: ['GET'])]
    public function yaml(): Response
    {
        $path = $this->getParameter('kernel.project_dir').'/../openapi/om-api.v1.yaml';
        if (!is_readable($path)) {
            throw $this->createNotFoundException();
        }

        return new Response(file_get_contents($path), 200, ['Content-Type' => 'application/yaml']);
    }
}

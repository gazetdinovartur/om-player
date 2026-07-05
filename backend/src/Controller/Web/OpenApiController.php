<?php

declare(strict_types=1);

namespace App\Controller\Web;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class OpenApiController extends AbstractController
{
    #[Route('/api/docs', name: 'api_docs', methods: ['GET'])]
    public function docs(Request $request): Response
    {
        return $this->render('web/api_docs.html.twig', [
            'specUrl' => $this->generateUrl('api_openapi_yaml'),
            'apiBase' => $request->getSchemeAndHttpHost().'/api/v1',
        ]);
    }

    #[Route('/api/openapi.yaml', name: 'api_openapi_yaml', methods: ['GET'])]
    public function yaml(Request $request): Response
    {
        if ($this->wantsHtmlDocs($request)) {
            return $this->redirectToRoute('api_docs');
        }

        $path = $this->resolveSpecPath();

        return new Response(
            (string) file_get_contents($path),
            200,
            [
                'Content-Type' => 'application/yaml; charset=UTF-8',
                'Cache-Control' => 'public, max-age=300',
            ],
        );
    }

    private function wantsHtmlDocs(Request $request): bool
    {
        $accept = $request->headers->get('Accept', '');

        return str_contains($accept, 'text/html')
            && !str_contains($accept, 'application/yaml')
            && !str_contains($accept, 'application/x-yaml');
    }

    private function resolveSpecPath(): string
    {
        $projectDir = $this->getParameter('kernel.project_dir');
        foreach ([
            $projectDir.'/openapi/om-api.v1.yaml',
            $projectDir.'/../openapi/om-api.v1.yaml',
        ] as $path) {
            if (is_readable($path)) {
                return $path;
            }
        }

        throw $this->createNotFoundException('OpenAPI specification not found.');
    }
}

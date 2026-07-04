<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class MusicApiControllerTest extends WebTestCase
{
    public function testTracksListReturnsJson(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/v1/tracks');

        self::assertResponseIsSuccessful();
        self::assertResponseHeaderSame('content-type', 'application/json');

        $payload = json_decode($client->getResponse()->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        self::assertArrayHasKey('data', $payload);
        self::assertArrayHasKey('meta', $payload);
    }

    public function testOpenApiYamlIsServed(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/openapi.yaml');

        self::assertResponseIsSuccessful();
        self::assertStringContainsString('OmPlayer API', (string) $client->getResponse()->getContent());
    }

    public function testHomePageLoads(): void
    {
        $client = static::createClient();
        $client->request('GET', '/');

        self::assertResponseIsSuccessful();
        self::assertStringContainsString('OmPlayer', (string) $client->getResponse()->getContent());
    }
}

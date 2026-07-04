<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\File\UploadedFile;

final class UploadTrackTest extends WebTestCase
{
    public function testStageUploadSingleFileWithAudioArray(): void
    {
        $client = static::createClient();
        $this->loginAdmin($client);

        $audio = __DIR__.'/../../public/media/audio/2025/019f29ca-ae83-7f4c-ac46-12f6720702ae.m4a';
        self::assertFileExists($audio);

        $uploaded = new UploadedFile($audio, 'test.m4a', 'audio/mp4', null, true);
        $client->request('POST', '/admin/upload-track', [
            'step' => 'upload',
        ], [
            'audio' => [$uploaded],
        ], [
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X-Requested-With' => 'XMLHttpRequest',
        ]);

        $content = (string) $client->getResponse()->getContent();
        if (!$client->getResponse()->isSuccessful()) {
            self::fail('Upload failed: '.$client->getResponse()->getStatusCode().' '.$content);
        }

        $data = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        self::assertTrue($data['ok']);
        self::assertFalse($data['batch']);
        self::assertNotEmpty($data['token']);
    }

    private function loginAdmin(\Symfony\Bundle\FrameworkBundle\KernelBrowser $client): void
    {
        $crawler = $client->request('GET', '/admin/login');
        $form = $crawler->filter('form')->form();
        $form['_username'] = 'admin';
        $form['_password'] = 'test';
        $client->submit($form);
        self::assertResponseRedirects();
        $client->followRedirect();
    }
}

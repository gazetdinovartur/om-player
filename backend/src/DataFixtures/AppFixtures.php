<?php

declare(strict_types=1);

namespace App\DataFixtures;

use App\Service\AlbumFolderImporter;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

final class AppFixtures extends Fixture
{
    public function __construct(
        private readonly AlbumFolderImporter $albumFolderImporter,
        #[Autowire('%env(default::JMO_SEED_ALBUM_PATH)%')]
        private readonly string $seedAlbumPath = '',
        #[Autowire('%env(JMO_DEFAULT_ARTIST_NAME)%')]
        private readonly string $defaultArtistName = 'Артур Лун',
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        if ($this->seedAlbumPath === '' || !is_dir($this->seedAlbumPath)) {
            return;
        }

        $this->albumFolderImporter->import(
            $this->seedAlbumPath,
            'Начало',
            $this->defaultArtistName,
            new \DateTimeImmutable('2025-05-01'),
            publish: true,
            purgeExisting: true,
        );
    }
}

<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\AlbumFolderImporter;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[AsCommand(
    name: 'app:import-album',
    description: 'Импорт альбома из папки с аудиофайлами и обложкой',
)]
final class ImportAlbumCommand extends Command
{
    public function __construct(
        private readonly AlbumFolderImporter $importer,
        #[Autowire('%env(default::JMO_SEED_ALBUM_PATH)%')]
        private readonly string $defaultAlbumPath = '',
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('path', 'p', InputOption::VALUE_REQUIRED, 'Путь к папке с треками')
            ->addOption('album', 'a', InputOption::VALUE_REQUIRED, 'Название альбома', 'Начало')
            ->addOption('artist', null, InputOption::VALUE_REQUIRED, 'Имя артиста')
            ->addOption('year', 'y', InputOption::VALUE_REQUIRED, 'Год релиза', '2025')
            ->addOption('purge', null, InputOption::VALUE_NONE, 'Очистить каталог перед импортом')
            ->addOption('draft', null, InputOption::VALUE_NONE, 'Не публиковать альбом и треки');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $path = (string) ($input->getOption('path') ?: $this->defaultAlbumPath);
        if ($path === '') {
            $io->error('Укажите --path или переменную JMO_SEED_ALBUM_PATH в .env');

            return Command::FAILURE;
        }

        $albumTitle = (string) $input->getOption('album');
        $artistName = $input->getOption('artist');
        $artistName = is_string($artistName) && $artistName !== '' ? $artistName : null;
        $year = (int) $input->getOption('year');
        $releasedAt = new \DateTimeImmutable(sprintf('%04d-05-01', $year));
        $publish = !$input->getOption('draft');
        $purge = (bool) $input->getOption('purge');

        try {
            $result = $this->importer->import(
                $path,
                $albumTitle,
                $artistName,
                $releasedAt,
                $publish,
                $purge,
            );
        } catch (\Throwable $e) {
            $io->error($e->getMessage());

            return Command::FAILURE;
        }

        $album = $result['album'];
        $tracks = $result['tracks'];
        $io->success(sprintf(
            'Альбом «%s» (%s): %d треков%s',
            $album->getTitle(),
            $album->getSlug(),
            count($tracks),
            $publish ? ', опубликован' : '',
        ));

        foreach ($tracks as $track) {
            $io->writeln(sprintf('  %d. %s → %s', $track->getTrackNumber(), $track->getTitle(), $track->getSlug()));
        }

        return Command::SUCCESS;
    }
}

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
    name: 'app:purge-catalog',
    description: 'Удалить весь каталог: треки, альбомы, артистов, плейлисты и медиафайлы',
)]
final class PurgeCatalogCommand extends Command
{
    public function __construct(
        private readonly AlbumFolderImporter $importer,
        #[Autowire('%kernel.project_dir%/var/upload-staging')]
        private readonly string $stagingDir,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('force', 'f', InputOption::VALUE_NONE, 'Без подтверждения');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        if (!$input->getOption('force')) {
            $confirmed = $io->confirm(
                'Удалить все треки, альбомы, артистов, плейлисты, статистику прослушиваний и файлы audio/covers?',
                false,
            );
            if (!$confirmed) {
                $io->note('Отменено.');

                return Command::SUCCESS;
            }
        }

        $this->importer->purgeCatalog();
        $this->purgeStagingDir();

        $io->success('Каталог и медиафайлы очищены.');

        return Command::SUCCESS;
    }

    private function purgeStagingDir(): void
    {
        if (!is_dir($this->stagingDir)) {
            return;
        }

        foreach (glob($this->stagingDir.'/*') ?: [] as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}

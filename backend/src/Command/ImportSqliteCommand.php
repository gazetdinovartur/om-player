<?php

declare(strict_types=1);

namespace App\Command;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Platforms\SQLitePlatform;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[AsCommand(
    name: 'app:import-sqlite',
    description: 'One-time import catalog data from legacy var/data.db (SQLite) into MySQL',
)]
final class ImportSqliteCommand extends Command
{
    /** @var list<string> */
    private const TABLE_ORDER = [
        'artists',
        'albums',
        'tracks',
        'playlists',
        'playlist_items',
        'playback_events',
    ];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        #[Autowire('%kernel.project_dir%')]
        private readonly string $projectDir,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('force', 'f', InputOption::VALUE_NONE, 'Import even if MySQL already has artists');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $sqlitePath = $this->projectDir.'/var/data.db';

        if (!is_readable($sqlitePath)) {
            $io->error('SQLite file not found: '.$sqlitePath);

            return Command::FAILURE;
        }

        $mysql = $this->entityManager->getConnection();
        if ($mysql->getDatabasePlatform() instanceof SQLitePlatform) {
            $io->error('Current DATABASE_URL points to SQLite. Switch .env.local to MySQL first.');

            return Command::FAILURE;
        }

        $existing = (int) $mysql->fetchOne('SELECT COUNT(*) FROM artists');
        if ($existing > 0 && !$input->getOption('force')) {
            $io->warning(sprintf('MySQL already has %d artist(s). Use --force to import anyway.', $existing));

            return Command::FAILURE;
        }

        if ($existing > 0) {
            $io->warning('Clearing existing MySQL catalog tables…');
            $mysql->executeStatement('SET FOREIGN_KEY_CHECKS=0');
            foreach (array_reverse(self::TABLE_ORDER) as $table) {
                if ($table === 'doctrine_migration_versions') {
                    continue;
                }
                $mysql->executeStatement('TRUNCATE TABLE '.$table);
            }
            $mysql->executeStatement('SET FOREIGN_KEY_CHECKS=1');
        }

        $sqlite = new \PDO('sqlite:'.$sqlitePath);
        $sqlite->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

        foreach (self::TABLE_ORDER as $table) {
            $count = $this->copyTable($sqlite, $mysql, $table);
            $io->writeln(sprintf('  %s: %d row(s)', $table, $count));
        }

        $io->success('SQLite catalog imported into MySQL.');

        return Command::SUCCESS;
    }

    private function copyTable(\PDO $sqlite, Connection $mysql, string $table): int
    {
        $stmt = $sqlite->query('SELECT * FROM '.$table);
        if ($stmt === false) {
            return 0;
        }

        $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        if ($rows === []) {
            return 0;
        }

        foreach ($rows as $row) {
            $mysql->insert($table, $row);
        }

        return count($rows);
    }
}

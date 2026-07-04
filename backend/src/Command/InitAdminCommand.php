<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\EnvFileUpdater;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[AsCommand(
    name: 'app:init-admin',
    description: 'Задать логин/пароль админки в backend/.env (plain-text, как вводите при входе)',
)]
final class InitAdminCommand extends Command
{
    public function __construct(
        #[Autowire('%kernel.project_dir%/.env')]
        private readonly string $envPath,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('username', 'u', InputOption::VALUE_REQUIRED, 'Логин админки', 'admin')
            ->addOption('password', 'p', InputOption::VALUE_REQUIRED, 'Пароль. Без флага — случайный')
            ->addOption('write-env', null, InputOption::VALUE_NONE, 'Записать в backend/.env')
            ->addOption('if-unset', null, InputOption::VALUE_NONE, 'Только если пароль не задан или placeholder / старый bcrypt')
            ->addOption('force', 'f', InputOption::VALUE_NONE, 'Перезаписать существующий пароль');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $updater = new EnvFileUpdater($this->envPath);

        if (!is_readable($this->envPath)) {
            $io->error('Сначала создайте backend/.env: bash scripts/init-env.sh');

            return Command::FAILURE;
        }

        $username = (string) $input->getOption('username');
        $current = $updater->get('ADMIN_PASSWORD') ?? '';
        $force = (bool) $input->getOption('force');
        $ifUnset = (bool) $input->getOption('if-unset');

        if ($ifUnset && !$force && $this->isConfiguredPlainPassword($current)) {
            $io->note('ADMIN_PASSWORD уже задан. Используйте --force для смены.');

            return Command::SUCCESS;
        }

        if ($this->isLegacyHash($current) && !$input->getOption('password')) {
            $io->warning('В .env найден старый bcrypt-хеш — будет записан новый plain-text пароль.');
        }

        $plain = $input->getOption('password');
        if (!is_string($plain) || $plain === '') {
            $plain = bin2hex(random_bytes(8));
        }

        if ($input->getOption('write-env')) {
            $updater->set('ADMIN_USERNAME', $username);
            $updater->set('ADMIN_PASSWORD', $plain);
        }

        $io->success(sprintf('Admin: %s', $username));
        $io->writeln(sprintf('Пароль: %s', $plain));
        $io->note('Этот же пароль вставьте в backend/.env как ADMIN_PASSWORD и используйте при входе на /admin/login');

        return Command::SUCCESS;
    }

    private function isConfiguredPlainPassword(string $value): bool
    {
        return $value !== ''
            && !str_starts_with($value, 'change_me')
            && !$this->isLegacyHash($value);
    }

    private function isLegacyHash(string $value): bool
    {
        return str_starts_with($value, '$2y$')
            || str_starts_with($value, '$2a$')
            || str_starts_with($value, '$argon2');
    }
}

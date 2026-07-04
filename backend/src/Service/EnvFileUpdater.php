<?php

declare(strict_types=1);

namespace App\Service;

final class EnvFileUpdater
{
    public function __construct(
        private readonly string $envPath,
    ) {
    }

    public function set(string $key, string $value): void
    {
        if (!is_readable($this->envPath)) {
            throw new \RuntimeException(sprintf('Файл окружения не найден: %s', $this->envPath));
        }

        $contents = (string) file_get_contents($this->envPath);
        $quoted = $this->quoteValue($value);
        $pattern = '/^'.preg_quote($key, '/').'=.*$/m';

        if (preg_match($pattern, $contents)) {
            $contents = (string) preg_replace($pattern, $key.'='.$quoted, $contents);
        } else {
            $contents = rtrim($contents)."\n".$key.'='.$quoted."\n";
        }

        file_put_contents($this->envPath, $contents);
    }

    public function get(string $key): ?string
    {
        if (!is_readable($this->envPath)) {
            return null;
        }

        $contents = (string) file_get_contents($this->envPath);
        if (preg_match('/^'.preg_quote($key, '/').'=(.*)$/m', $contents, $m)) {
            return $this->unquoteValue(trim($m[1]));
        }

        return null;
    }

    private function quoteValue(string $value): string
    {
        if ($value === '' || preg_match('/[\s#="\']/', $value)) {
            return '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $value).'"';
        }

        return $value;
    }

    private function unquoteValue(string $value): string
    {
        if (str_starts_with($value, '"') && str_ends_with($value, '"')) {
            return stripcslashes(substr($value, 1, -1));
        }

        return $value;
    }
}

<?php

declare(strict_types=1);

namespace App\Service;

use Symfony\Component\HttpFoundation\File\UploadedFile;

final class UploadFileValidator
{
    /** @return UploadedFile[] */
    public function collectAudioFiles(mixed $bag): array
    {
        if ($bag instanceof UploadedFile) {
            return [$bag];
        }

        if (!is_array($bag) || $bag === []) {
            return [];
        }

        $flat = [];
        array_walk_recursive($bag, static function ($file) use (&$flat): void {
            if ($file instanceof UploadedFile) {
                $flat[] = $file;
            }
        });

        return $flat;
    }

    public function describeError(UploadedFile $file): ?string
    {
        if ($file->isValid()) {
            return null;
        }

        $name = $file->getClientOriginalName() ?: 'файл';

        return match ($file->getError()) {
            UPLOAD_ERR_INI_SIZE => sprintf(
                '«%s» больше лимита PHP upload_max_filesize (%s). Запустите сервер через make server или увеличьте лимит в php.ini.',
                $name,
                ini_get('upload_max_filesize') ?: '?',
            ),
            UPLOAD_ERR_FORM_SIZE => sprintf('«%s» превышает лимит формы на сервере.', $name),
            UPLOAD_ERR_PARTIAL => sprintf('«%s» загружен не полностью. Попробуйте ещё раз.', $name),
            UPLOAD_ERR_NO_FILE => 'Файл не был получен сервером.',
            UPLOAD_ERR_NO_TMP_DIR, UPLOAD_ERR_CANT_WRITE, UPLOAD_ERR_EXTENSION => sprintf(
                'Сервер не смог принять «%s». Проверьте права на var/ и настройки PHP.',
                $name,
            ),
            default => sprintf('Не удалось принять «%s» (%s).', $name, $file->getErrorMessage()),
        };
    }

    public function postTooLargeHint(): string
    {
        return sprintf(
            'Запрос слишком большой для PHP (post_max_size = %s). Используйте make server или увеличьте post_max_size в php.ini.',
            ini_get('post_max_size') ?: '?',
        );
    }
}

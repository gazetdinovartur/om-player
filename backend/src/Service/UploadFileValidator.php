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

    /** @var list<string> */
    private const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    private const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

    public function describeImageError(UploadedFile $file): ?string
    {
        $uploadError = $this->describeError($file);
        if ($uploadError !== null) {
            return $uploadError;
        }

        $name = $file->getClientOriginalName() ?: 'файл';
        $mime = (string) ($file->getMimeType() ?? '');
        if (!in_array($mime, self::IMAGE_MIMES, true)) {
            return sprintf('«%s» — неподдерживаемый формат. Загрузите JPG, PNG или WebP.', $name);
        }

        if ($file->getSize() > self::MAX_IMAGE_BYTES) {
            return sprintf('«%s» слишком большой (максимум 8 МБ).', $name);
        }

        return null;
    }

    public function extractCoverUploadFromRequest(mixed $filesBag): ?UploadedFile
    {
        if ($filesBag instanceof UploadedFile) {
            return $filesBag->isValid() ? $filesBag : null;
        }

        if (!is_array($filesBag)) {
            return null;
        }

        if (isset($filesBag['coverUpload']) && $filesBag['coverUpload'] instanceof UploadedFile) {
            $file = $filesBag['coverUpload'];

            return $file->isValid() ? $file : null;
        }

        foreach ($filesBag as $value) {
            $found = $this->extractCoverUploadFromRequest($value);
            if ($found !== null) {
                return $found;
            }
        }

        return null;
    }
}

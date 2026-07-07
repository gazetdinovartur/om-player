<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Track;
use App\Enum\TrackType;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\SlugField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\EntityFilter;

final class TrackCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Track::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Трек')
            ->setEntityLabelInPlural('Треки')
            ->setPageTitle(Crud::PAGE_INDEX, 'Треки')
            ->setPageTitle(Crud::PAGE_NEW, 'Новый трек')
            ->setPageTitle(Crud::PAGE_EDIT, static fn (Track $track): string => sprintf('«%s»', $track->getTitle()))
            ->setDefaultSort(['album' => 'ASC', 'trackNumber' => 'ASC'])
            ->setPaginatorPageSize(30)
            ->overrideTemplate('crud/index', 'admin/crud/track_index.html.twig');
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters->add(EntityFilter::new('album', 'Альбом'));
    }

    public function configureActions(Actions $actions): Actions
    {
        $upload = Action::new('uploadTracks', 'Загрузить треки', 'fa fa-upload')
            ->linkToRoute('admin_upload_track')
            ->createAsGlobalAction();

        return $actions
            ->disable(Action::BATCH_DELETE)
            ->add(Crud::PAGE_INDEX, $upload);
    }

    public function configureFields(string $pageName): iterable
    {
        if ($pageName === Crud::PAGE_INDEX) {
            yield TextField::new('title', 'Название');
            yield AssociationField::new('album', 'Альбом');
            yield IntegerField::new('trackNumber', '№');
            yield IntegerField::new('durationMs', 'Длительность')
                ->formatValue(static fn (?int $value): string => self::formatDurationMs($value ?? 0));
            yield ChoiceField::new('type', 'Тип')
                ->setChoices(self::typeChoices())
                ->formatValue(static fn (?TrackType $type): string => self::typeLabel($type));
            yield BooleanField::new('published', 'Опубл.')
                ->renderAsSwitch(false)
                ->formatValue(static fn (?bool $value): string => $value ? 'Да' : 'Нет');

            return;
        }

        yield TextField::new('title', 'Название')->setColumns(8);
        yield SlugField::new('slug', 'Slug')
            ->setTargetFieldName('title')
            ->setColumns(4)
            ->setHelp('Используется в URL и API.');

        yield AssociationField::new('album', 'Альбом')
            ->autocomplete()
            ->setColumns(6);
        yield ChoiceField::new('type', 'Тип')
            ->setChoices(self::typeChoices())
            ->setColumns(3);
        yield IntegerField::new('trackNumber', '№ в альбоме')->setColumns(3);

        yield BooleanField::new('published', 'Опубликован')->setColumns(3);
        yield TextField::new('genre', 'Жанр')->setColumns(4);
        yield TextField::new('composer', 'Композитор')->setColumns(4);
        yield TextField::new('albumArtist', 'Album Artist')->setColumns(4);
        yield TextField::new('label', 'Лейбл')->setColumns(4);

        if ($pageName === Crud::PAGE_EDIT) {
            yield IntegerField::new('durationMs', 'Длительность')
                ->setColumns(3)
                ->setFormTypeOption('disabled', true)
                ->formatValue(static fn (?int $value): string => self::formatDurationMs($value ?? 0));
            yield TextField::new('audioPath', 'Аудиофайл')
                ->setColumns(9)
                ->setFormTypeOption('disabled', true)
                ->setHelp('Путь задаётся при загрузке; менять вручную не нужно.');
        } else {
            yield TextField::new('audioPath', 'Путь к аудио')
                ->setColumns(12)
                ->setHelp('Например: audio/2026/uuid.mp3. Удобнее загрузить файл через «Загрузить треки» — метаданные подставятся сами.');
        }

        yield TextareaField::new('description', 'Описание')
            ->setColumns(12)
            ->setNumOfRows(4);
        yield TextareaField::new('credits', 'Участники')
            ->setColumns(6)
            ->setNumOfRows(5);
        yield TextareaField::new('lyrics', 'Текст (ID3 / ручной ввод)')
            ->setColumns(6)
            ->setNumOfRows(8)
            ->setHelp('При загрузке подставляется из USLT-тега, если есть.');
    }

    /** @return array<string, TrackType> */
    private static function typeChoices(): array
    {
        return [
            TrackType::STUDIO->label() => TrackType::STUDIO,
            TrackType::LIVE->label() => TrackType::LIVE,
            TrackType::DEMO->label() => TrackType::DEMO,
            TrackType::REHEARSAL->label() => TrackType::REHEARSAL,
        ];
    }

    private static function typeLabel(?TrackType $type): string
    {
        return $type?->label() ?? '—';
    }

    private static function formatDurationMs(int $durationMs): string
    {
        $totalSeconds = max(0, (int) round($durationMs / 1000));
        $minutes = intdiv($totalSeconds, 60);
        $seconds = $totalSeconds % 60;

        return sprintf('%d:%02d', $minutes, $seconds);
    }
}

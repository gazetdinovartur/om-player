<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Track;
use App\Enum\TrackType;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\SlugField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

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
            ->setPaginatorPageSize(30);
    }

    public function configureActions(Actions $actions): Actions
    {
        $upload = Action::new('uploadTracks', 'Загрузить треки', 'fa fa-upload')
            ->linkToRoute('admin_upload_track')
            ->createAsGlobalAction();

        return $actions->add(Crud::PAGE_INDEX, $upload);
    }

    public function configureFields(string $pageName): iterable
    {
        yield TextField::new('title', 'Название');
        yield AssociationField::new('album', 'Альбом');
        yield IntegerField::new('trackNumber', '№');
        yield IntegerField::new('durationMs', 'Длительность')
            ->onlyOnIndex()
            ->formatValue(static fn (?int $value): string => self::formatDurationMs($value ?? 0));
        yield ChoiceField::new('type', 'Тип')
            ->setChoices(self::typeChoices())
            ->formatValue(static fn (?TrackType $type): string => self::typeLabel($type));
        yield BooleanField::new('published', 'Опубл.');

        yield TextField::new('title', 'Название')
            ->onlyOnForms()
            ->setColumns(8);
        yield SlugField::new('slug', 'Slug')
            ->onlyOnForms()
            ->setTargetFieldName('title')
            ->setColumns(4)
            ->setHelp('Используется в URL страницы трека.');

        yield AssociationField::new('album', 'Альбом')
            ->onlyOnForms()
            ->autocomplete()
            ->setColumns(6);
        yield IntegerField::new('trackNumber', '№ в альбоме')
            ->onlyOnForms()
            ->setColumns(2);
        yield ChoiceField::new('type', 'Тип')
            ->onlyOnForms()
            ->setChoices(self::typeChoices())
            ->setColumns(4);

        yield BooleanField::new('published', 'Опубликован')
            ->onlyOnForms()
            ->setColumns(3);
        yield TextField::new('genre', 'Жанр')
            ->onlyOnForms()
            ->setColumns(9);

        if ($pageName === Crud::PAGE_EDIT) {
            yield IntegerField::new('durationMs', 'Длительность')
                ->onlyOnForms()
                ->setColumns(3)
                ->setFormTypeOption('disabled', true)
                ->formatValue(static fn (?int $value): string => self::formatDurationMs($value ?? 0));
            yield TextField::new('audioPath', 'Аудиофайл')
                ->onlyOnForms()
                ->setColumns(9)
                ->setFormTypeOption('disabled', true)
                ->setHelp('Путь задаётся при загрузке; менять вручную не нужно.');
        } else {
            yield TextField::new('audioPath', 'Путь к аудио')
                ->onlyOnForms()
                ->setColumns(12)
                ->setHelp('Например: audio/2026/uuid.mp3. Удобнее загрузить файл через «Загрузить треки» — метаданные подставятся сами.');
        }

        yield TextareaField::new('description', 'Описание')
            ->onlyOnForms()
            ->setColumns(12)
            ->setNumOfRows(4);
        yield TextareaField::new('credits', 'Участники')
            ->onlyOnForms()
            ->setColumns(6)
            ->setNumOfRows(5);
        yield TextareaField::new('lyrics', 'Текст песни')
            ->onlyOnForms()
            ->setColumns(6)
            ->setNumOfRows(5);
    }

    /** @return array<string, TrackType> */
    private static function typeChoices(): array
    {
        return [
            'Студийная' => TrackType::STUDIO,
            'Концертная' => TrackType::LIVE,
            'Демо' => TrackType::DEMO,
            'Репетиция' => TrackType::REHEARSAL,
        ];
    }

    private static function typeLabel(?TrackType $type): string
    {
        return match ($type) {
            TrackType::STUDIO => 'Студийная',
            TrackType::LIVE => 'Концертная',
            TrackType::DEMO => 'Демо',
            TrackType::REHEARSAL => 'Репетиция',
            default => '—',
        };
    }

    private static function formatDurationMs(int $durationMs): string
    {
        $totalSeconds = max(0, (int) round($durationMs / 1000));
        $minutes = intdiv($totalSeconds, 60);
        $seconds = $totalSeconds % 60;

        return sprintf('%d:%02d', $minutes, $seconds);
    }
}

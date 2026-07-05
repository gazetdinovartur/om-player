<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Album;
use App\Enum\AlbumType;
use App\Service\CoverUploadService;
use App\Service\UploadFileValidator;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ImageField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\SlugField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\HttpFoundation\RequestStack;

final class AlbumCrudController extends AbstractCrudController
{
    use AdminCoverUploadTrait;

    public function __construct(
        private readonly CoverUploadService $coverUpload,
        private readonly UploadFileValidator $uploadFileValidator,
        private readonly RequestStack $requestStack,
    ) {
    }

    protected function getRequestStack(): RequestStack
    {
        return $this->requestStack;
    }

    public static function getEntityFqcn(): string
    {
        return Album::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Альбом')
            ->setEntityLabelInPlural('Альбомы')
            ->addFormTheme('admin/form/cover_preview_theme.html.twig');
    }

    public function configureFields(string $pageName): iterable
    {
        if ($pageName === Crud::PAGE_INDEX) {
            yield ImageField::new('coverThumbPath', 'Обложка')
                ->setBasePath('/media/')
                ->hideOnForm();
        }

        yield TextField::new('title', 'Название')->setColumns(8);
        yield SlugField::new('slug', 'Slug')->setTargetFieldName('title')->setColumns(4);
        yield AssociationField::new('artist', 'Артист')->autocomplete()->setColumns(6);
        yield ChoiceField::new('type', 'Тип')->setChoices([
            'Альбом' => AlbumType::STUDIO,
            'EP' => AlbumType::EP,
            'Сингл' => AlbumType::SINGLE,
            'Концертный' => AlbumType::LIVE,
            'Сборник' => AlbumType::COMPILATION,
        ])->setColumns(3);
        yield DateField::new('releasedAt', 'Дата релиза')
            ->setColumns(3)
            ->setFormTypeOption('input', 'datetime_immutable');
        yield BooleanField::new('published', 'Опубликован')->setColumns(3);
        yield IntegerField::new('sortOrder', 'Порядок в каталоге')->setColumns(3);
        yield TextareaField::new('description', 'Описание')->hideOnIndex()->setColumns(12)->setNumOfRows(4);

        if ($pageName !== Crud::PAGE_INDEX) {
            yield FormField::addFieldset('Обложка');
            yield $this->coverPreviewField();
            yield $this->coverUploadField();
        }

        if ($pageName === Crud::PAGE_EDIT) {
            yield FormField::addFieldset('Треки');
            yield CollectionField::new('tracks', 'Список треков')
                ->useEntryCrudForm(AlbumTrackCrudController::class)
                ->setEntryIsComplex(false)
                ->allowAdd(false)
                ->allowDelete(false)
                ->setFormTypeOption('by_reference', false)
                ->addCssClass('field-collection-sortable field-collection-sortable--album-tracks')
                ->setFormTypeOption('attr', [
                    'data-sort-field' => 'trackNumber',
                    'class' => 'om-sortable-widget',
                ])
                ->setColumns(12)
                ->setHelp('Перетащите строку за маркер слева — порядок сохранится автоматически.');
        }
    }

    public function persistEntity(EntityManagerInterface $entityManager, mixed $entityInstance): void
    {
        \assert($entityInstance instanceof Album);
        $this->applyCoverUpload($entityInstance);
        parent::persistEntity($entityManager, $entityInstance);
    }

    public function updateEntity(EntityManagerInterface $entityManager, mixed $entityInstance): void
    {
        \assert($entityInstance instanceof Album);
        $this->applyCoverUpload($entityInstance);
        $this->renumberAlbumTracks($entityInstance);
        parent::updateEntity($entityManager, $entityInstance);
    }

    private function renumberAlbumTracks(Album $album): void
    {
        $position = 1;
        foreach ($album->getTracks() as $track) {
            $track->setTrackNumber($position++);
        }
    }

    private function applyCoverUpload(Album $album): void
    {
        try {
            $request = $this->requestStack->getCurrentRequest();
            if ($request === null) {
                return;
            }
            $file = $this->uploadFileValidator->extractCoverUploadFromRequest($request->files->all());
            $this->coverUpload->applyToAlbum($album, $file);
        } catch (\InvalidArgumentException $e) {
            $this->flashCoverUploadError($e);
            throw $e;
        }
    }
}

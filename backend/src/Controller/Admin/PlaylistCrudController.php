<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Playlist;
use App\Service\CoverUploadService;
use App\Service\UploadFileValidator;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CollectionField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ImageField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\SlugField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\HttpFoundation\RequestStack;

final class PlaylistCrudController extends AbstractCrudController
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
        return Playlist::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Плейлист')
            ->setEntityLabelInPlural('Плейлисты')
            ->setDefaultSort(['sortOrder' => 'ASC', 'title' => 'ASC'])
            ->addFormTheme('admin/form/cover_preview_theme.html.twig');
    }

    public function configureFields(string $pageName): iterable
    {
        if ($pageName === Crud::PAGE_INDEX) {
            yield ImageField::new('coverPath', 'Обложка')
                ->setBasePath('/media/')
                ->hideOnForm();
        }

        yield TextField::new('title', 'Название')->setColumns(8);
        yield SlugField::new('slug', 'Slug')->setTargetFieldName('title')->setColumns(4);
        yield TextareaField::new('description', 'Описание')->hideOnIndex()->setColumns(12)->setNumOfRows(4);
        yield BooleanField::new('isPublic', 'Публичный')->setColumns(3);
        yield IntegerField::new('sortOrder', 'Порядок')->setColumns(3);

        if ($pageName === Crud::PAGE_INDEX) {
            yield IntegerField::new('trackCount', 'Треков')
                ->setVirtual(true)
                ->formatValue(static fn ($value, Playlist $playlist): int => $playlist->getItems()->count());
        }

        if ($pageName !== Crud::PAGE_INDEX) {
            yield FormField::addFieldset('Обложка');
            yield $this->coverPreviewField();
            yield $this->coverUploadField();
        }

        if ($pageName !== Crud::PAGE_INDEX) {
            yield FormField::addFieldset('Треки');
            yield CollectionField::new('items', 'Список треков')
                ->useEntryCrudForm(PlaylistItemCrudController::class)
                ->setEntryIsComplex(true)
                ->allowAdd()
                ->allowDelete()
                ->setFormTypeOption('by_reference', false)
                ->addCssClass('field-collection-sortable field-collection-sortable--playlist-items')
                ->setFormTypeOption('attr', [
                    'data-sort-field' => 'sortOrder',
                    'class' => 'om-sortable-widget',
                ])
                ->setColumns(12)
                ->setHelp('Добавьте треки и перетащите строки — порядок сохранится автоматически.');
        }
    }

    public function persistEntity(EntityManagerInterface $entityManager, mixed $entityInstance): void
    {
        \assert($entityInstance instanceof Playlist);
        $this->applyCoverUpload($entityInstance);
        $this->linkPlaylistItems($entityInstance);
        $this->renumberPlaylistItems($entityInstance);
        parent::persistEntity($entityManager, $entityInstance);
    }

    public function updateEntity(EntityManagerInterface $entityManager, mixed $entityInstance): void
    {
        \assert($entityInstance instanceof Playlist);
        $this->applyCoverUpload($entityInstance);
        $this->linkPlaylistItems($entityInstance);
        $this->renumberPlaylistItems($entityInstance);
        parent::updateEntity($entityManager, $entityInstance);
    }

    private function renumberPlaylistItems(Playlist $playlist): void
    {
        $position = 1;
        foreach ($playlist->getItems() as $item) {
            $item->setSortOrder($position++);
        }
    }

    private function applyCoverUpload(Playlist $playlist): void
    {
        try {
            $request = $this->requestStack->getCurrentRequest();
            if ($request === null) {
                return;
            }
            $file = $this->uploadFileValidator->extractCoverUploadFromRequest($request->files->all());
            $this->coverUpload->applyToPlaylist($playlist, $file);
        } catch (\InvalidArgumentException $e) {
            $this->flashCoverUploadError($e);
            throw $e;
        }
    }

    private function linkPlaylistItems(Playlist $playlist): void
    {
        foreach ($playlist->getItems() as $item) {
            $item->setPlaylist($playlist);
        }
    }
}

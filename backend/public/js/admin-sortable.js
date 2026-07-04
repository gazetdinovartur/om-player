/**
 * Drag-and-drop reorder for EasyAdmin CollectionField (playlists, album tracks).
 */
(function () {
    'use strict';

    function getCollectionItems(list) {
        return Array.from(
            list.querySelectorAll(':scope > .accordion-item, :scope > .field-collection-item'),
        );
    }

    function renumberSortInputs(container) {
        const inputs = container.querySelectorAll('.om-sort-order-input');
        inputs.forEach(function (input, index) {
            input.value = String(index + 1);
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    function ensureDragHandle(header) {
        if (header.querySelector('.om-drag-handle')) {
            return;
        }

        const handle = document.createElement('span');
        handle.className = 'om-drag-handle';
        handle.setAttribute('draggable', 'true');
        handle.setAttribute('title', 'Перетащите для сортировки');
        handle.setAttribute('aria-hidden', 'true');
        handle.innerHTML = '&#8942;&#8942;';

        header.insertBefore(handle, header.firstChild);
    }

    function initSortableCollection(fieldGroup) {
        if (fieldGroup.dataset.sortableInit === '1') {
            return;
        }

        const widget = fieldGroup.querySelector('[data-sort-field]');
        if (!widget) {
            return;
        }

        const list =
            fieldGroup.querySelector('.accordion') ||
            fieldGroup.querySelector('[data-ea-collection-field]') ||
            fieldGroup.querySelector('.form-widget > div');

        if (!list) {
            return;
        }

        fieldGroup.dataset.sortableInit = '1';
        list.classList.add('om-sortable-list');

        const form = fieldGroup.closest('form');
        if (form && !form.dataset.sortableSubmitBound) {
            form.dataset.sortableSubmitBound = '1';
            form.addEventListener('submit', function () {
                document.querySelectorAll('[data-sortable-init="1"]').forEach(function (group) {
                    renumberSortInputs(group);
                });
            });
        }

        let draggedItem = null;

        function bindItem(item) {
            const header = item.querySelector('.accordion-header') || item;
            ensureDragHandle(header);

            const handle = header.querySelector('.om-drag-handle');
            if (!handle || handle.dataset.bound === '1') {
                return;
            }
            handle.dataset.bound = '1';

            handle.addEventListener('dragstart', function (event) {
                draggedItem = item;
                item.classList.add('om-sortable-item--dragging');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', 'sort');
            });

            handle.addEventListener('dragend', function () {
                item.classList.remove('om-sortable-item--dragging');
                draggedItem = null;
                list.querySelectorAll('.om-sortable-item--over').forEach(function (el) {
                    el.classList.remove('om-sortable-item--over');
                });
                renumberSortInputs(fieldGroup);
            });

            item.addEventListener('dragover', function (event) {
                if (!draggedItem || draggedItem === item) {
                    return;
                }
                event.preventDefault();
                item.classList.add('om-sortable-item--over');

                const rect = item.getBoundingClientRect();
                const before = event.clientY < rect.top + rect.height / 2;
                if (before) {
                    list.insertBefore(draggedItem, item);
                } else {
                    list.insertBefore(draggedItem, item.nextSibling);
                }
            });

            item.addEventListener('dragleave', function () {
                item.classList.remove('om-sortable-item--over');
            });

            item.addEventListener('drop', function (event) {
                event.preventDefault();
                item.classList.remove('om-sortable-item--over');
                renumberSortInputs(fieldGroup);
            });
        }

        function refreshItems() {
            getCollectionItems(list).forEach(bindItem);
            renumberSortInputs(fieldGroup);
        }

        refreshItems();

        const observer = new MutationObserver(function () {
            refreshItems();
        });
        observer.observe(list, { childList: true });
    }

    function initAll() {
        document.querySelectorAll('.form-group.field-collection.field-collection-sortable, .field-collection-sortable').forEach(function (el) {
            const fieldGroup = el.classList.contains('field-collection')
                ? el
                : el.closest('.form-group.field-collection');
            if (fieldGroup) {
                initSortableCollection(fieldGroup);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    document.addEventListener('ea.collection.item-added', initAll);
})();

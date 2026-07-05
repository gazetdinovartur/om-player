/**
 * Drag-and-drop reorder for EasyAdmin:
 * - album / playlist collection fields on edit forms
 * - track index table (admin → Треки)
 */
(function () {
    'use strict';

    const GRIP_SVG =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<circle cx="9" cy="6" r="1.35"/><circle cx="15" cy="6" r="1.35"/>' +
        '<circle cx="9" cy="12" r="1.35"/><circle cx="15" cy="12" r="1.35"/>' +
        '<circle cx="9" cy="18" r="1.35"/><circle cx="15" cy="18" r="1.35"/></svg>';

    function isElement(node) {
        return node && node.nodeType === Node.ELEMENT_NODE;
    }

    function resolveFieldGroup(el) {
        if (!isElement(el)) {
            return null;
        }
        if (el.matches('[data-ea-collection-field]')) {
            return el;
        }
        return el.closest('[data-ea-collection-field]') || el.closest('.form-group.field-collection');
    }

    function isSortableCollection(fieldGroup) {
        if (!isElement(fieldGroup)) {
            return false;
        }
        return (
            fieldGroup.classList.contains('field-collection-sortable') ||
            fieldGroup.querySelector('[data-sort-field]') !== null ||
            fieldGroup.querySelector('.om-sortable-widget') !== null
        );
    }

    /** EA5: items are direct children of .form-widget-compound inside .accordion */
    function findSortableList(fieldGroup) {
        const marked = fieldGroup.querySelector('.om-sortable-list');
        if (isElement(marked)) {
            return marked;
        }

        const root = fieldGroup.querySelector('.ea-form-collection-items');
        if (!isElement(root)) {
            return fieldGroup.querySelector('.form-widget-compound') || fieldGroup.querySelector('.accordion');
        }

        const compound = root.querySelector(':scope > .accordion > .form-widget-compound');
        if (isElement(compound)) {
            return compound;
        }

        const accordion = root.querySelector(':scope > .accordion');
        if (isElement(accordion)) {
            return accordion;
        }

        const nestedCompound = root.querySelector('.form-widget-compound');
        if (isElement(nestedCompound)) {
            return nestedCompound;
        }

        return root;
    }

    function getCollectionItems(container) {
        if (!isElement(container)) {
            return [];
        }

        const direct = Array.from(container.querySelectorAll(':scope > .field-collection-item'));
        if (direct.length > 0) {
            return direct;
        }

        return Array.from(container.querySelectorAll('.field-collection-item'));
    }

    function getItemsParent(list) {
        if (!isElement(list)) {
            return null;
        }
        const items = getCollectionItems(list);
        if (items.length > 0 && isElement(items[0].parentElement)) {
            return items[0].parentElement;
        }
        return list;
    }

    function renumberSortInputs(fieldGroup) {
        const inputs = fieldGroup.querySelectorAll('.om-sort-order-input');
        inputs.forEach(function (input, index) {
            input.value = String(index + 1);
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        const list = findSortableList(fieldGroup);
        if (!list) {
            return;
        }

        getCollectionItems(list).forEach(function (item, index) {
            const badge = item.querySelector('.om-sort-position');
            if (badge) {
                badge.textContent = String(index + 1);
            }
        });
    }

    function getSortType(fieldGroup) {
        if (fieldGroup.classList.contains('field-collection-sortable--album-tracks')) {
            return 'album_tracks';
        }
        if (fieldGroup.classList.contains('field-collection-sortable--playlist-items')) {
            return 'playlist_items';
        }
        return null;
    }

    function extractParentId(form) {
        const match = form.action.match(
            /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/edit/i,
        );
        return match ? match[1] : null;
    }

    function collectOrderedIds(list) {
        const ids = [];
        getCollectionItems(list).forEach(function (item) {
            const input = item.querySelector('.om-entity-id-input');
            if (input && input.value) {
                ids.push(input.value);
            }
        });
        return ids;
    }

    let toastTimer = null;

    function showSortToast(message, type) {
        let toast = document.getElementById('om-sort-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'om-sort-toast';
            toast.className = 'om-sort-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.className = 'om-sort-toast om-sort-toast--' + (type || 'info');
        toast.hidden = false;

        if (toastTimer) {
            clearTimeout(toastTimer);
        }
        toastTimer = setTimeout(function () {
            toast.hidden = true;
        }, 2600);
    }

    function postSortOrder(type, parentId, ids, onDone) {
        const csrf = document.querySelector('meta[name="om-admin-sort-csrf"]')?.getAttribute('content') || '';
        const body = new FormData();
        body.append('type', type);
        body.append('parentId', parentId);
        ids.forEach(function (id) {
            body.append('ids[]', id);
        });

        return fetch('/admin/api/sort-collection', {
            method: 'POST',
            headers: { 'X-CSRF-Token': csrf },
            body: body,
            credentials: 'same-origin',
        })
            .then(function (response) {
                return response.json().then(function (data) {
                    return { ok: response.ok, data: data };
                });
            })
            .then(function (result) {
                if (result.ok && result.data.ok) {
                    showSortToast('Порядок сохранён', 'success');
                    if (onDone) {
                        onDone(true);
                    }
                    return;
                }
                showSortToast(result.data.error || 'Не удалось сохранить порядок', 'error');
                if (onDone) {
                    onDone(false);
                }
            })
            .catch(function () {
                showSortToast('Не удалось сохранить порядок', 'error');
                if (onDone) {
                    onDone(false);
                }
            });
    }

    function saveCollectionOrder(fieldGroup) {
        const type = getSortType(fieldGroup);
        const form = fieldGroup.closest('form');
        if (!type || !form) {
            return;
        }

        const parentId = extractParentId(form);
        const list = findSortableList(fieldGroup);
        if (!parentId || !list) {
            return;
        }

        const ids = collectOrderedIds(list);
        if (ids.length === 0) {
            return;
        }

        fieldGroup.classList.add('om-sortable--saving');
        postSortOrder(type, parentId, ids, function () {
            fieldGroup.classList.remove('om-sortable--saving');
            fieldGroup.classList.add('om-sortable--saved');
            setTimeout(function () {
                fieldGroup.classList.remove('om-sortable--saved');
            }, 1200);
        });
    }

    function scheduleCollectionAutoSave(fieldGroup) {
        if (!getSortType(fieldGroup)) {
            return;
        }
        if (fieldGroup._autosaveTimer) {
            clearTimeout(fieldGroup._autosaveTimer);
        }
        fieldGroup._autosaveTimer = setTimeout(function () {
            saveCollectionOrder(fieldGroup);
        }, 350);
    }

    function ensureDragHandle(header) {
        if (!header || header.querySelector('.om-drag-handle')) {
            return header?.querySelector('.om-drag-handle') || null;
        }

        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = 'om-drag-handle';
        handle.setAttribute('title', 'Перетащите для сортировки');
        handle.setAttribute('aria-label', 'Перетащите для сортировки');
        handle.innerHTML = GRIP_SVG;

        const badge = document.createElement('span');
        badge.className = 'om-sort-position';
        badge.setAttribute('aria-hidden', 'true');

        header.insertBefore(handle, header.firstChild);
        header.insertBefore(badge, handle.nextSibling);

        return handle;
    }

    function initSortableCollection(fieldGroup) {
        if (!isElement(fieldGroup) || !isSortableCollection(fieldGroup)) {
            return;
        }

        const list = findSortableList(fieldGroup);
        if (!isElement(list)) {
            return;
        }

        const dropParent = getItemsParent(list);
        if (!isElement(dropParent)) {
            return;
        }

        if (fieldGroup.dataset.sortableInit === '1' && fieldGroup._sortableDropParent === dropParent) {
            refreshCollectionItems(fieldGroup, list, dropParent);
            return;
        }

        fieldGroup.dataset.sortableInit = '1';
        fieldGroup._sortableDropParent = dropParent;
        list.classList.add('om-sortable-list');
        dropParent.classList.add('om-sortable-drop-target');

        const form = fieldGroup.closest('form');
        if (form && !form.dataset.sortableSubmitBound) {
            form.dataset.sortableSubmitBound = '1';
            form.addEventListener('submit', function () {
                document.querySelectorAll('[data-sortable-init="1"]').forEach(renumberSortInputs);
            });
        }

        let draggedItem = null;
        let dragPointerId = null;

        function clearDragState() {
            if (draggedItem) {
                draggedItem.classList.remove('om-sortable-item--dragging');
            }
            draggedItem = null;
            dragPointerId = null;
        }

        function moveBeforePointer(clientY) {
            if (!draggedItem || !dropParent.isConnected) {
                return;
            }

            const items = getCollectionItems(list).filter(function (item) {
                return item !== draggedItem;
            });

            for (const item of items) {
                const rect = item.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (clientY < mid) {
                    dropParent.insertBefore(draggedItem, item);
                    renumberSortInputs(fieldGroup);
                    return;
                }
            }

            dropParent.appendChild(draggedItem);
            renumberSortInputs(fieldGroup);
        }

        function bindItem(item) {
            if (!isElement(item) || !dropParent.contains(item)) {
                return;
            }

            const header = item.querySelector('.accordion-header') || item;
            const handle = ensureDragHandle(header);
            if (!handle || handle.dataset.bound === '1') {
                return;
            }
            handle.dataset.bound = '1';

            handle.addEventListener('pointerdown', function (event) {
                if (event.button !== 0) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();

                draggedItem = item;
                dragPointerId = event.pointerId;
                item.classList.add('om-sortable-item--dragging');
                handle.setPointerCapture(event.pointerId);
            });

            handle.addEventListener('pointermove', function (event) {
                if (!draggedItem || event.pointerId !== dragPointerId) {
                    return;
                }
                event.preventDefault();
                moveBeforePointer(event.clientY);
            });

            handle.addEventListener('pointerup', function (event) {
                if (event.pointerId !== dragPointerId) {
                    return;
                }
                clearDragState();
                renumberSortInputs(fieldGroup);
                scheduleCollectionAutoSave(fieldGroup);
            });

            handle.addEventListener('pointercancel', function (event) {
                if (event.pointerId !== dragPointerId) {
                    return;
                }
                clearDragState();
            });

            item.addEventListener('dragstart', function (event) {
                event.preventDefault();
            });
        }

        function refreshCollectionItems() {
            if (!dropParent.isConnected) {
                return;
            }
            getCollectionItems(list).forEach(bindItem);
            renumberSortInputs(fieldGroup);
        }

        fieldGroup._refreshCollectionItems = refreshCollectionItems;
        refreshCollectionItems();

        if (!fieldGroup._sortableObserver) {
            fieldGroup._sortableObserver = new MutationObserver(function () {
                refreshCollectionItems();
            });
            fieldGroup._sortableObserver.observe(dropParent, { childList: true, subtree: false });
        }
    }

    function refreshCollectionItems(fieldGroup, list, dropParent) {
        if (typeof fieldGroup._refreshCollectionItems === 'function') {
            fieldGroup._refreshCollectionItems();
            return;
        }
        getCollectionItems(list).forEach(function (item) {
            const header = item.querySelector('.accordion-header') || item;
            ensureDragHandle(header);
        });
        renumberSortInputs(fieldGroup);
    }

    function getTrackRowsForAlbum(tbody, albumId) {
        return Array.from(tbody.querySelectorAll('tr[data-track-sortable][data-album-id]')).filter(function (row) {
            return row.getAttribute('data-album-id') === albumId;
        });
    }

    function renumberTrackRows(rows) {
        rows.forEach(function (row, index) {
            const badge = row.querySelector('.om-track-sort-position');
            if (badge) {
                badge.textContent = String(index + 1);
            }
            const numberCell = row.querySelector('td[data-column="trackNumber"]');
            if (numberCell) {
                numberCell.textContent = String(index + 1);
            }
        });
    }

    function initTrackIndexSortable() {
        const tbody = document.querySelector('body.ea-index-Track .datagrid tbody');
        if (!isElement(tbody) || tbody.dataset.trackSortInit === '1') {
            return;
        }

        const sortableRows = tbody.querySelectorAll('tr[data-track-sortable]');
        if (sortableRows.length === 0) {
            return;
        }

        tbody.dataset.trackSortInit = '1';
        tbody.classList.add('om-track-sortable-body');

        let draggedRow = null;
        let dragPointerId = null;
        let draggedAlbumId = null;

        function clearTrackDragState() {
            if (draggedRow) {
                draggedRow.classList.remove('om-sortable-item--dragging');
            }
            draggedRow = null;
            dragPointerId = null;
            draggedAlbumId = null;
        }

        function ensureTrackHandle(row) {
            if (row.querySelector('.om-track-drag-handle')) {
                return row.querySelector('.om-track-drag-handle');
            }

            const firstCell = row.querySelector('td');
            if (!firstCell) {
                return null;
            }

            const handle = document.createElement('button');
            handle.type = 'button';
            handle.className = 'om-drag-handle om-track-drag-handle';
            handle.setAttribute('title', 'Перетащите для сортировки');
            handle.setAttribute('aria-label', 'Перетащите для сортировки');
            handle.innerHTML = GRIP_SVG;

            const badge = document.createElement('span');
            badge.className = 'om-sort-position om-track-sort-position';
            badge.setAttribute('aria-hidden', 'true');

            const wrap = document.createElement('div');
            wrap.className = 'om-track-sort-cell';
            wrap.appendChild(handle);
            wrap.appendChild(badge);
            firstCell.prepend(wrap);

            return handle;
        }

        function moveTrackRow(clientY) {
            if (!draggedRow || !draggedAlbumId) {
                return;
            }

            const group = getTrackRowsForAlbum(tbody, draggedAlbumId).filter(function (row) {
                return row !== draggedRow;
            });

            for (const row of group) {
                const rect = row.getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                if (clientY < mid) {
                    tbody.insertBefore(draggedRow, row);
                    renumberTrackRows(getTrackRowsForAlbum(tbody, draggedAlbumId));
                    return;
                }
            }

            const last = group[group.length - 1];
            if (last && last.nextElementSibling) {
                tbody.insertBefore(draggedRow, last.nextElementSibling);
            } else {
                tbody.appendChild(draggedRow);
            }
            renumberTrackRows(getTrackRowsForAlbum(tbody, draggedAlbumId));
        }

        function bindTrackRow(row) {
            if (row.dataset.trackSortBound === '1') {
                return;
            }
            row.dataset.trackSortBound = '1';

            const handle = ensureTrackHandle(row);
            if (!handle) {
                return;
            }

            const albumId = row.getAttribute('data-album-id');
            if (!albumId) {
                return;
            }

            handle.addEventListener('pointerdown', function (event) {
                if (event.button !== 0) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();

                draggedRow = row;
                draggedAlbumId = albumId;
                dragPointerId = event.pointerId;
                row.classList.add('om-sortable-item--dragging');
                handle.setPointerCapture(event.pointerId);
            });

            handle.addEventListener('pointermove', function (event) {
                if (!draggedRow || event.pointerId !== dragPointerId) {
                    return;
                }
                event.preventDefault();
                moveTrackRow(event.clientY);
            });

            handle.addEventListener('pointerup', function (event) {
                if (event.pointerId !== dragPointerId) {
                    return;
                }

                const albumRows = getTrackRowsForAlbum(tbody, draggedAlbumId || '');
                clearTrackDragState();

                const ids = albumRows
                    .map(function (r) {
                        return r.getAttribute('data-id');
                    })
                    .filter(Boolean);

                if (ids.length === 0 || !albumId) {
                    return;
                }

                tbody.classList.add('om-sortable--saving');
                postSortOrder('album_tracks', albumId, ids, function (ok) {
                    tbody.classList.remove('om-sortable--saving');
                    if (ok) {
                        tbody.classList.add('om-sortable--saved');
                        setTimeout(function () {
                            tbody.classList.remove('om-sortable--saved');
                        }, 1200);
                    }
                });
            });

            handle.addEventListener('pointercancel', function (event) {
                if (event.pointerId !== dragPointerId) {
                    return;
                }
                clearTrackDragState();
            });
        }

        sortableRows.forEach(bindTrackRow);
        Array.from(tbody.querySelectorAll('tr[data-track-sortable]')).forEach(function (row) {
            const albumId = row.getAttribute('data-album-id');
            if (albumId) {
                renumberTrackRows(getTrackRowsForAlbum(tbody, albumId));
            }
        });
    }

    function initAll() {
        document.querySelectorAll('[data-ea-collection-field]').forEach(function (el) {
            initSortableCollection(el);
        });

        document.querySelectorAll('.field-collection-sortable').forEach(function (el) {
            const fieldGroup = resolveFieldGroup(el);
            if (fieldGroup) {
                initSortableCollection(fieldGroup);
            }
        });

        initTrackIndexSortable();
    }

    let initTimer = null;
    function scheduleInit() {
        if (initTimer) {
            clearTimeout(initTimer);
        }
        initTimer = setTimeout(initAll, 60);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }

    document.addEventListener('ea.collection.item-added', scheduleInit);
    document.addEventListener('ea.collection.item-removed', scheduleInit);
    window.addEventListener('load', scheduleInit);
    document.addEventListener('turbo:load', scheduleInit);
    document.addEventListener('turbo:render', scheduleInit);
    document.addEventListener('turbo:frame-render', scheduleInit);
    document.addEventListener('turbo:before-cache', function () {
        document.querySelectorAll('[data-sortable-init]').forEach(function (el) {
            delete el.dataset.sortableInit;
            delete el._sortableDropParent;
        });
        document.querySelectorAll('[data-track-sort-init]').forEach(function (el) {
            delete el.dataset.trackSortInit;
        });
    });

    const pageObserver = new MutationObserver(scheduleInit);
    function observePage() {
        if (!isElement(document.body)) {
            document.addEventListener('DOMContentLoaded', observePage, { once: true });
            return;
        }
        pageObserver.observe(document.body, { childList: true, subtree: true });
    }
    observePage();
})();

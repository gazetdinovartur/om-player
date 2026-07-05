(() => {
    const root = document.querySelector('.track-upload');
    if (!root) return;

    const uploadUrl = root.dataset.uploadUrl;
    const dropzone = root.querySelector('[data-dropzone]');
    const fileInput = root.querySelector('[data-file-input]');
    const loading = root.querySelector('[data-loading]');
    const loadingLabel = root.querySelector('[data-loading-label]');
    const preview = root.querySelector('[data-preview]');
    const batchPreview = root.querySelector('[data-batch-preview]');
    const confirmForm = root.querySelector('[data-confirm-form]');
    const batchForm = root.querySelector('[data-batch-form]');
    const alertError = root.querySelector('[data-alert-error]');
    const alertSuccess = root.querySelector('[data-alert-success]');
    const resetBtn = root.querySelector('[data-reset]');
    const batchResetBtn = root.querySelector('[data-batch-reset]');
    const submitBtn = root.querySelector('[data-submit]');
    const submitSpinner = root.querySelector('[data-submit-spinner]');
    const batchSubmitBtn = root.querySelector('[data-batch-submit]');
    const batchSubmitSpinner = root.querySelector('[data-batch-submit-spinner]');
    const batchSubmitLabel = root.querySelector('[data-batch-submit-label]');
    const batchList = root.querySelector('[data-batch-list]');
    const batchItemsInput = root.querySelector('[data-batch-items-input]');
    const batchCount = root.querySelector('[data-batch-count]');

    const ACCEPT = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'];
    const EXT = ['.mp3', '.m4a', '.mp4', '.mpeg'];
    const MAX_BYTES = 64 * 1024 * 1024;

    const fields = {
        token: root.querySelector('[data-token-input]'),
        title: root.querySelector('[data-field-title]'),
        artist: root.querySelector('[data-field-artist]'),
        album: root.querySelector('[data-field-album]'),
        trackNumber: root.querySelector('[data-field-track-number]'),
        year: root.querySelector('[data-field-year]'),
        publish: root.querySelector('[data-field-publish]'),
        publishAlbum: root.querySelector('[data-field-publish-album]'),
    };

    const batchFields = {
        artist: root.querySelector('[data-batch-artist]'),
        album: root.querySelector('[data-batch-album]'),
        year: root.querySelector('[data-batch-year]'),
        publish: root.querySelector('[data-batch-publish]'),
        publishAlbum: root.querySelector('[data-batch-publish-album]'),
    };

    const coverImg = root.querySelector('[data-cover]');
    const coverPlaceholder = root.querySelector('[data-cover-placeholder]');
    const fileNameEl = root.querySelector('[data-file-name]');
    const durationMeta = root.querySelector('[data-duration-meta]');

    /** @type {Array<{token: string, preview: object, fileName: string}>} */
    let batchItems = [];

    function showError(message) {
        alertSuccess.classList.add('is-hidden');
        alertSuccess.textContent = '';
        alertError.textContent = message;
        alertError.classList.remove('is-hidden');
    }

    function showSuccess(message) {
        alertError.classList.add('is-hidden');
        alertError.textContent = '';
        alertSuccess.textContent = message;
        alertSuccess.classList.remove('is-hidden');
    }

    function hideAlerts() {
        alertError.classList.add('is-hidden');
        alertSuccess.classList.add('is-hidden');
    }

    function isAccepted(file) {
        const name = file.name.toLowerCase();
        if (EXT.some((ext) => name.endsWith(ext))) return true;
        if (ACCEPT.includes(file.type)) return true;
        return file.type.startsWith('audio/');
    }

    function setLoading(active, label) {
        loading.classList.toggle('is-hidden', !active);
        if (loadingLabel && label) loadingLabel.textContent = label;
        dropzone.style.pointerEvents = active ? 'none' : '';
    }

    function showPreviewState() {
        dropzone.classList.add('is-hidden');
        batchPreview.classList.add('is-hidden');
        preview.classList.remove('is-hidden');
    }

    function showBatchState() {
        dropzone.classList.add('is-hidden');
        preview.classList.add('is-hidden');
        batchPreview.classList.remove('is-hidden');
    }

    function resetUpload() {
        hideAlerts();
        fileInput.value = '';
        batchItems = [];
        preview.classList.add('is-hidden');
        batchPreview.classList.add('is-hidden');
        dropzone.classList.remove('is-hidden');
        confirmForm?.reset();
        batchForm?.reset();
        if (fields.publishAlbum) fields.publishAlbum.checked = true;
        if (batchFields.publishAlbum) batchFields.publishAlbum.checked = true;
        coverImg.classList.add('is-hidden');
        coverImg.removeAttribute('src');
        coverPlaceholder.classList.remove('is-hidden');
        fileNameEl.textContent = '';
        durationMeta.textContent = '';
        if (fields.token) fields.token.value = '';
        batchList.innerHTML = '';
        batchItemsInput.value = '';
    }

    function fillPreview(data, fileName) {
        const p = data.preview;
        fields.token.value = data.token;
        fields.title.value = p.title || '';
        fields.artist.value = p.artist || '';
        fields.album.value = p.album || '';
        fields.trackNumber.value = p.trackNumber ?? '';
        fields.year.value = p.year ?? '';

        fileNameEl.textContent = fileName || data.fileName || '';
        const metaParts = [p.durationLabel, p.genre].filter(Boolean);
        durationMeta.textContent = metaParts.join(' · ');

        if (p.coverDataUri) {
            coverImg.src = p.coverDataUri;
            coverImg.classList.remove('is-hidden');
            coverPlaceholder.classList.add('is-hidden');
        } else {
            coverImg.classList.add('is-hidden');
            coverPlaceholder.classList.remove('is-hidden');
        }

        showPreviewState();
    }

    function renderBatchList() {
        batchList.innerHTML = '';
        batchItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'track-upload__batch-item';
            li.dataset.index = String(index);

            const p = item.preview;
            const meta = [p.durationLabel, p.genre].filter(Boolean).join(' · ');

            li.innerHTML = `
                <div class="track-upload__batch-item-head">
                    <p class="track-upload__batch-file">${escapeHtml(item.fileName)}</p>
                    <button type="button" class="track-upload__batch-remove" data-remove-index="${index}" aria-label="Убрать файл">×</button>
                </div>
                <p class="track-upload__batch-meta">${escapeHtml(meta)}</p>
                <div class="track-upload__batch-row">
                    <label class="track-upload__field">
                        <span>Название</span>
                        <input type="text" data-batch-title value="${escapeAttr(p.title || '')}" required>
                    </label>
                    <label class="track-upload__field track-upload__field--narrow">
                        <span>№</span>
                        <input type="number" data-batch-track-number value="${escapeAttr(String(p.trackNumber ?? index + 1))}" min="1">
                    </label>
                </div>
            `;

            batchList.appendChild(li);
        });

        const count = batchItems.length;
        batchCount.textContent = `${count} ${pluralFiles(count)}`;
        batchSubmitLabel.textContent = `Сохранить все (${count})`;
        syncBatchSharedFromFirst();
    }

    function syncBatchSharedFromFirst() {
        if (batchItems.length === 0) return;
        const first = batchItems[0].preview;
        if (!batchFields.artist.value) batchFields.artist.value = first.artist || '';
        if (!batchFields.album.value) batchFields.album.value = first.album || '';
        if (!batchFields.year.value) batchFields.year.value = first.year ?? '';
    }

    function fillBatch(items) {
        batchItems = items.filter((item) => !item.error && item.token);
        const errors = items.filter((item) => item.error);
        if (errors.length > 0) {
            showError(`Не удалось обработать: ${errors.map((e) => e.fileName).join(', ')}`);
        }
        if (batchItems.length === 0) return;

        renderBatchList();
        showBatchState();
    }

    function collectBatchPayload() {
        const rows = batchList.querySelectorAll('.track-upload__batch-item');
        const items = [];
        rows.forEach((row, index) => {
            const item = batchItems[index];
            if (!item) return;
            items.push({
                token: item.token,
                title: row.querySelector('[data-batch-title]')?.value || '',
                trackNumber: row.querySelector('[data-batch-track-number]')?.value || '',
            });
        });
        return items;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/'/g, '&#39;');
    }

    function pluralFiles(count) {
        const mod10 = count % 10;
        const mod100 = count % 100;
        if (mod10 === 1 && mod100 !== 11) return 'файл';
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'файла';
        return 'файлов';
    }

    function validateFiles(files) {
        const accepted = [];
        for (const file of files) {
            if (!isAccepted(file)) {
                showError(`«${file.name}»: поддерживаются MP3 и M4A.`);
                return null;
            }
            if (file.size > MAX_BYTES) {
                showError(`«${file.name}» больше 64 МБ.`);
                return null;
            }
            accepted.push(file);
        }
        return accepted;
    }

    async function uploadFiles(files) {
        hideAlerts();
        const valid = validateFiles(files);
        if (!valid || valid.length === 0) return;

        setLoading(true, valid.length > 1 ? `Обрабатываем ${valid.length} файлов…` : 'Читаем файл и теги…');

        const body = new FormData();
        body.append('step', 'upload');
        valid.forEach((file) => body.append('audio[]', file));

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body,
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const raw = await response.text();
            let data = null;
            try {
                data = raw ? JSON.parse(raw) : null;
            } catch {
                if (response.status === 413) {
                    throw new Error('Файл слишком большой для веб‑сервера (nginx).');
                }
                if (raw.includes('/admin/login')) {
                    throw new Error('Сессия истекла — обновите страницу и войдите снова.');
                }
                throw new Error('Сервер вернул неожиданный ответ. Убедитесь, что запущен make server (лимит 64 МБ).');
            }

            if (!response.ok || !data?.ok) {
                throw new Error(data?.error || `Не удалось обработать файл (HTTP ${response.status}).`);
            }

            if (data.batch) {
                fillBatch(data.items);
            } else {
                fillPreview(data, valid[0].name);
            }
        } catch (err) {
            showError(err.message || 'Ошибка загрузки.');
        } finally {
            setLoading(false);
        }
    }

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', () => {
        const files = [...(fileInput.files || [])];
        if (files.length) uploadFiles(files);
    });

    ['dragenter', 'dragover'].forEach((event) => {
        dropzone.addEventListener(event, (e) => {
            e.preventDefault();
            dropzone.classList.add('is-dragover');
        });
    });

    ['dragleave', 'drop'].forEach((event) => {
        dropzone.addEventListener(event, (e) => {
            e.preventDefault();
            dropzone.classList.remove('is-dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = [...(e.dataTransfer?.files || [])];
        if (files.length) uploadFiles(files);
    });

    resetBtn?.addEventListener('click', resetUpload);
    batchResetBtn?.addEventListener('click', resetUpload);

    batchList?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-remove-index]');
        if (!btn) return;
        const index = Number(btn.dataset.removeIndex);
        batchItems.splice(index, 1);
        if (batchItems.length === 0) {
            resetUpload();
            return;
        }
        renderBatchList();
    });

    confirmForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlerts();

        submitBtn.disabled = true;
        submitSpinner.classList.remove('is-hidden');

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: new FormData(confirmForm),
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'Не удалось сохранить трек.');
            }

            showSuccess(data.message);
            preview.classList.add('is-hidden');
            dropzone.classList.remove('is-hidden');
            fileInput.value = '';
        } catch (err) {
            showError(err.message || 'Ошибка сохранения.');
        } finally {
            submitBtn.disabled = false;
            submitSpinner.classList.add('is-hidden');
        }
    });

    batchForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlerts();

        if (!batchFields.album?.value.trim()) {
            showError('Укажите название альбома — все треки сохраняются в один альбом.');
            batchFields.album?.focus();
            return;
        }

        const items = collectBatchPayload();
        if (items.length === 0) {
            showError('Нет файлов для сохранения.');
            return;
        }

        batchItemsInput.value = JSON.stringify(items);
        batchSubmitBtn.disabled = true;
        batchSubmitSpinner.classList.remove('is-hidden');

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body: new FormData(batchForm),
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'Не удалось сохранить треки.');
            }

            showSuccess(data.message);
            resetUpload();
        } catch (err) {
            showError(err.message || 'Ошибка сохранения.');
        } finally {
            batchSubmitBtn.disabled = false;
            batchSubmitSpinner.classList.add('is-hidden');
        }
    });

    if (window.__OM_UPLOAD_BATCH) {
        fillBatch(window.__OM_UPLOAD_BATCH);
        delete window.__OM_UPLOAD_BATCH;
    }
})();

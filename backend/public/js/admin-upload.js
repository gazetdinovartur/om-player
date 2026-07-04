(() => {
    const root = document.querySelector('.track-upload');
    if (!root) return;

    const uploadUrl = root.dataset.uploadUrl;
    const dropzone = root.querySelector('[data-dropzone]');
    const fileInput = root.querySelector('[data-file-input]');
    const loading = root.querySelector('[data-loading]');
    const preview = root.querySelector('[data-preview]');
    const confirmForm = root.querySelector('[data-confirm-form]');
    const alertError = root.querySelector('[data-alert-error]');
    const alertSuccess = root.querySelector('[data-alert-success]');
    const resetBtn = root.querySelector('[data-reset]');
    const submitBtn = root.querySelector('[data-submit]');
    const submitSpinner = root.querySelector('[data-submit-spinner]');

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

    const coverImg = root.querySelector('[data-cover]');
    const coverPlaceholder = root.querySelector('[data-cover-placeholder]');
    const fileNameEl = root.querySelector('[data-file-name]');
    const durationMeta = root.querySelector('[data-duration-meta]');

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

    function setLoading(active) {
        loading.classList.toggle('is-hidden', !active);
        dropzone.style.pointerEvents = active ? 'none' : '';
    }

    function showPreviewState() {
        dropzone.classList.add('is-hidden');
        preview.classList.remove('is-hidden');
    }

    function resetUpload() {
        hideAlerts();
        fileInput.value = '';
        preview.classList.add('is-hidden');
        dropzone.classList.remove('is-hidden');
        confirmForm.reset();
        fields.publishAlbum.checked = true;
        coverImg.classList.add('is-hidden');
        coverImg.removeAttribute('src');
        coverPlaceholder.classList.remove('is-hidden');
        fileNameEl.textContent = '';
        durationMeta.textContent = '';
        fields.token.value = '';
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

    async function uploadFile(file) {
        hideAlerts();

        if (!isAccepted(file)) {
            showError('Поддерживаются MP3 и M4A.');
            return;
        }
        if (file.size > MAX_BYTES) {
            showError('Файл больше 64 МБ. Сожмите или выберите другой.');
            return;
        }

        setLoading(true);

        const body = new FormData();
        body.append('step', 'upload');
        body.append('audio', file);

        try {
            const response = await fetch(uploadUrl, {
                method: 'POST',
                body,
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'Не удалось обработать файл.');
            }

            fillPreview(data, file.name);
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
        const file = fileInput.files?.[0];
        if (file) uploadFile(file);
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
        const file = e.dataTransfer?.files?.[0];
        if (file) uploadFile(file);
    });

    resetBtn?.addEventListener('click', resetUpload);

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
})();

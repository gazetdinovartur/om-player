(function () {
    'use strict';

    function measureNeedsToggle(text) {
        text.classList.add('is-clamped');
        text.classList.remove('is-expanded');
        const needsToggle = text.scrollHeight > text.clientHeight + 2;
        if (!needsToggle) {
            text.classList.remove('is-clamped');
        }
        return needsToggle;
    }

    function initDescription(block) {
        if (block.dataset.descriptionInit === '1') {
            return;
        }
        block.dataset.descriptionInit = '1';

        const text = block.querySelector('[data-description-text]');
        const toggle = block.querySelector('[data-description-toggle]');
        if (!text || !toggle) {
            return;
        }

        const updateToggleVisibility = () => {
            const needsToggle = measureNeedsToggle(text);
            toggle.hidden = !needsToggle;
            if (!needsToggle) {
                toggle.setAttribute('aria-expanded', 'false');
                toggle.textContent = 'Ещё';
            }
        };

        updateToggleVisibility();
        if (document.fonts?.ready) {
            document.fonts.ready.then(updateToggleVisibility);
        }
        requestAnimationFrame(() => requestAnimationFrame(updateToggleVisibility));

        toggle.addEventListener('click', () => {
            const expanded = !text.classList.contains('is-expanded');
            text.classList.toggle('is-expanded', expanded);
            text.classList.toggle('is-clamped', !expanded);
            toggle.textContent = expanded ? 'Свернуть' : 'Ещё';
            toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        });
    }

    function initAll(root) {
        (root || document).querySelectorAll('[data-album-description]').forEach(initDescription);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => initAll());
    } else {
        initAll();
    }

    document.addEventListener('turbo:load', () => initAll());
    document.addEventListener('turbo:render', () => initAll());
})();

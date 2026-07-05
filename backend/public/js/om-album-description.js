(function () {
    'use strict';

    const CLAMP_LINES = 3;

    function initDescription(block) {
        const text = block.querySelector('[data-description-text]');
        const toggle = block.querySelector('[data-description-toggle]');
        if (!text || !toggle) return;

        text.classList.add('is-clamped');
        const needsToggle = text.scrollHeight > text.clientHeight + 2;
        if (!needsToggle) {
            text.classList.remove('is-clamped');
            toggle.hidden = true;
            return;
        }

        toggle.hidden = false;
        toggle.addEventListener('click', () => {
            const expanded = text.classList.toggle('is-expanded');
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

(function () {
    'use strict';

    const DURATION_MS = 320;

    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function collapsedHeight(text) {
        const style = getComputedStyle(text);
        const lineHeight = parseFloat(style.lineHeight);
        const fontSize = parseFloat(style.fontSize);
        const lh = Number.isFinite(lineHeight) ? lineHeight : fontSize * 1.55;
        return Math.ceil(lh * 2);
    }

    function fullHeight(text) {
        return text.scrollHeight;
    }

    function measureNeedsToggle(wrap, text) {
        wrap.style.maxHeight = 'none';
        text.classList.remove('is-expanded', 'is-clamped');
        const needsToggle = fullHeight(text) > collapsedHeight(text) + 2;
        if (needsToggle) {
            wrap.style.maxHeight = collapsedHeight(text) + 'px';
            text.classList.add('is-clamped');
        } else {
            wrap.style.maxHeight = 'none';
        }
        return needsToggle;
    }

    function setExpandedState(wrap, text, toggle, expanded) {
        text.classList.toggle('is-expanded', expanded);
        text.classList.toggle('is-clamped', !expanded);
        toggle.textContent = expanded ? 'Свернуть' : 'Ещё';
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    function animateToggle(wrap, text, toggle, expand) {
        if (prefersReducedMotion()) {
            if (expand) {
                wrap.style.maxHeight = 'none';
            } else {
                wrap.style.maxHeight = collapsedHeight(text) + 'px';
            }
            setExpandedState(wrap, text, toggle, expand);
            return;
        }

        const collapsed = collapsedHeight(text);
        const full = fullHeight(text);

        if (expand) {
            wrap.style.maxHeight = wrap.scrollHeight + 'px';
            wrap.offsetHeight;
            wrap.style.maxHeight = full + 'px';
            setExpandedState(wrap, text, toggle, true);

            const onEnd = (e) => {
                if (e.propertyName !== 'max-height') return;
                wrap.removeEventListener('transitionend', onEnd);
                if (text.classList.contains('is-expanded')) {
                    wrap.style.maxHeight = 'none';
                }
            };
            wrap.addEventListener('transitionend', onEnd);
            return;
        }

        const current = wrap.scrollHeight;
        wrap.style.maxHeight = current + 'px';
        wrap.offsetHeight;
        wrap.style.maxHeight = collapsed + 'px';
        setExpandedState(wrap, text, toggle, false);
    }

    function initDescription(block) {
        if (block.dataset.descriptionInit === '1') {
            return;
        }
        block.dataset.descriptionInit = '1';

        const wrap = block.querySelector('[data-description-wrap]');
        const text = block.querySelector('[data-description-text]');
        const toggle = block.querySelector('[data-description-toggle]');
        if (!wrap || !text || !toggle) {
            return;
        }

        const updateToggleVisibility = () => {
            const expanded = text.classList.contains('is-expanded');
            if (expanded) {
                wrap.style.maxHeight = 'none';
                toggle.hidden = false;
                return;
            }
            const needsToggle = measureNeedsToggle(wrap, text);
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

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(updateToggleVisibility, DURATION_MS);
        });

        toggle.addEventListener('click', () => {
            const expand = !text.classList.contains('is-expanded');
            animateToggle(wrap, text, toggle, expand);
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

(function () {
    const STORAGE_KEY = 'om:theme';
    const root = document.documentElement;

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        document.querySelectorAll('om-player').forEach((el) => {
            if (!el.isConnected) return;
            el.setAttribute('theme', theme);
        });
        localStorage.setItem(STORAGE_KEY, theme);
    }

    function bindToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle || toggle.dataset.omBound) return;
        toggle.dataset.omBound = '1';
        toggle.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next);
        });
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    applyTheme(saved === 'dark' ? 'dark' : 'light');
    bindToggle();

    document.addEventListener('turbo:load', () => {
        applyTheme(localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light');
        bindToggle();
    });
})();

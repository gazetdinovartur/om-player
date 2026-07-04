(function () {
  let bound = false;

  function initMobileNav() {
    if (bound) return;

    const toggle = document.getElementById('site-menu-toggle');
    const menu = document.getElementById('site-mobile-menu');
    if (!toggle || !menu) return;

    bound = true;

    const open = () => {
      menu.classList.add('is-open');
      toggle.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Закрыть меню');
      menu.removeAttribute('hidden');
      document.body.classList.add('site-menu-open');
    };

    const close = () => {
      menu.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Открыть меню');
      menu.setAttribute('hidden', '');
      document.body.classList.remove('site-menu-open');
    };

    toggle.addEventListener('click', () => {
      if (menu.classList.contains('is-open')) close();
      else open();
    });

    menu.querySelector('.site-mobile-menu__backdrop')?.addEventListener('click', close);
    menu.querySelectorAll('.site-mobile-nav a').forEach((link) => {
      link.addEventListener('click', close);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) close();
    });

    document.addEventListener('turbo:before-visit', close);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }
})();

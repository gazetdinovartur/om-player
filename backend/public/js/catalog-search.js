(function () {
  let debounceTimer;

  function submitSearchForm(form) {
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }
    form.submit();
  }

  function initCatalogSearch() {
    const form = document.querySelector('.catalog-header__search .search-form');
    if (!form || form.dataset.searchBound) return;
    form.dataset.searchBound = '1';

    const input = form.querySelector('input[name="q"]');
    if (!input) return;

    input.addEventListener('input', () => {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => submitSearchForm(form), 350);
    });

    input.addEventListener('search', () => {
      window.clearTimeout(debounceTimer);
      submitSearchForm(form);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCatalogSearch);
  } else {
    initCatalogSearch();
  }

  document.addEventListener('turbo:load', initCatalogSearch);
  document.addEventListener('turbo:render', initCatalogSearch);
})();

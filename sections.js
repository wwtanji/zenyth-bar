const NOTEBOOK_SELECTOR = '[data-notebook]';
const TAB_SELECTOR = '[role="tab"]';
const PAGE_SELECTOR = '.notebook-page';
const NEXT_SELECTOR = '[data-notebook-next]';
const LIVE_CLASS = 'is-live';
const FLIPPED_CLASS = 'is-flipped';
const DEPTH_PROPERTY = '--depth';
const KEY_NEXT = 'ArrowRight';
const KEY_PREVIOUS = 'ArrowLeft';

function startNotebook(notebook) {
  const tabs = [...notebook.querySelectorAll(TAB_SELECTOR)];
  const pages = [...notebook.querySelectorAll(PAGE_SELECTOR)];
  let activeIndex = 0;

  const show = (index) => {
    activeIndex = index;
    tabs.forEach((tab, tabIndex) => {
      tab.setAttribute('aria-selected', String(tabIndex === index));
      tab.tabIndex = tabIndex === index ? 0 : -1;
    });
    pages.forEach((page, pageIndex) => {
      page.classList.toggle(FLIPPED_CLASS, pageIndex < index);
      page.style.setProperty(DEPTH_PROPERTY, Math.max(0, pageIndex - index));
      page.inert = pageIndex !== index;
    });
  };

  const focusTab = (index) => {
    show(index);
    tabs[index].focus();
  };

  pages.forEach((page, index) => {
    page.style.zIndex = pages.length - index;
  });
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => show(index));
    tab.addEventListener('keydown', (event) => {
      if (event.key === KEY_NEXT) focusTab((index + 1) % tabs.length);
      if (event.key === KEY_PREVIOUS) focusTab((index - 1 + tabs.length) % tabs.length);
    });
  });
  notebook.querySelector(NEXT_SELECTOR).addEventListener('click', () => show((activeIndex + 1) % pages.length));
  show(0);
  notebook.classList.add(LIVE_CLASS);
}

document.querySelectorAll(NOTEBOOK_SELECTOR).forEach(startNotebook);

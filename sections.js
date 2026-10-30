const NOTEBOOK_SELECTOR = '[data-notebook]';
const TAB_SELECTOR = '[role="tab"]';
const PAGE_SELECTOR = '.notebook-page';
const NEXT_SELECTOR = '[data-notebook-next]';
const BILL_SELECTOR = '[data-bill]';
const LIVE_CLASS = 'is-live';
const FLIPPED_CLASS = 'is-flipped';
const DEPTH_PROPERTY = '--depth';
const DRIFT_PROPERTY = '--drift';
const BILL_TRACK_CLASS = 'bill-track';
const BILL_SEPARATOR_CLASS = 'bill-sep';
const VISUALLY_HIDDEN_CLASS = 'visually-hidden';
const BILL_REPEATS = 8;
const BILL_DRIFT_SPEED = 0.45;
const KEY_NEXT = 'ArrowRight';
const KEY_PREVIOUS = 'ArrowLeft';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

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

function buildBillTrack(text) {
  const track = document.createElement('div');
  track.className = BILL_TRACK_CLASS;
  track.setAttribute('aria-hidden', 'true');
  for (let repeat = 0; repeat < BILL_REPEATS; repeat += 1) {
    const word = document.createElement('span');
    word.textContent = text;
    const separator = document.createElement('i');
    separator.className = BILL_SEPARATOR_CLASS;
    track.append(word, separator);
  }
  return track;
}

function startBill(bill) {
  const rows = [...bill.children].map((row) => {
    const text = row.dataset.billText;
    const track = buildBillTrack(text);
    const label = document.createElement('span');
    label.className = VISUALLY_HIDDEN_CLASS;
    label.textContent = text;
    row.replaceChildren(label, track);
    return { row, track, direction: Number(row.dataset.direction) };
  });
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

  let frameRequested = false;
  const drift = () => {
    frameRequested = false;
    rows.forEach(({ row, track, direction }) => {
      const rect = row.getBoundingClientRect();
      const distanceFromCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
      track.style.setProperty(DRIFT_PROPERTY, `${distanceFromCenter * BILL_DRIFT_SPEED * direction}px`);
    });
  };
  window.addEventListener('scroll', () => {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(drift);
  }, { passive: true });
  drift();
}

document.querySelectorAll(NOTEBOOK_SELECTOR).forEach(startNotebook);
document.querySelectorAll(BILL_SELECTOR).forEach(startBill);

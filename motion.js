const SCRIPTED_CLASS = 'js';
const REVEAL_SELECTOR = '[data-reveal]';
const REVEALED_CLASS = 'is-revealed';
const REVEAL_ORDER_PROPERTY = '--reveal-order';
const REVEAL_THRESHOLD = 0.2;
const WIPE_REVEAL = 'wipe';
const CURSOR_CLASS = 'cursor';
const CURSOR_ACTIVE_CLASS = 'is-active';
const CURSOR_VISIBLE_CLASS = 'is-visible';
const CURSOR_INTERACTIVE_SELECTOR = 'a, button, input, [data-cursor]';
const CURSOR_NATIVE_SELECTOR = 'iframe';
const CURSOR_REPLACES_NATIVE_CLASS = 'has-custom-cursor';
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const CURSOR_EASING = 0.22;

function assignRevealOrder(elements) {
  const countByParent = new Map();
  elements.forEach((element) => {
    const order = countByParent.get(element.parentElement) || 0;
    element.style.setProperty(REVEAL_ORDER_PROPERTY, order);
    countByParent.set(element.parentElement, order + 1);
  });
}

function groupByTrigger(elements) {
  const groups = new Map();
  elements.forEach((element) => {
    const trigger = element.dataset.reveal === WIPE_REVEAL ? element.parentElement : element;
    groups.set(trigger, [...(groups.get(trigger) || []), element]);
  });
  return groups;
}

function observeReveals() {
  const elements = [...document.querySelectorAll(REVEAL_SELECTOR)];
  assignRevealOrder(elements);
  const groups = groupByTrigger(elements);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        groups.get(entry.target).forEach((element) => element.classList.add(REVEALED_CLASS));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: REVEAL_THRESHOLD });
  groups.forEach((_, trigger) => observer.observe(trigger));
}

function followPointer() {
  const cursor = document.createElement('div');
  cursor.className = CURSOR_CLASS;
  document.body.append(cursor);
  document.documentElement.classList.add(CURSOR_REPLACES_NATIVE_CLASS);
  const target = { x: 0, y: 0 };
  const position = { x: 0, y: 0 };

  const render = () => {
    position.x += (target.x - position.x) * CURSOR_EASING;
    position.y += (target.y - position.y) * CURSOR_EASING;
    cursor.style.transform = `translate(${position.x}px, ${position.y}px)`;
    requestAnimationFrame(render);
  };

  document.addEventListener('pointermove', (event) => {
    target.x = event.clientX;
    target.y = event.clientY;
    cursor.classList.add(CURSOR_VISIBLE_CLASS);
  });
  document.addEventListener('pointerover', (event) => {
    cursor.classList.toggle(CURSOR_ACTIVE_CLASS, Boolean(event.target.closest(CURSOR_INTERACTIVE_SELECTOR)));
    if (event.target.matches(CURSOR_NATIVE_SELECTOR)) cursor.classList.remove(CURSOR_VISIBLE_CLASS);
  });
  document.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) cursor.classList.remove(CURSOR_VISIBLE_CLASS);
  });
  render();
}

function startMotion() {
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
  document.documentElement.classList.add(SCRIPTED_CLASS);
  observeReveals();
  if (window.matchMedia(FINE_POINTER_QUERY).matches) followPointer();
}

startMotion();

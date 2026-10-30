const HERO_SELECTOR = '.hero';
const EXPLORED_CLASS = 'is-explored';
const LIGHT_X_PROPERTY = '--light-x';
const LIGHT_Y_PROPERTY = '--light-y';
const LIGHT_SCALE_PROPERTY = '--light-scale';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const INTRO_MS = 1800;
const INTRO_DELAY_MS = 500;
const IDLE_MS = 2600;
const FOLLOW_EASING = 0.1;
const WANDER_CENTER_X = 0.5;
const WANDER_CENTER_Y = 0.55;
const WANDER_RANGE_X = 0.26;
const WANDER_RANGE_Y = 0.1;
const WANDER_SPEED_X = 0.00032;
const WANDER_SPEED_Y = 0.00051;
const WANDER_PHASE_Y = 1.3;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeOutCubic = (progress) => 1 - (1 - progress) ** 3;

function startHero(hero) {
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

  const input = { x: 0, y: 0, lastAt: -Infinity };
  const light = { x: null, y: null };
  let introStartedAt = null;
  let frameId = null;

  const rememberInput = (point) => {
    input.x = point.clientX;
    input.y = point.clientY;
    input.lastAt = performance.now();
    hero.classList.add(EXPLORED_CLASS);
  };

  const targetAt = (now, bounds) => {
    if (now - input.lastAt < IDLE_MS) return { x: input.x - bounds.left, y: input.y - bounds.top };
    return {
      x: bounds.width * (WANDER_CENTER_X + WANDER_RANGE_X * Math.sin(now * WANDER_SPEED_X)),
      y: bounds.height * (WANDER_CENTER_Y + WANDER_RANGE_Y * Math.sin(now * WANDER_SPEED_Y + WANDER_PHASE_Y)),
    };
  };

  const frame = (now) => {
    introStartedAt ??= now;
    const bounds = hero.getBoundingClientRect();
    const target = targetAt(now, bounds);
    light.x ??= target.x;
    light.y ??= target.y;
    light.x += (target.x - light.x) * FOLLOW_EASING;
    light.y += (target.y - light.y) * FOLLOW_EASING;
    const introProgress = clamp01((now - introStartedAt - INTRO_DELAY_MS) / INTRO_MS);
    hero.style.setProperty(LIGHT_X_PROPERTY, `${light.x}px`);
    hero.style.setProperty(LIGHT_Y_PROPERTY, `${light.y}px`);
    hero.style.setProperty(LIGHT_SCALE_PROPERTY, easeOutCubic(introProgress));
    frameId = requestAnimationFrame(frame);
  };

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && frameId === null) frameId = requestAnimationFrame(frame);
    if (!entry.isIntersecting && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }).observe(hero);

  hero.style.setProperty(LIGHT_SCALE_PROPERTY, 0);
  window.addEventListener('pointermove', rememberInput, { passive: true });
  window.addEventListener('touchmove', (event) => rememberInput(event.touches[0]), { passive: true });
  window.addEventListener('touchstart', (event) => rememberInput(event.touches[0]), { passive: true });
}

document.querySelectorAll(HERO_SELECTOR).forEach(startHero);

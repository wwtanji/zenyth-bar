const TERRACE_SELECTOR = '#terasa';
const TRACK_SELECTOR = '.terrace-track';
const STAGE_SELECTOR = '.terrace-stage';
const CLOCK_SELECTOR = '[data-clock]';
const MOMENT_SELECTOR = '[data-moment]';
const SCRUBBER_SELECTOR = '[data-scrubber]';
const FRAME_SELECTOR = '[data-scene-frame]';
const PATH_TRACK_SELECTOR = '[data-path-track]';
const PATH_TRAIL_SELECTOR = '[data-path-trail]';
const PATH_MARKS_SELECTOR = '[data-path-marks]';
const PATH_BEAD_SELECTOR = '[data-path-bead]';
const PINNED_CLASS = 'is-pinned';
const LIVE_CLASS = 'is-live';
const CLOCK_DIGIT_CLASS = 'clock-digit';
const CLOCK_REEL_CLASS = 'clock-reel';
const CLOCK_COLON_CLASS = 'clock-colon';
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SVG_CIRCLE = 'circle';
const SVG_TEXT = 'text';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const INSTANT_SCROLL = 'instant';
const OPENING_HOUR = 15;
const CLOSING_HOUR = 26;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const TOTAL_MINUTES = (CLOSING_HOUR - OPENING_HOUR) * MINUTES_PER_HOUR;
const MINUTE_STEP = 5;
const REEL_CELL_EM = 1.1;
const RING_GAP_PX = 14;
const LABEL_OFFSET_PX = 16;
const MARK_RADIUS_PX = 2.2;
const LABELLED_HOURS = [15, 18, 21, 24, 26];
const MOMENT_FADE_OPTIONS = { duration: 500, easing: 'ease-out' };
const MOMENT_FADE_KEYFRAMES = [
  { opacity: 0, transform: 'translateY(0.5rem)' },
  { opacity: 1, transform: 'none' },
];
const SCENE_PROPERTIES = {
  night: '--night',
  dusk: '--dusk',
  stars: '--stars',
  lights: '--lights',
  sunX: '--sun-x',
  sunY: '--sun-y',
  sunOpacity: '--sun-o',
  moonX: '--moon-x',
  moonY: '--moon-y',
  moonOpacity: '--moon-o',
};
const MOMENTS = [
  { from: 0, text: 'Otvárame o 15:00. Posúvaj nižšie a sleduj, ako sa deň na terase mení na noc.' },
  { from: 120, text: 'Popoludnie nad strechami Nitry. Prvé koktejly na slnku.' },
  { from: 240, text: 'Súmrak nad vežami a hradom. Svetlo sa mení každú minútu.' },
  { from: 360, text: 'V meste sa rozsvecujú okná. Pohovky, koktejl a výhľad.' },
  { from: 540, text: 'Od nedele do štvrtka zatvárame o polnoci.' },
  { from: 600, text: 'V piatok a sobotu sme tu do 02:00.' },
];

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const pad = (value) => String(value).padStart(2, '0');

function smoothstep(edgeStart, edgeEnd, value) {
  const amount = clamp01((value - edgeStart) / (edgeEnd - edgeStart));
  return amount * amount * (3 - 2 * amount);
}

function computeScene(hour) {
  const night = smoothstep(17.8, 21.6, hour);
  const sunProgress = clamp01((hour - 15) / 5);
  const moonProgress = clamp01((hour - 20) / 6);
  return {
    night,
    dusk: Math.max(0, 1 - Math.abs(hour - 19.4) / 2.4),
    stars: smoothstep(20.4, 22.6, hour),
    lights: smoothstep(18.8, 21, hour),
    sunX: lerp(78, 32, sunProgress),
    sunY: lerp(12, 40, sunProgress ** 1.4),
    sunOpacity: 1 - smoothstep(0.55, 0.95, sunProgress),
    moonX: lerp(86, 58, moonProgress),
    moonY: lerp(40, 12, moonProgress ** 0.8),
    moonOpacity: smoothstep(0, 0.3, moonProgress),
  };
}

function createSvgElement(tagName, attributes) {
  const element = document.createElementNS(SVG_NAMESPACE, tagName);
  Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
  return element;
}

function createReelDigit() {
  const digit = document.createElement('span');
  digit.className = CLOCK_DIGIT_CLASS;
  const reel = document.createElement('span');
  reel.className = CLOCK_REEL_CLASS;
  for (let value = 0; value < 10; value += 1) {
    const cell = document.createElement('span');
    cell.textContent = value;
    reel.append(cell);
  }
  digit.append(reel);
  return { digit, reel };
}

function createClock(clock) {
  const [hourTens, hourOnes, minuteTens, minuteOnes] = Array.from({ length: 4 }, createReelDigit);
  const colon = document.createElement('span');
  colon.className = CLOCK_COLON_CLASS;
  colon.textContent = ':';
  clock.replaceChildren(hourTens.digit, hourOnes.digit, colon, minuteTens.digit, minuteOnes.digit);
  clock.setAttribute('aria-hidden', 'true');

  const showDigit = (reel, value) => {
    reel.reel.style.transform = `translateY(${-value * REEL_CELL_EM}em)`;
  };

  return (minutesIntoNight) => {
    const dayMinutes = (OPENING_HOUR * MINUTES_PER_HOUR + minutesIntoNight) % (HOURS_PER_DAY * MINUTES_PER_HOUR);
    const hours = Math.floor(dayMinutes / MINUTES_PER_HOUR);
    const minutes = dayMinutes % MINUTES_PER_HOUR;
    showDigit(hourTens, Math.floor(hours / 10));
    showDigit(hourOnes, hours % 10);
    showDigit(minuteTens, Math.floor(minutes / 10));
    showDigit(minuteOnes, minutes % 10);
    return `${pad(hours)}:${pad(minutes)}`;
  };
}

function createHourLabel(track, length, at, point, hour) {
  const behind = track.getPointAtLength(Math.max(at - 1, 0));
  const ahead = track.getPointAtLength(Math.min(at + 1, length));
  const tangentLength = Math.hypot(ahead.x - behind.x, ahead.y - behind.y);
  const normalX = (ahead.y - behind.y) / tangentLength;
  const normalY = -(ahead.x - behind.x) / tangentLength;
  const anchor = Math.abs(normalX) < 0.3 ? 'middle' : normalX < 0 ? 'end' : 'start';
  const label = createSvgElement(SVG_TEXT, {
    x: point.x + normalX * LABEL_OFFSET_PX,
    y: point.y + normalY * LABEL_OFFSET_PX,
    'text-anchor': anchor,
    'dominant-baseline': 'middle',
  });
  label.textContent = pad(hour % HOURS_PER_DAY);
  return label;
}

function drawHourMarks(track, marks, length) {
  marks.replaceChildren();
  for (let hour = OPENING_HOUR; hour <= CLOSING_HOUR; hour += 1) {
    const at = (length * (hour - OPENING_HOUR)) / (CLOSING_HOUR - OPENING_HOUR);
    const point = track.getPointAtLength(at);
    marks.append(createSvgElement(SVG_CIRCLE, { cx: point.x, cy: point.y, r: MARK_RADIUS_PX }));
    if (LABELLED_HOURS.includes(hour)) marks.append(createHourLabel(track, length, at, point, hour));
  }
}

function createRing(frame, { track, trail, marks, bead }) {
  let length = 0;

  const layout = () => {
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    const radius = width / 2 + RING_GAP_PX;
    const outline = `M ${-RING_GAP_PX} ${height} V ${width / 2} A ${radius} ${radius} 0 0 1 ${width + RING_GAP_PX} ${width / 2} V ${height}`;
    track.setAttribute('d', outline);
    trail.setAttribute('d', outline);
    length = track.getTotalLength();
    trail.style.strokeDasharray = length;
    drawHourMarks(track, marks, length);
  };

  const update = (progress) => {
    trail.style.strokeDashoffset = length * (1 - progress);
    const point = track.getPointAtLength(length * progress);
    bead.setAttribute('cx', point.x);
    bead.setAttribute('cy', point.y);
  };

  return { layout, update };
}

function createMomentCaption(element, animate) {
  let current = null;
  return (minutesIntoNight) => {
    const moment = MOMENTS.findLast((candidate) => candidate.from <= minutesIntoNight);
    if (moment === current) return;
    current = moment;
    element.textContent = moment.text;
    if (animate) element.animate(MOMENT_FADE_KEYFRAMES, MOMENT_FADE_OPTIONS);
  };
}

function startTerrace() {
  const terrace = document.querySelector(TERRACE_SELECTOR);
  if (!terrace) return;
  const pinned = !window.matchMedia(REDUCED_MOTION_QUERY).matches;
  const track = terrace.querySelector(TRACK_SELECTOR);
  const stage = terrace.querySelector(STAGE_SELECTOR);
  const frame = terrace.querySelector(FRAME_SELECTOR);
  const scrubber = terrace.querySelector(SCRUBBER_SELECTOR);
  const showClock = createClock(terrace.querySelector(CLOCK_SELECTOR));
  const showMoment = createMomentCaption(terrace.querySelector(MOMENT_SELECTOR), pinned);
  const ring = createRing(frame, {
    track: terrace.querySelector(PATH_TRACK_SELECTOR),
    trail: terrace.querySelector(PATH_TRAIL_SELECTOR),
    marks: terrace.querySelector(PATH_MARKS_SELECTOR),
    bead: terrace.querySelector(PATH_BEAD_SELECTOR),
  });
  let progress = 0;
  let frameRequested = false;

  const render = () => {
    const minutesIntoNight = Math.round((progress * TOTAL_MINUTES) / MINUTE_STEP) * MINUTE_STEP;
    const scene = computeScene(OPENING_HOUR + (progress * TOTAL_MINUTES) / MINUTES_PER_HOUR);
    Object.entries(scene).forEach(([name, value]) => stage.style.setProperty(SCENE_PROPERTIES[name], value));
    scrubber.value = minutesIntoNight;
    scrubber.setAttribute('aria-valuetext', showClock(minutesIntoNight));
    showMoment(minutesIntoNight);
    ring.update(progress);
  };

  const scrollRange = () => track.offsetHeight - stage.offsetHeight;

  const readScrollProgress = () => clamp01(-track.getBoundingClientRect().top / scrollRange());

  const scrollToProgress = (target) => {
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: trackTop + target * scrollRange(), behavior: INSTANT_SCROLL });
  };

  const requestRender = () => {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(() => {
      frameRequested = false;
      progress = readScrollProgress();
      render();
    });
  };

  scrubber.addEventListener('input', () => {
    const target = Number(scrubber.value) / TOTAL_MINUTES;
    if (pinned) {
      scrollToProgress(target);
    } else {
      progress = target;
      render();
    }
  });

  new ResizeObserver(() => {
    ring.layout();
    if (pinned) progress = readScrollProgress();
    render();
  }).observe(frame);

  terrace.classList.add(LIVE_CLASS);
  if (pinned) {
    terrace.classList.add(PINNED_CLASS);
    window.addEventListener('scroll', requestRender, { passive: true });
  }
  progress = pinned ? readScrollProgress() : 0;
  ring.layout();
  render();
}

startTerrace();

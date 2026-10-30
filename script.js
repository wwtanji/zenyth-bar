const TIME_ZONE = 'Europe/Bratislava';
const LOCALE_PARTS = 'en-GB';
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const DAYS_PER_WEEK = 7;

const WEEKDAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const OPENS_ON_PHRASE = {
  Sun: 'v nedeľu',
  Mon: 'v pondelok',
  Tue: 'v utorok',
  Wed: 'v stredu',
  Thu: 'vo štvrtok',
  Fri: 'v piatok',
  Sat: 'v sobotu',
};

const STATUS_SELECTOR = '[data-open-status]';
const HOURS_ROW_SELECTOR = '.hours [data-days]';
const TODAY_CLASS = 'is-today';
const OPEN_ATTRIBUTE = 'data-open';

const MESSAGE_OPEN_UNTIL = 'Teraz otvorené do';
const MESSAGE_CLOSED_PREFIX = 'Zatvorené, otvárame';
const PHRASE_TODAY = 'dnes';
const PHRASE_TOMORROW = 'zajtra';

const hours = (open, close) => ({
  open: open * MINUTES_PER_HOUR,
  close: close * MINUTES_PER_HOUR,
});

const OPENING_HOURS = {
  Sun: hours(17, 24),
  Mon: hours(17, 24),
  Tue: hours(15, 24),
  Wed: hours(15, 24),
  Thu: hours(15, 24),
  Fri: hours(15, 26),
  Sat: hours(15, 26),
};

const weekdayAt = (dayIndex) => WEEKDAY_ORDER[(dayIndex + DAYS_PER_WEEK) % DAYS_PER_WEEK];
const scheduleAt = (dayIndex) => OPENING_HOURS[weekdayAt(dayIndex)];

function getBratislavaNow() {
  const parts = new Intl.DateTimeFormat(LOCALE_PARTS, {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const valueOf = (type) => parts.find((part) => part.type === type).value;
  return {
    day: WEEKDAY_ORDER.indexOf(valueOf('weekday')),
    minutes: Number(valueOf('hour')) * MINUTES_PER_HOUR + Number(valueOf('minute')),
  };
}

function formatClock(totalMinutes) {
  const wrapped = totalMinutes % MINUTES_PER_DAY;
  const hoursPart = String(Math.floor(wrapped / MINUTES_PER_HOUR)).padStart(2, '0');
  const minutesPart = String(wrapped % MINUTES_PER_HOUR).padStart(2, '0');
  return `${hoursPart}:${minutesPart}`;
}

function describeOpening(offset, day, open) {
  if (offset === 0) return `${PHRASE_TODAY} o ${formatClock(open)}`;
  if (offset === 1) return `${PHRASE_TOMORROW} o ${formatClock(open)}`;
  return `${OPENS_ON_PHRASE[weekdayAt(day + offset)]} o ${formatClock(open)}`;
}

function describeStatus({ day, minutes }) {
  const yesterday = scheduleAt(day - 1);
  if (yesterday && yesterday.close > MINUTES_PER_DAY && minutes < yesterday.close - MINUTES_PER_DAY) {
    return { isOpen: true, text: `${MESSAGE_OPEN_UNTIL} ${formatClock(yesterday.close)}` };
  }
  const today = scheduleAt(day);
  if (today && minutes >= today.open && minutes < today.close) {
    return { isOpen: true, text: `${MESSAGE_OPEN_UNTIL} ${formatClock(today.close)}` };
  }
  for (let offset = 0; offset <= DAYS_PER_WEEK; offset += 1) {
    const candidate = scheduleAt(day + offset);
    const alreadyPassedToday = offset === 0 && today && minutes >= today.open;
    if (candidate && !alreadyPassedToday) {
      return { isOpen: false, text: `${MESSAGE_CLOSED_PREFIX} ${describeOpening(offset, day, candidate.open)}` };
    }
  }
  return { isOpen: false, text: '' };
}

function highlightToday(day) {
  document.querySelectorAll(HOURS_ROW_SELECTOR).forEach((row) => {
    const days = row.dataset.days.split(' ').map(Number);
    row.classList.toggle(TODAY_CLASS, days.includes(day));
  });
}

function showOpenStatus() {
  const now = getBratislavaNow();
  const status = describeStatus(now);
  document.querySelectorAll(STATUS_SELECTOR).forEach((element) => {
    element.textContent = status.text;
    element.setAttribute(OPEN_ATTRIBUTE, String(status.isOpen));
  });
  highlightToday(now.day);
}

showOpenStatus();

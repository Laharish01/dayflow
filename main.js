// ─── main.js ──────────────────────────────────────────────────────────────────
// App entry point. Initialises all modules and manages tab switching.
// ─────────────────────────────────────────────────────────────────────────────

import { DAY_FULL, validateStreak } from './storage.js';
import { initTheme }           from './theme.js';
import { initToday, render as renderToday, renderMiniChart } from './today.js';
import { initSchedule, renderSchedules }   from './schedule.js';
import { initAnalytics, renderAnalytics }  from './analytics.js';
import { checkOnComplete }                 from './notifications.js';

// ── Header date ───────────────────────────────────────────────────────────────
const now = new Date();
document.getElementById('header-day').textContent      = DAY_FULL[now.getDay()];
document.getElementById('header-date-str').textContent = now.toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
});

// ── Theme ─────────────────────────────────────────────────────────────────────
initTheme();

// ── Tab switching ─────────────────────────────────────────────────────────────
const TAB_NAMES = ['today', 'schedule', 'analytics'];
let currentTab  = 'today';

window.switchTab = function switchTab(name) {
  currentTab = name;

  // Desktop tab pills
  document.querySelectorAll('.tabs-desktop .tab').forEach((t, i) =>
    t.classList.toggle('active', TAB_NAMES[i] === name)
  );

  // Mobile bottom-nav buttons
  TAB_NAMES.forEach(n =>
    document.getElementById('bnav-' + n)?.classList.toggle('active', n === name)
  );

  // Panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');

  if (name === 'today')     renderToday();
  if (name === 'schedule')  renderSchedules();
  if (name === 'analytics') renderAnalytics();
};

// Re-render today when schedules are created/edited/deleted
window.addEventListener('schedules-changed', () => {
  if (currentTab === 'today') renderToday();
});

// ── Boot ──────────────────────────────────────────────────────────────────────
// Validate streak first — resets to 0 if user missed a day since last visit
validateStreak();
initToday();
initSchedule();
initAnalytics();
// Notifications module is initialised lazily inside today.js (no polling)

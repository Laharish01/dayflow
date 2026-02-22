// ─── today.js ─────────────────────────────────────────────────────────────────
// Renders the "Today" tab: progress bar, scheduled tasks, ad-hoc tasks,
// sidebar streak, mini chart, and quick stats.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getSchedules, getHistory, toggleScheduledDone,
  getAdhoc, getAdhocForDate, addAdhocTask, toggleAdhocDone, deleteAdhocTask,
  getStreak, updateStreak,
  todayStr, dateStrOf, dayOfWeek, last7Days, fmtTime, esc, DAY_NAMES,
} from './storage.js';
import { checkOnComplete } from './notifications.js';

// ── SVG snippets ──────────────────────────────────────────────────────────────
const CHECK_SVG = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
  <path d="M2 6l3 3 5-5" stroke="#0c0c0f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const DEL_SVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

// ── Public API ────────────────────────────────────────────────────────────────
export function initToday() {
  const input = document.getElementById('adhoc-input');
  input.addEventListener('keydown', e => { if (e.key === 'Enter') _handleAdd(); });
  document.getElementById('adhoc-add-btn').addEventListener('click', _handleAdd);

  // Expose toggle/delete handlers globally for inline onclick attributes
  window.Today = {
    toggleSched: id => {
      toggleScheduledDone(todayStr(), id);
      checkOnComplete(id);  // fires late warning if applicable
      updateStreak();       // O(1) cached streak update
      render();
    },
    toggleAdhoc: id => {
      toggleAdhocDone(todayStr(), id);
      updateStreak();       // ad-hoc completions also count toward streak
      render();
    },
    deleteAdhoc: (e, id) => {
      e.stopPropagation();
      deleteAdhocTask(todayStr(), id);
      render();
    },
  };

  render();
}

export function render() {
  const today     = todayStr();
  const dow       = dayOfWeek(today);
  const scheduled = getSchedules().filter(s => s.days.includes(dow));
  const history   = getHistory()[today] || {};
  const adhoc     = getAdhocForDate(today);

  _renderScheduled(scheduled, history);
  _renderAdhoc(adhoc);
  _renderProgress(scheduled, history, adhoc);
  renderMiniChart();
  _renderSidebarStats(scheduled, adhoc);
}

export function renderMiniChart() {
  const el        = document.getElementById('mini-week-chart');
  const history   = getHistory();
  const schedules = getSchedules();
  const adhoc     = getAdhoc();
  const today     = todayStr();

  el.innerHTML = last7Days().map(ds => {
    const dow   = dayOfWeek(ds);
    const sched = schedules.filter(s => s.days.includes(dow));
    const h     = history[ds] || {};
    const a     = adhoc[ds]   || [];
    const total = sched.length + a.length;
    const done  = sched.filter(s => h[s.id]).length + a.filter(t => t.done).length;
    const pct   = total === 0 ? 0 : Math.round(done / total * 100);

    return `<div class="week-day-col">
      <div class="week-bar-wrap">
        <div class="week-bar ${ds === today ? 'bar-today' : ''}"
             style="height:${Math.max(4, pct)}%"
             title="${done}/${total} (${pct}%)"></div>
      </div>
      <div class="week-day-label">${DAY_NAMES[dow]}</div>
    </div>`;
  }).join('');
}

// ── Scheduled tasks ───────────────────────────────────────────────────────────
function _renderScheduled(scheduled, history) {
  const el = document.getElementById('scheduled-today');

  if (!scheduled.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📅</div>No scheduled tasks today</div>`;
    return;
  }

  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  el.innerHTML = scheduled.map(s => {
    const done = !!history[s.id];
    let cls  = '';
    let badge = `<span class="task-badge badge-scheduled">scheduled</span>`;

    if (!done && s.time) {
      const [h, m] = s.time.split(':').map(Number);
      const dur    = parseInt(s.duration) || 30;
      if (nowMin > h * 60 + m + dur) {
        cls   = 'task-overdue';
        badge = `<span class="task-badge badge-late">late</span>`;
      } else if (nowMin >= h * 60 + m - 10) {
        cls   = 'task-now';
        badge = `<span class="task-badge badge-now">now</span>`;
      }
    }

    const meta = s.time
      ? `${fmtTime(s.time)}${s.duration ? ' · ' + s.duration + ' min' : ''}`
      : 'recurring';

    return `<div class="task-item ${done ? 'completed' : ''} ${cls}"
                 onclick="Today.toggleSched('${s.id}')">
      <div class="task-check">${CHECK_SVG}</div>
      <div class="task-info">
        <div class="task-name">${esc(s.name)}</div>
        <div class="task-meta">${meta}</div>
      </div>
      ${badge}
    </div>`;
  }).join('');
}

// ── Ad-hoc tasks ──────────────────────────────────────────────────────────────
function _renderAdhoc(adhoc) {
  const el = document.getElementById('adhoc-today');

  if (!adhoc.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">➕</div>No ad-hoc tasks. Add one above!</div>`;
    return;
  }

  el.innerHTML = adhoc.map(t => `
    <div class="task-item ${t.done ? 'completed' : ''}" onclick="Today.toggleAdhoc('${t.id}')">
      <div class="task-check">${CHECK_SVG}</div>
      <div class="task-info">
        <div class="task-name">${esc(t.name)}</div>
        <div class="task-meta">added today</div>
      </div>
      <span class="task-badge badge-adhoc">ad-hoc</span>
      <button class="task-delete"
              onclick="Today.deleteAdhoc(event,'${t.id}')"
              aria-label="Delete task">${DEL_SVG}</button>
    </div>`).join('');
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function _renderProgress(scheduled, history, adhoc) {
  const total = scheduled.length + adhoc.length;
  const done  = scheduled.filter(s => history[s.id]).length
              + adhoc.filter(t => t.done).length;
  const pct   = total === 0 ? 0 : Math.round(done / total * 100);

  document.getElementById('progress-text').textContent = `${done} / ${total} completed`;
  document.getElementById('progress-pct').textContent  = `${pct}%`;
  document.getElementById('progress-fill').style.width = `${pct}%`;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function _renderSidebarStats(scheduled, adhoc) {
  // O(1) — reads cached value written by updateStreak()
  document.getElementById('streak-count').textContent = getStreak().count;

  document.getElementById('quick-stats').innerHTML = `
    <div class="stat-row">
      <span class="stat-lbl">Active schedules</span>
      <span class="stat-val accent">${getSchedules().length}</span>
    </div>
    <div class="stat-row">
      <span class="stat-lbl">Ad-hoc today</span>
      <span class="stat-val accent2">${adhoc.length}</span>
    </div>
    <div class="stat-row">
      <span class="stat-lbl">Scheduled today</span>
      <span class="stat-val accent3">${scheduled.length}</span>
    </div>`;
}

// ── Add handler ───────────────────────────────────────────────────────────────
function _handleAdd() {
  const input = document.getElementById('adhoc-input');
  const name  = input.value.trim();
  if (!name) return;
  addAdhocTask(todayStr(), name);
  input.value = '';
  render();
}

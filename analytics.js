// ─── analytics.js ─────────────────────────────────────────────────────────────
// Renders the "Analytics" tab: stat cards, 7-day bar chart, task breakdown.
// ─────────────────────────────────────────────────────────────────────────────

import {
  getSchedules, getHistory, getAdhoc,
  todayStr, dayOfWeek, last7Days, esc, DAY_NAMES,
} from './storage.js';

// ── Public API ────────────────────────────────────────────────────────────────
export function initAnalytics() {
  // Nothing to bind at init; render is called on tab switch
}

export function renderAnalytics() {
  const days    = last7Days();
  const dayData = _computeDayData(days);

  _renderStatCards(dayData);
  _renderWeekChart(dayData);
  _renderBreakdown(days);
}

// ── Stat cards ────────────────────────────────────────────────────────────────
function _renderStatCards(dayData) {
  const totalDone  = dayData.reduce((a, d) => a + d.done,  0);
  const totalTasks = dayData.reduce((a, d) => a + d.total, 0);
  const avg        = totalTasks === 0 ? 0 : Math.round(totalDone / totalTasks * 100);
  const perfect    = dayData.filter(d => d.total > 0 && d.done === d.total).length;

  document.getElementById('analytics-stats').innerHTML = `
    <div class="stat-card"><div class="stat-number accent">${avg}%</div><div class="stat-label">avg completion</div></div>
    <div class="stat-card"><div class="stat-number accent3">${totalDone}</div><div class="stat-label">tasks done</div></div>
    <div class="stat-card"><div class="stat-number accent2">${perfect}</div><div class="stat-label">perfect days</div></div>
    <div class="stat-card"><div class="stat-number muted">${getSchedules().length}</div><div class="stat-label">schedules</div></div>`;
}

// ── 7-day bar chart ───────────────────────────────────────────────────────────
function _renderWeekChart(dayData) {
  const today = todayStr();

  document.getElementById('analytics-chart').innerHTML = dayData.map(dd => `
    <div class="week-day-col">
      <div class="week-pct">${dd.pct}%</div>
      <div class="week-bar-wrap">
        <div class="week-bar ${dd.ds === today ? 'bar-today' : ''}"
             style="height:${Math.max(4, dd.pct)}%"
             title="${dd.done}/${dd.total} (${dd.pct}%)"></div>
      </div>
      <div class="week-day-label">${DAY_NAMES[dd.dow]}</div>
    </div>`).join('');
}

// ── Task breakdown ────────────────────────────────────────────────────────────
function _renderBreakdown(days) {
  const el        = document.getElementById('task-breakdown');
  const schedules = getSchedules();
  const history   = getHistory();
  const adhoc     = getAdhoc();

  if (!schedules.length) {
    el.innerHTML = `<div class="empty">No scheduled tasks to analyze yet</div>`;
    return;
  }

  // Per-schedule completion rate this week
  const rows = schedules.map(s => {
    let possible = 0, done = 0;
    days.forEach(ds => {
      if (s.days.includes(dayOfWeek(ds))) {
        possible++;
        if ((history[ds] || {})[s.id]) done++;
      }
    });
    return { label: s.name, done, possible, pct: possible === 0 ? 0 : Math.round(done / possible * 100), type: 'scheduled' };
  });

  // Ad-hoc summary row
  const adhocDone  = days.reduce((a, ds) => a + (adhoc[ds] || []).filter(t => t.done).length, 0);
  const adhocTotal = days.reduce((a, ds) => a + (adhoc[ds] || []).length, 0);
  if (adhocTotal > 0) {
    rows.push({
      label: 'Ad-hoc tasks',
      done: adhocDone,
      possible: adhocTotal,
      pct: Math.round(adhocDone / adhocTotal * 100),
      type: 'adhoc',
    });
  }

  el.innerHTML = rows.map(r => `
    <div class="breakdown-row">
      <div class="breakdown-header">
        <span class="breakdown-name">${esc(r.label)}</span>
        <span class="breakdown-count ${r.type === 'adhoc' ? 'accent2' : 'accent'}">${r.done}/${r.possible}</span>
      </div>
      <div class="breakdown-bar-wrap">
        <div class="breakdown-bar ${r.type === 'adhoc' ? 'bar-adhoc' : ''}" style="width:${r.pct}%"></div>
      </div>
    </div>`).join('');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _computeDayData(days) {
  const history   = getHistory();
  const schedules = getSchedules();
  const adhoc     = getAdhoc();

  return days.map(ds => {
    const dow   = dayOfWeek(ds);
    const sched = schedules.filter(s => s.days.includes(dow));
    const h     = history[ds] || {};
    const a     = adhoc[ds]   || [];
    const total = sched.length + a.length;
    const done  = sched.filter(s => h[s.id]).length + a.filter(t => t.done).length;
    return { ds, dow, done, total, pct: total === 0 ? 0 : Math.round(done / total * 100) };
  });
}

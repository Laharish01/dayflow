// ─── storage.js ───────────────────────────────────────────────────────────────
// Central data layer. All localStorage reads/writes go through here.
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = {
  schedules: 'df_schedules',
  history:   'df_history',
  adhoc:     'df_adhoc',
  theme:     'df_theme',
  streak:    'df_streak',   // { count: number, lastPerfectDay: "YYYY-MM-DD" | null }
};

function _load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function _save(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.warn('DayFlow: storage quota exceeded — pruning history older than 90 days…');
      _pruneOldHistory();
      // Retry once after pruning
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e2) {
        console.error('DayFlow: save failed even after pruning', e2);
      }
    }
  }
}

// Keep only the last 90 days of history and ad-hoc data
function _pruneOldHistory() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  for (const key of [KEYS.history, KEYS.adhoc]) {
    const data = _load(key) || {};
    for (const dateStr of Object.keys(data)) {
      if (dateStr < cutoffStr) delete data[dateStr];
    }
    try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* best effort */ }
  }
}

// ── Schedules ─────────────────────────────────────────────────────────────────
export function getSchedules()      { return _load(KEYS.schedules) || []; }
export function saveSchedules(list) { _save(KEYS.schedules, list); }

export function upsertSchedule(sched) {
  const list = getSchedules();
  const idx  = list.findIndex(s => s.id === sched.id);
  if (idx >= 0) list[idx] = sched;
  else list.push(sched);
  saveSchedules(list);
}

export function deleteSchedule(id) {
  saveSchedules(getSchedules().filter(s => s.id !== id));
}

// ── Completion history ────────────────────────────────────────────────────────
// Shape: { [dateStr]: { [scheduleId]: true } }
export function getHistory()    { return _load(KEYS.history) || {}; }
export function saveHistory(h)  { _save(KEYS.history, h); }

export function toggleScheduledDone(dateStr, schedId) {
  const h = getHistory();
  if (!h[dateStr]) h[dateStr] = {};
  h[dateStr][schedId] = !h[dateStr][schedId];
  saveHistory(h);
}

// ── Ad-hoc tasks ──────────────────────────────────────────────────────────────
// Shape: { [dateStr]: [{id, name, done, createdAt}] }
export function getAdhoc()          { return _load(KEYS.adhoc) || {}; }
export function saveAdhoc(d)        { _save(KEYS.adhoc, d); }

export function getAdhocForDate(dateStr) {
  return (getAdhoc()[dateStr] || []);
}

export function addAdhocTask(dateStr, name) {
  const all = getAdhoc();
  if (!all[dateStr]) all[dateStr] = [];
  all[dateStr].push({ id: uid(), name, done: false, createdAt: new Date().toISOString() });
  saveAdhoc(all);
}

export function toggleAdhocDone(dateStr, id) {
  const all  = getAdhoc();
  const task = (all[dateStr] || []).find(x => x.id === id);
  if (task) task.done = !task.done;
  saveAdhoc(all);
}

export function deleteAdhocTask(dateStr, id) {
  const all = getAdhoc();
  all[dateStr] = (all[dateStr] || []).filter(x => x.id !== id);
  saveAdhoc(all);
}

// ── Theme preference ──────────────────────────────────────────────────────────
export function getTheme()         { return _load(KEYS.theme) || 'dark'; }
export function saveTheme(theme)   { _save(KEYS.theme, theme); }

// ── Streak ────────────────────────────────────────────────────────────────────
// Cached as { count: number, lastPerfectDay: "YYYY-MM-DD" | null }
// O(1) read — never iterates history.
export function getStreak() {
  return _load(KEYS.streak) || { count: 0, lastPerfectDay: null };
}
export function saveStreak(s) { _save(KEYS.streak, s); }

/**
 * Call on every task toggle. If today just became fully complete,
 * increments (or starts) the streak. If today was un-completed, does nothing
 * (we don't decrement mid-day; validateStreak on next boot handles breaks).
 */
export function updateStreak() {
  const today     = todayStr();
  const dow       = dayOfWeek(today);
  const scheduled = getSchedules().filter(s => s.days.includes(dow));
  const history   = getHistory()[today] || {};
  const adhoc     = (getAdhoc()[today] || []);

  const total = scheduled.length + adhoc.length;
  const done  = scheduled.filter(s => history[s.id]).length
              + adhoc.filter(t => t.done).length;

  // Nothing to count if there were no tasks, or today isn't fully done yet
  if (total === 0 || done < total) return;

  const streak    = getStreak();
  const yesterday = _offsetDay(-1);

  if (streak.lastPerfectDay === today) return; // already counted today

  if (streak.lastPerfectDay === yesterday) {
    saveStreak({ count: streak.count + 1, lastPerfectDay: today });
  } else {
    // Gap in streak — start fresh
    saveStreak({ count: 1, lastPerfectDay: today });
  }
}

/**
 * Call once on app boot. Resets streak to 0 if the user missed a day.
 */
export function validateStreak() {
  const streak    = getStreak();
  const yesterday = _offsetDay(-1);

  if (streak.lastPerfectDay && streak.lastPerfectDay < yesterday) {
    saveStreak({ count: 0, lastPerfectDay: null });
  }
}

function _offsetDay(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dateStrOf(d);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export function dateStrOf(d) {
  return d.toISOString().split('T')[0];
}

export function dayOfWeek(dateStr) {
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day).getDay();
}

export function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return dateStrOf(d);
  });
}

export function fmtTime(t) {
  const [h, m] = t.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
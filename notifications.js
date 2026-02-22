// ─── notifications.js ─────────────────────────────────────────────────────────
// Shows a warning popup when the user marks a scheduled task as done late.
// Called by today.js on each scheduled-task toggle — no polling needed.
// ─────────────────────────────────────────────────────────────────────────────

import { getSchedules, getHistory, todayStr, fmtTime, esc } from './storage.js';

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call this immediately after toggling a scheduled task done.
 * If the task was completed past its deadline, shows a late warning.
 */
export function checkOnComplete(schedId) {
  const today   = todayStr();
  const history = getHistory()[today] || {};

  // Only fire when marking done (not un-done)
  if (!history[schedId]) return;

  const sched = getSchedules().find(s => s.id === schedId);
  if (!sched || !sched.time) return;

  const now    = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [h, m] = sched.time.split(':').map(Number);
  const dur    = parseInt(sched.duration) || 30;

  const deadlineMin = h * 60 + m + dur;
  if (nowMin > deadlineMin) {
    const lateBy = nowMin - deadlineMin;
    _showWarning(sched, lateBy);
  }
}

export function dismiss() {
  const el = document.getElementById('late-warning-overlay');
  if (el) {
    el.classList.remove('lw-visible');
    setTimeout(() => el.remove(), 300);
  }
}

// ── Internal ──────────────────────────────────────────────────────────────────

let _autoDismissTimer = null;

function _showWarning(sched, lateByMin) {
  // Remove any existing warning
  document.getElementById('late-warning-overlay')?.remove();
  clearTimeout(_autoDismissTimer);

  const hrs     = Math.floor(lateByMin / 60);
  const mins    = lateByMin % 60;
  const lateStr = hrs > 0 ? `${hrs}h ${mins}m late` : `${mins}m late`;
  const due     = fmtTime(sched.time);

  const el = document.createElement('div');
  el.id    = 'late-warning-overlay';
  el.innerHTML = `
    <div class="lw-box" role="alert" aria-live="assertive">
      <div class="lw-header">
        <span class="lw-icon">⏰</span>
        <div>
          <div class="lw-title">Completed late</div>
          <div class="lw-sub">${lateStr} · was due ${due}</div>
        </div>
      </div>
      <div class="lw-list">
        <div class="lw-task">
          <span class="lw-dot"></span>
          <span><strong>${esc(sched.name)}</strong></span>
        </div>
      </div>
      <div class="lw-actions">
        <button class="lw-btn lw-dismiss" onclick="Notifications.dismiss()">Got it</button>
      </div>
    </div>`;

  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('lw-visible'));

  // Auto-dismiss after 6 s
  _autoDismissTimer = setTimeout(dismiss, 6000);
}

// Expose dismiss globally for inline onclick
window.Notifications = { dismiss };

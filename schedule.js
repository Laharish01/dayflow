// ─── schedule.js ──────────────────────────────────────────────────────────────
// Manages the "Schedules" tab: list, create, edit, delete recurring tasks.
// ─────────────────────────────────────────────────────────────────────────────

import { getSchedules, upsertSchedule, deleteSchedule, uid, fmtTime, esc } from './storage.js';

const DAY_LABELS = 'SMTWTFS'.split('');

let _editingId = null;

// ── Public API ────────────────────────────────────────────────────────────────
export function initSchedule() {
  // Individual day chips
  document.querySelectorAll('#day-picker .day-chip').forEach(c =>
    c.addEventListener('click', () => c.classList.toggle('active'))
  );

  // Quick-select buttons
  document.getElementById('days-everyday').addEventListener('click', () => _selectDays([0,1,2,3,4,5,6]));
  document.getElementById('days-weekdays').addEventListener('click', () => _selectDays([1,2,3,4,5]));
  document.getElementById('days-weekend').addEventListener('click',  () => _selectDays([0,6]));
  document.getElementById('days-clear').addEventListener('click',    () => _selectDays([]));

  // Modal buttons
  document.getElementById('new-schedule-btn').addEventListener('click', () => openModal());
  document.getElementById('sched-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('sched-modal-save').addEventListener('click', _save);
  document.getElementById('schedule-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Expose handlers for inline onclick
  window.Schedule = {
    edit: id => { const s = getSchedules().find(x => x.id === id); if (s) openModal(s); },
    del:  id => {
      if (!confirm('Delete this schedule?')) return;
      deleteSchedule(id);
      renderSchedules();
      window.dispatchEvent(new CustomEvent('schedules-changed'));
    },
  };

  renderSchedules();
}

export function renderSchedules() {
  const schedules = getSchedules();
  const el        = document.getElementById('schedules-list');

  if (!schedules.length) {
    el.innerHTML = `<div class="empty" style="padding:60px 20px">
      <div class="empty-icon">📋</div>
      <p>No schedules yet. Create your first recurring task!</p>
    </div>`;
    return;
  }

  el.innerHTML = schedules.map(s => {
    const chips = DAY_LABELS.map((lbl, i) =>
      `<div class="day-chip-sm ${s.days.includes(i) ? 'active' : ''}">${lbl}</div>`
    ).join('');

    const meta = [
      s.time     ? fmtTime(s.time)       : null,
      s.duration ? `${s.duration} min`   : null,
    ].filter(Boolean).join(' · ');

    return `<div class="schedule-card">
      <div class="schedule-card-body">
        <div class="schedule-name">${esc(s.name)}</div>
        ${meta ? `<div class="schedule-meta">${meta}</div>` : ''}
        <div class="schedule-days">${chips}</div>
        ${s.notes ? `<div class="schedule-notes">${esc(s.notes)}</div>` : ''}
      </div>
      <div class="schedule-actions">
        <button class="btn btn-secondary btn-sm" onclick="Schedule.edit('${s.id}')">Edit</button>
        <button class="btn btn-danger btn-sm"    onclick="Schedule.del('${s.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function openModal(prefill = {}) {
  _editingId = prefill.id || null;
  document.getElementById('modal-title').textContent = _editingId ? 'Edit Schedule' : 'New Schedule';
  document.getElementById('sched-name').value     = prefill.name     || '';
  document.getElementById('sched-time').value     = prefill.time     || '';
  document.getElementById('sched-duration').value = prefill.duration || '';
  document.getElementById('sched-notes').value    = prefill.notes    || '';

  _selectDays(prefill.days || []);
  document.getElementById('schedule-modal').classList.add('open');
  setTimeout(() => document.getElementById('sched-name').focus(), 200);
}

export function closeModal() {
  document.getElementById('schedule-modal').classList.remove('open');
}

// ── Internal ──────────────────────────────────────────────────────────────────
function _save() {
  const name = document.getElementById('sched-name').value.trim();
  if (!name) {
    const el = document.getElementById('sched-name');
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'shake .4s ease';
    el.focus();
    return;
  }

  const days = [...document.querySelectorAll('#day-picker .day-chip.active')]
    .map(c => +c.dataset.day);
  if (!days.length) { alert('Please select at least one day.'); return; }

  upsertSchedule({
    id:        _editingId || uid(),
    name,
    time:      document.getElementById('sched-time').value,
    duration:  document.getElementById('sched-duration').value,
    notes:     document.getElementById('sched-notes').value.trim(),
    days,
    createdAt: _editingId ? undefined : new Date().toISOString(),
  });

  closeModal();
  renderSchedules();
  window.dispatchEvent(new CustomEvent('schedules-changed'));
}

function _selectDays(days) {
  document.querySelectorAll('#day-picker .day-chip').forEach(c =>
    c.classList.toggle('active', days.includes(+c.dataset.day))
  );
}

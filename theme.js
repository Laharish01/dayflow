// ─── theme.js ─────────────────────────────────────────────────────────────────
// Manages light/dark theme toggle. Persists preference to localStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { getTheme, saveTheme } from './storage.js';

// ── Public API ────────────────────────────────────────────────────────────────
export function initTheme() {
  // Apply saved preference immediately (before first paint)
  applyTheme(getTheme());

  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    const isLight = document.documentElement.classList.contains('light');
    applyTheme(isLight ? 'dark' : 'light');
  });
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  saveTheme(theme);
}

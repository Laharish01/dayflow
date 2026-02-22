# DayFlow — Daily Task Tracker

A lightweight, single-page daily task tracker with recurring schedules, ad-hoc tasks, weekly analytics, light/dark theme, and smart late-task notifications.

## Project Structure

```
dayflow/
├── index.html          # App shell — markup, CSS, loads main.js
├── main.js             # Entry point — tab switching, module init
├── storage.js          # Data layer — all localStorage read/writes
├── theme.js            # Light/dark theme toggle & persistence
├── today.js            # Today tab — scheduled + ad-hoc tasks
├── schedule.js         # Schedules tab — CRUD recurring tasks
├── analytics.js        # Analytics tab — stats, chart, breakdown
└── notifications.js    # Late-task warning toast
```

## Deploying to GitHub Pages

A GitHub Actions workflow is included at `.github/workflows/deploy.yml` that automatically deploys the app on every push to `main`.

**One-time setup:**

1. Push this project to a GitHub repository
2. Go to **Settings → Pages**
3. Under *Source*, select **GitHub Actions**
4. Push any commit to `main` — the workflow runs and your app is live at:
   `https://<your-username>.github.io/<your-repo-name>/`

You can also trigger a deploy manually from the **Actions** tab → *Deploy to GitHub Pages* → **Run workflow**.

---

## Running locally

Because modules use ES `import/export`, the app must be served over HTTP (not opened as a `file://` URL).

**Option 1 — Python (built-in):**
```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

**Option 2 — Node / npx:**
```bash
npx serve .
```

**Option 3 — VS Code:**
Install the *Live Server* extension, right-click `index.html` → *Open with Live Server*.

## Features

- **Today tab** — progress bar, scheduled tasks with live late/now badges, ad-hoc task list
- **Schedules tab** — create recurring tasks with start time, duration, and day-of-week repeat (Every day / Weekdays / Weekend quick-select)
- **Analytics tab** — 7-day completion chart, per-task breakdown bars, stat cards
- **Late notification** — when you mark a scheduled task done *after* its deadline, a toast appears showing exactly how late you were. Auto-dismisses in 6 s. No background polling.
- **Streak counter** — consecutive days of 100% completion
- **Light / dark theme** — toggle in the header; preference saved to localStorage
- **iOS-safe** — inputs use `font-size: 16px` to prevent auto-zoom; safe-area insets for bottom nav

## Data storage

All data is stored in `localStorage` under these keys:

| Key             | Contents                                 |
|-----------------|------------------------------------------|
| `df_schedules`  | Array of recurring schedule objects      |
| `df_history`    | `{ [dateStr]: { [schedId]: true } }`     |
| `df_adhoc`      | `{ [dateStr]: [{ id, name, done }] }`    |
| `df_theme`      | `"dark"` or `"light"`                    |

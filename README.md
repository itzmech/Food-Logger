# Freebuff Fitness

A personal, offline-first fitness, diet and progress tracker for a 12-week
body-recomposition journey. Android-first PWA — installable from Chrome, fully
functional without a network, no account, no backend, no telemetry.

**Current status: Phase 1 — foundation.** Navigation, design system, database
layer, PWA shell and Settings are real; the tracking features (food logging,
workouts, mess menu) are structured placeholders for the next phases.

---

## Quick start

```bash
npm install
npm run dev        # development server
npm run build      # typecheck + production build (PWA service worker generated)
npm run preview    # serve the production build locally
npm run icons      # regenerate PWA icons (zero-dependency script)
```

Deploy the `dist/` folder to any static host. Because routing is hash-based,
no server rewrites are required.

---

## Tech stack

| Concern     | Choice                                  |
| ----------- | --------------------------------------- |
| UI          | React 19 + TypeScript (strict)          |
| Build       | Vite 7                                  |
| Styling     | Tailwind CSS 4 (`@theme` tokens)        |
| Charts      | Recharts 3 (wired, fed in later phases) |
| Data        | IndexedDB (hand-rolled, dependency-free)|
| PWA         | `vite-plugin-pwa` (Workbox)             |
| Routing     | `react-router-dom` 7, hash router       |

No backend, no auth, no paid services, no network calls at runtime.

---

## Project structure

```
src/
  components/
    charts/        Chart wrappers (TrendChart with empty-state handling)
    layout/        TopBar, BottomNav, SideNav, Logo, boot/error screens
    ui/            Design-system primitives (Card, Button, Badge, fields…)
    icons.tsx      Hand-rolled stroke icon set (no icon dependency)
  data/            Navigation config (single source of truth for routes)
  db/              ⚠ IndexedDB layer — the only place that touches IndexedDB
    schema.ts      Declarative store/index definitions + DB_VERSION
    idb.ts         Promise wrappers around raw IndexedDB
    database.ts    Memoized open, schema application, reset helpers
    repository.ts  Generic typed repository factory
    repositories.ts One repository per store
    queries.ts     Composed, intention-revealing queries
    defaults.ts    Default settings/goal factories (nothing user-specific)
    dataTransfer.ts JSON export / import / reset
  hooks/           useDatabase, useSettings, useGoals, useDashboardData,
                   useInstallPrompt, useOnlineStatus, useAsyncData
  layouts/         AppLayout (responsive shell)
  lib/             constants, summary.ts (pure aggregation), version.ts
  pages/           One folder-free module per route, lazy-loaded
  types/           Domain model, one module per area
  utils/           cn, date (local ISO day keys), format, id
public/
  manifest.webmanifest  Hand-written manifest (installable, standalone)
  icons/                Generated PNG icons (any + maskable)
scripts/
  generate-icons.mjs    Dependency-free PNG generator
```

### Architecture rules

1. **Components never touch IndexedDB.** They call hooks → queries →
   repositories → `idb.ts`. Swapping the storage layer for a cloud API later
   means reimplementing the repository interface only.
2. **MESS MENU ≠ FOOD LOG.** The menu (`menus`, `menuOverrides` stores) is
   reference data about what was *available*. Nothing is counted as consumed
   unless the user logs it explicitly (`FoodLog.source === 'menu'`).
3. **No fake data.** Empty states explain what to do next; the dashboard shows
   zeros and hints until the user logs something. No hard-coded nutrition
   math, no invented defaults.
4. **Local day keys.** Every date is a local `YYYY-MM-DD` string — sorts
   lexicographically, works as an IndexedDB key/range, immune to UTC shifts.

---

## What works today (Phase 1)

- Installable PWA: web app manifest, standalone display, maskable icons,
  offline app shell (Workbox precache), `theme-color` mobile theming.
- Five-section navigation (Dashboard, Food, Workout, Progress, Menu) with a
  fixed bottom bar on mobile and a sidebar on desktop, plus Settings.
- Dashboard: calories/protein vs goals, weight, workout, cardio tiles, weekly
  summary, streak computation and a week-day activity grid — all derived from
  real data, all with honest empty states.
- Settings: name, units, journey length, body/nutrition/activity targets
  (persisted to the `goals` store, creating the goal on first save), JSON
  export, JSON import, reset-with-confirmation, PWA install/offline info.
- IndexedDB layer with 11 stores, typed repositories, composed queries and a
  versioned migration path (`DB_VERSION` + `applySchema`).
- Recharts pipeline ready: `TrendChart` renders today's empty states and will
  simply take data in later phases.

## Intentionally not built yet

- Food logging UI (meal logging, Quick Add, food database editor)
- Workout/exercise/set logging, cardio sessions, history
- Mess menu entry/import, calendar data, overrides UI
- Measurement logging, progress photos
- Charts with real series, streak-freeze logic, cloud sync

Each placeholder states what will arrive and why, so nothing looks broken.

---

## Manual test checklist (Android Chrome)

1. `npm run build && npm run preview`, open on the phone → Chrome ⋮ →
   *Install app* → launch from home screen (standalone, dark status bar).
2. Airplane mode → every tab still renders (service worker shell).
3. Settings → fill goals → save → dashboard shows the targets.
4. Settings → Export → JSON downloads. Import the file back → reload →
   same state. Reset → confirmation → app returns to first run.

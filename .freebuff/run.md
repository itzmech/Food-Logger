# Run doc — Freebuff Fitness (Vite + React PWA)

Vite 7 SPA, hash-based routing, no backend. Dev server is `npm run dev` (`vite`).

## 1. Reproduce the uncommitted artifacts a fresh checkout needs

The app has **no environment files and no secrets** — everything runs client-side
(IndexedDB), so nothing needs copying from the main checkout.

```bash
# from this thread's workspace
npm install          # restores node_modules from package-lock.json
```

Optional (not needed for the dev preview):

```bash
npm run build        # tsc -b + vite build → dist/ (generates the PWA service worker)
```

Do **not** need `dist/`, `dist-capture/`, `test-results/`, `tmp-test/` or `dev.log`
to run the preview; those are ignored/local artifacts.

## 2. Run the server

Default port is 5173. Other threads may already hold it (and 5174–5175 in this
checkout), so verify and pick the next free port:

```bash
netstat -ano | grep -E ':5173\s'   # if listening, choose 5176, 5177, …
```

Start detached (Windows / PowerShell — `npm` must be named `npm.cmd`):

```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','5176','--strictPort','--host','127.0.0.1' -RedirectStandardOutput '<log>.log' -RedirectStandardError '<log>.log.err' -WindowStyle Hidden -PassThru).Id"
```

- stdout and stderr must go to **different** files.
- `Start-Process` may keep the calling shell waiting on redirected handles even
  though the child is detached; the server is up when the log prints
  `VITE v7.x ready` and the `--strictPort` port is listening.
- Get the true server pid from the listener (`netstat -ano`), not `npm.cmd`
  (PowerShell's returned id is the wrapper); register that pid.

Verify:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5176/
powershell -NoProfile -Command "Get-Process -Id <pid>"
```

Then `register_preview` with `http://127.0.0.1:5176/` and the node pid.

## Notes

- The page is a hash router: routes are `/#/food`, `/#/menu`, etc.
- `npm run typecheck` (`tsc -b`) must exit 0; the working tree had compile
  errors (`AddFoodSheet` missing `prefillName`, malformed `MenuPage` header,
  `FoodPage` `openAdd` stub) that were fixed so the app renders.

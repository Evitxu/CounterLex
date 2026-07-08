# Deploying CounterLex to Railway (with HTTPS)

Railway **terminates HTTPS for you** at its edge — every service gets a
`https://<name>.up.railway.app` URL automatically. You do **not** add certs or
TLS inside the app. You deploy two services (backend + frontend) from this one
repo; each gets its own HTTPS domain.

## What's already prepared
- `backend/railway.json` + `Procfile` → start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- `backend/requirements.txt` + `.python-version` (3.12) → reliable Nixpacks build
- `frontend/railway.json` → start `npm run start` (Next honours Railway's `$PORT`)
- CORS reads `FRONTEND_ORIGIN` (comma-separated list supported)
- API base reads `NEXT_PUBLIC_API_BASE`

## Steps

### 1. Push this repo to GitHub
```bash
cd C:\Eva\BigSchool\Master\CounterLex
git remote add origin https://github.com/<you>/CounterLex.git
git push -u origin main
```
(Or use the Railway CLI: `railway up`. GitHub is simpler for redeploys.)

### 2. Create the project + two services
This repo uses **one branch per component** (like the sibling project):
`main` (both), `backend` (backend only, at root), `frontend` (frontend only, at root).

- Railway → **New Project → Deploy from GitHub repo** → pick `CounterLex`.
- Create **two services from the same repo**, each tracking its own branch
  (**Settings → Source → Branch**), root directory left as `/`:
  - Service **backend** → branch `backend`
  - Service **frontend** → branch `frontend`

  (Alternatively, deploy both from `main` and set **Root Directory** to
  `backend` / `frontend` — either model works.)

### 3. Backend service
- Railway detects Python (via `requirements.txt` + `.python-version`) and uses the
  start command from `railway.json`.
- **Networking → Generate Domain** → copy the backend URL, e.g.
  `https://counterlex-backend.up.railway.app`.
- **Variables** (Settings → Variables):
  ```
  ALLOW_EXTRACTOR_FALLBACK=true
  BOOTSTRAP_ON_STARTUP=true
  FRONTEND_ORIGIN=<frontend URL from step 4>   # fill after step 4
  ```

### 4. Frontend service
- **Variables** — set BEFORE the build (NEXT_PUBLIC_* is baked in at build time):
  ```
  NEXT_PUBLIC_API_BASE=https://counterlex-backend.up.railway.app/api/v1
  ```
- **Networking → Generate Domain** → copy the frontend URL, e.g.
  `https://counterlex.up.railway.app`.

### 5. Close the loop + redeploy
- Set the backend's `FRONTEND_ORIGIN` to the frontend URL from step 4.
- **Redeploy the frontend** (so the build bakes in `NEXT_PUBLIC_API_BASE`).
- Open the frontend URL → it's served over **HTTPS** automatically. Done.

## Good to know (all fine for a demo)
- **No Ollama on Railway** → factor extraction uses the **keyword fallback**
  automatically. (To use a real LLM, point `OLLAMA_BASE_URL` at a hosted endpoint.)
- **Ephemeral filesystem** → the SQLite corpus resets on redeploy, but the app
  **bootstraps** (regenerates corpus + trains) on startup, so it self-heals.
  If you want persistence, add a **Railway Volume** mounted where `SQLITE_PATH`
  points, or set `SQLITE_PATH` to a path inside the volume.
- **`NEXT_PUBLIC_API_BASE` is build-time**: changing the backend URL means you
  must redeploy the frontend.
- **CORS**: `FRONTEND_ORIGIN` accepts a comma list, e.g.
  `https://counterlex.up.railway.app,http://localhost:3000`.

## Why not add HTTPS in the app itself?
On Railway (as on Vercel/Render/Cloud Run) TLS is handled by the platform's
proxy. Serving TLS from uvicorn/Next behind that proxy is redundant and can
cause redirect loops. The correct production pattern is: **app speaks HTTP
internally; the platform serves HTTPS to the world.**

# Deploying CounterLex to Railway (with HTTPS)

Railway **terminates HTTPS for you** at its edge — every service gets a
`https://<name>.up.railway.app` URL automatically. You do **not** add certs or
TLS inside the app. You deploy two services (backend + frontend) from this one
repo; each gets its own HTTPS domain.

## ✅ Live deployment (current)

Deployed on Railway — project **`ideal-vibrancy`**, environment `production`, two
services from this repo:

| Service | Branch | URL |
|---------|--------|-----|
| **Frontend** | `frontend` | <https://counterlex.up.railway.app> |
| **Backend** (API) | `backend` | <https://counterlex-api.up.railway.app> · [`/docs`](https://counterlex-api.up.railway.app/docs) · [`/health`](https://counterlex-api.up.railway.app/health) |

- **Persistence:** a Railway **volume** (`backend-volume`) is mounted at `/data`
  on the backend, with `SQLITE_PATH=/data/counterlex.db` — contact messages and
  usage counters survive redeploys.
- **Admin:** `ADMIN_API_KEY` is set, so `/api/v1/contact/messages` requires the
  `X-Admin-Key` header (enter it in the `/admin` page).
- **Contact email:** dev mode unless the `SMTP_*` variables are set (see below);
  submissions are always saved to SQLite regardless.
- **LLM:** no key deployed → factor extraction uses the keyword fallback.

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
git remote add origin https://github.com/Evitxu/CounterLex.git
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
  `https://counterlex-api.up.railway.app`.
- **Variables** (Settings → Variables):
  ```
  ALLOW_EXTRACTOR_FALLBACK=true
  BOOTSTRAP_ON_STARTUP=true
  FRONTEND_ORIGIN=<frontend URL from step 4>   # fill after step 4

  # Contact module — REQUIRED in production (see "Contact module" below)
  ADMIN_API_KEY=<a long random secret>         # gates /contact/messages + admin endpoints
  CONTACT_RECIPIENT=evitxuevs@gmail.com
  # Optional real email delivery (free Gmail App Password); omit → dev mode (saved, not emailed)
  # SMTP_HOST=smtp.gmail.com
  # SMTP_PORT=587
  # SMTP_STARTTLS=true
  # SMTP_USER=evitxuevs@gmail.com
  # SMTP_PASSWORD=<16-char app password>
  # SMTP_FROM=evitxuevs@gmail.com
  ```

### 4. Frontend service
- **Variables** — set BEFORE the build (NEXT_PUBLIC_* is baked in at build time):
  ```
  NEXT_PUBLIC_API_BASE=https://counterlex-api.up.railway.app/api/v1
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
  ⚠️ **The contact-form submissions do NOT self-heal** — they are user data. To
  keep them across redeploys you **must** add a **Railway Volume** (see below).
- **`NEXT_PUBLIC_API_BASE` is build-time**: changing the backend URL means you
  must redeploy the frontend.
- **CORS**: `FRONTEND_ORIGIN` accepts a comma list, e.g.
  `https://counterlex.up.railway.app,http://localhost:3000`.

## Contact module (form + admin)

The public form (`POST /api/v1/contact`) validates, sanitizes and stores each
submission in SQLite, and — if SMTP is configured — emails it to
`CONTACT_RECIPIENT`. Submissions are listed by `GET /api/v1/contact/messages`
(and there is a `/admin` page in the frontend to read them).

Two things to configure on Railway:

1. **`ADMIN_API_KEY` — set it (important).** `GET /api/v1/contact/messages`
   (and the corpus/train endpoints) are protected by the `X-Admin-Key` header
   **only when `ADMIN_API_KEY` is set**. If you leave it unset in production,
   that endpoint is **public** and anyone could read the submitted names and
   emails. Set it to a long random secret; send it as `X-Admin-Key` to read
   messages (the `/admin` page has a field for it).

2. **Persistence — add a Railway Volume** so submissions survive redeploys:
   - Backend service → **Variables**: `SQLITE_PATH=/data/counterlex.db`
   - Backend service → **Settings → Volumes**: mount path `/data`
   - Redeploy. The corpus/model bootstrap into the volume once; contact
     messages then persist. (A volume attaches to one service — the backend.)

Optionally set the `SMTP_*` variables (free Gmail App Password) so you also
receive each message by email; without them the module runs in "dev mode"
(stored + logged, `email_sent=false`).

## Why not add HTTPS in the app itself?
On Railway (as on Vercel/Render/Cloud Run) TLS is handled by the platform's
proxy. Serving TLS from uvicorn/Next behind that proxy is redundant and can
cause redirect loops. The correct production pattern is: **app speaks HTTP
internally; the platform serves HTTPS to the world.**

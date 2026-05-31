# ContractPilot

A full-stack Contract Lifecycle Management (CLM) web application.

**Stack:** React + Vite + Tailwind + shadcn/ui · FastAPI · Supabase (Postgres) · APScheduler · Claude AI

---

## Features

- **Auth** — Email/password login & registration with JWT
- **Dashboard** — Contract stats, expiring soon alerts, recent activity
- **Templates** — Reusable templates with `{{variable}}` placeholders
- **Contract Creation** — From template or scratch; rich text editor
- **E-Signature Flow** — Unique signing links per signer; no DocuSign needed
- **Status Tracking** — Draft → Sent → Signed → Expired
- **Version History** — Every edit saved; one-click restore
- **Renewal Reminders** — Daily APScheduler job sends email reminders
- **AI Risk Flagging** — Claude analyzes clauses (green/yellow/red) with reasons
- **PDF Download** — Client-side PDF export via jsPDF

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic API key](https://console.anthropic.com)

---

## Local Setup

### 1. Clone & configure

```bash
git clone <repo-url>
cd contractpilot
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Fill in .env with your Supabase and SMTP credentials
```

**Run migrations:**
```bash
alembic upgrade head
```

**Start the API:**
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install

cp .env.example .env
# VITE_API_URL=http://localhost:8000/api/v1 (default, no change needed for local)
```

**Start the dev server:**
```bash
npm run dev
```

Open `http://localhost:5173`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `SUPABASE_DB_URL` | Full Postgres connection string from Supabase |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI risk analysis |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | SMTP username/email |
| `SMTP_PASSWORD` | SMTP password or app password |
| `SMTP_FROM` | From address for sent emails |
| `SECRET_KEY` | JWT signing secret — change in production |
| `FRONTEND_URL` | URL of the frontend (for signing links in emails) |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (default: `/api/v1` via Vite proxy) |

---

## Database

The schema is managed by Alembic. After filling in `SUPABASE_DB_URL`:

```bash
cd backend
alembic upgrade head          # create all tables
alembic revision --autogenerate -m "description"  # generate new migration
```

Tables: `users`, `templates`, `contracts`, `contract_versions`, `signers`, `signature_events`

---

## Deployment

### Frontend → Vercel

1. Connect your repo to Vercel
2. Set `VITE_API_URL` to your Railway backend URL in Vercel environment variables
3. Build command: `npm run build` · Output: `dist`

### Backend → Railway

1. Create a new Railway project from the `backend/` directory
2. Add all env variables from `.env.example`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add a `FRONTEND_URL` pointing to your Vercel deployment URL (for CORS)

---

## API Reference

All routes are under `/api/v1/`. Interactive docs available at `/docs` when running locally.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login (JSON body) |
| GET | `/auth/me` | Current user |
| GET | `/contracts/` | List contracts |
| POST | `/contracts/` | Create contract |
| GET | `/contracts/dashboard` | Dashboard stats |
| GET | `/contracts/{id}` | Get contract with versions & signers |
| PUT | `/contracts/{id}` | Update contract |
| DELETE | `/contracts/{id}` | Delete contract |
| POST | `/contracts/{id}/signers` | Add signer & send invite |
| GET | `/contracts/sign/{token}` | Public: get signing page data |
| POST | `/contracts/sign/{token}` | Public: submit signature |
| POST | `/contracts/{id}/analyze` | AI risk analysis |
| POST | `/contracts/{id}/versions/{vid}/restore` | Restore version |
| GET | `/templates/` | List templates |
| POST | `/templates/` | Create template |
| PUT | `/templates/{id}` | Update template |
| DELETE | `/templates/{id}` | Delete template |

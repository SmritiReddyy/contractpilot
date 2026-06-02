# How to Use ContractPilot

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- An [Anthropic API key](https://console.anthropic.com)
- A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) (requires 2FA)

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/SmritiReddyy/contractpilot.git
cd contractpilot
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

SECRET_KEY=your-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

ANTHROPIC_API_KEY=your-anthropic-key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=you@gmail.com
EMAIL_FROM=you@gmail.com
RESEND_API_KEY=

FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
```

Run migrations and start the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API at `http://localhost:8000` · Interactive docs at `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to `localhost:8000` automatically.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `SUPABASE_DB_URL` | Full Postgres connection string |
| `SECRET_KEY` | JWT signing secret — use a long random string in production |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | Gmail address |
| `SMTP_PASSWORD` | Gmail App Password (16 characters, spaces allowed) |
| `SMTP_FROM` | From address for sent emails |
| `EMAIL_FROM` | Display from address |
| `RESEND_API_KEY` | Leave empty to use Gmail SMTP fallback |
| `FRONTEND_URL` | Frontend URL used in email signing links and CORS |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL — set to your Render URL in production |

---

## Database

Schema is managed by Alembic. Migrations live in `backend/alembic/versions/`.

```bash
alembic upgrade head                               # apply all migrations
alembic revision --autogenerate -m "description"   # generate a new migration
```

### Tables

| Table | Purpose |
|---|---|
| `users` | User accounts |
| `templates` | Reusable contract templates |
| `clauses` | Clause library |
| `contracts` | Contracts with status, content, and signing mode |
| `contract_versions` | Full version history per contract |
| `signers` | Signers per contract — token, OTP, signing state, order |
| `signature_events` | Per-signer audit event log |
| `milestones` | Post-signing obligations and key dates |
| `password_reset_tokens` | Short-lived tokens for password reset |

---

## Deployment

### Backend → Render

1. Go to [render.com](https://render.com) → New Web Service → Connect GitHub repo
2. Set **Root Directory** to `backend`
3. Add all environment variables (see table above)
4. Set `FRONTEND_URL` to your Vercel URL
5. Set the start command to: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Add one environment variable: `VITE_API_URL=https://your-render-url.onrender.com/api/v1`
4. Deploy — `frontend/vercel.json` handles SPA routing automatically

### After both are live

Update `FRONTEND_URL` in Render to your Vercel URL and redeploy — this is required for CORS and for signing link URLs in emails to point to production.

---

## API Reference

All routes are under `/api/v1/`. Full interactive docs available at `/docs`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register — seeds sample data for new account |
| POST | `/auth/login` | Login — returns JWT |
| GET | `/auth/me` | Current user profile |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password` | Reset password with token |

### Contracts
| Method | Path | Description |
|---|---|---|
| GET | `/contracts/` | List all contracts |
| POST | `/contracts/` | Create contract |
| GET | `/contracts/dashboard` | Dashboard stats |
| GET | `/contracts/{id}` | Get contract with signers and versions |
| PUT | `/contracts/{id}` | Update contract |
| DELETE | `/contracts/{id}` | Delete contract |
| POST | `/contracts/{id}/duplicate` | Duplicate as a new draft |
| POST | `/contracts/{id}/analyze` | AI risk analysis |
| POST | `/contracts/{id}/summarize` | AI contract summary |
| GET | `/contracts/{id}/audit` | Full audit trail and tamper detection |
| POST | `/contracts/{id}/versions/{vid}/restore` | Restore a previous version |
| POST | `/contracts/{id}/signers` | Add signer and send invite email |
| DELETE | `/contracts/{id}/signers/{sid}` | Revoke signing link |
| POST | `/contracts/{id}/milestones` | Add milestone |
| GET | `/contracts/{id}/milestones` | List milestones |
| PATCH | `/contracts/{id}/milestones/{mid}` | Update milestone status/details |
| DELETE | `/contracts/{id}/milestones/{mid}` | Delete milestone |

### Signing (public — no auth required)
| Method | Path | Description |
|---|---|---|
| GET | `/contracts/sign/{token}` | Get signing page data |
| POST | `/contracts/sign/{token}/send-otp` | Send OTP to signer's email |
| POST | `/contracts/sign/{token}/verify-otp` | Verify OTP code |
| POST | `/contracts/sign/{token}` | Submit signature |
| POST | `/contracts/sign/{token}/decline` | Decline with reason |
| GET | `/contracts/sign/{token}/certificate` | Download signing certificate |

### Templates
| Method | Path | Description |
|---|---|---|
| GET | `/templates/` | List templates |
| POST | `/templates/` | Create template |
| GET | `/templates/{id}` | Get template |
| PUT | `/templates/{id}` | Update template |
| DELETE | `/templates/{id}` | Delete template |

### Clauses
| Method | Path | Description |
|---|---|---|
| GET | `/clauses/` | List clauses |
| POST | `/clauses/` | Create clause |
| PUT | `/clauses/{id}` | Update clause |
| DELETE | `/clauses/{id}` | Delete clause |

---

## Sample Data

Every new account is automatically seeded with:

- **3 sample contracts** — NDA (Acme Corp), Service Agreement (TechCo Ltd), Employment Offer (Jane Smith)
- **3 sample templates** — NDA, Service Agreement, Employment Offer Letter (all with `{{variable}}` placeholders)
- **8 sample clauses** — Confidentiality, Limitation of Liability, Indemnification, Governing Law, Termination for Convenience, Force Majeure, IP Ownership, Payment Terms

Sample items are tagged with a purple **Sample** badge and excluded from all dashboard counts. They can be duplicated or used as starting points and deleted at any time.

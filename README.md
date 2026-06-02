# ContractPilot

A full-stack Contract Lifecycle Management (CLM) platform with AI-powered risk analysis, legally defensible e-signatures, tamper detection, and an automated signing workflow.

**Stack:** React + Vite + Tailwind + shadcn/ui · FastAPI · PostgreSQL (Supabase) · SQLAlchemy + Alembic · Claude AI (Anthropic) · Gmail SMTP · APScheduler

---

## Features

### Auth
- Email/password registration and login with JWT
- Forgot password and reset password via email link
- Per-user isolated data

### Dashboard
- Contract portfolio stats (total, active, signed, expiring soon, drafts)
- Pending signatures count and average days-to-sign metric
- Overdue milestones alert
- Contract pipeline bar chart by status
- Recent contracts list
- Sample data excluded from all counts

### Contracts
- Create from scratch or from a template
- Rich text editor with full version history — every save is versioned
- One-click version restore
- Contract duplication ("Copy of …")
- PDF export (client-side, jsPDF)
- Status lifecycle: Draft → Sent → Signed → Expired
- Sample contracts pre-loaded for new users (tagged separately, not counted as drafts)

### Templates
- Reusable templates with `{{variable}}` placeholders
- Variable extraction and fill-in flow when creating a contract
- Sample NDA, Service Agreement, and Employment Offer Letter included
- "Use" button creates a new contract pre-filled with the template

### Clause Library
- Save and categorise reusable clauses (Confidentiality, Indemnity, Liability, Governing Law, etc.)
- Insert any clause directly into a contract while editing
- "Use" button duplicates a clause as a starting point for a new one
- 8 sample clauses pre-loaded for new users

### E-Signature Flow
- Unique, expiring signing links per signer (30-day TTL)
- OTP email verification before signing is permitted
- Sequential or parallel signing modes — in sequential mode each signer only receives their link after the previous one has signed
- Signing order assignment for sequential workflows
- Signer can decline with a reason
- Owner can revoke a pending signing link at any time
- View tracking (when the link was first opened)
- Signing certificate with IP, user agent, timestamp, and SHA-256 document hash
- Confirmation email sent to signer on completion

### Tamper Detection
- Contract content is SHA-256 hashed when the first signer is added
- Any out-of-band modification after signing is detected on the next audit call
- Audit trail endpoint reports `tampered: true` and surfaces both hashes

### Audit Trail
- Full event log per signer: viewed, otp_sent, otp_verified, otp_failed, signed, declined
- IP address and user agent recorded per event
- Accessible via the Audit Trail tab in the UI and the audit API endpoint

### Milestones & Obligations
- Add key dates and obligations to any contract (title, description, due date)
- Mark milestones as complete
- Overdue milestones automatically flagged in the UI and counted on the dashboard

### AI Features (Claude claude-opus-4-8)
- **Risk Analysis** — clause-by-clause risk flagging (green / yellow / red) with one-line reasons and an overall risk summary
- **Contract Summary** — extracts parties, contract value, governing law, key dates, payment terms, and termination clause in structured form

### Email (Gmail SMTP)
- Signing invitations with unique links
- OTP verification codes (15-minute expiry)
- Signature confirmation with document hash
- Password reset links (1-hour expiry)
- Contract expiry reminders via APScheduler daily job

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, React Router, Axios |
| Backend | FastAPI, Python 3.13, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL via Supabase |
| Auth | JWT (python-jose), bcrypt (passlib) |
| AI | Anthropic Claude API (`claude-opus-4-8`) |
| Email | Gmail SMTP via aiosmtplib |
| Scheduling | APScheduler (renewal reminders) |
| PDF | jsPDF + html2canvas (client-side) |
| Deployment | Railway (backend) · Vercel (frontend) |

---

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
| `FRONTEND_URL` | Frontend URL used in email signing links |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL — set to your Railway URL in production |

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

### Backend → Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the repo, set **Root Directory** to `backend`
3. Add all environment variables (see table above)
4. Set `FRONTEND_URL` to your Vercel URL
5. `backend/railway.toml` handles everything — it runs `alembic upgrade head` then starts uvicorn on deploy

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Add one environment variable: `VITE_API_URL=https://your-railway-url.up.railway.app/api/v1`
4. Deploy — `frontend/vercel.json` handles SPA routing automatically

### After both are live

Update `FRONTEND_URL` in Railway to your Vercel URL and redeploy — this is required for CORS and for signing link URLs in emails to point to production.

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

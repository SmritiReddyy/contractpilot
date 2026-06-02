# ContractPilot

**Contract lifecycle management, powered by AI.**

ContractPilot is a full-stack platform for creating, signing, and managing contracts — with built-in AI risk analysis, legally defensible e-signatures, tamper detection, and an automated multi-party signing workflow.

**Live:** [contractpilot-sooty.vercel.app](https://contractpilot-sooty.vercel.app)

---

## What it does

- **Draft contracts** from scratch or from reusable templates with `{{variable}}` placeholders
- **AI risk analysis** — clause-by-clause risk flagging (green / yellow / red) with an overall risk summary, powered by Claude
- **AI contract summary** — extracts parties, value, governing law, key dates, and payment terms in structured form
- **E-signatures** — unique expiring signing links, OTP email verification, sequential or parallel signing modes, decline with reason, owner revocation
- **Tamper detection** — SHA-256 content hash locked at first signing; any out-of-band modification is detected on audit
- **Full audit trail** — every signer event (viewed, OTP sent/verified/failed, signed, declined) logged with IP and user agent
- **Version history** — every save is versioned with one-click restore
- **Milestones & obligations** — track key dates per contract with overdue alerts on the dashboard
- **Clause library** — save and reuse standard clauses, insertable directly into the editor
- **PDF export** — client-side, no server required

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, React Router, Axios |
| Backend | FastAPI, Python 3.11, SQLAlchemy 2.0, Alembic |
| Database | PostgreSQL via Supabase |
| Auth | JWT (python-jose), bcrypt (passlib) |
| AI | Anthropic Claude API (`claude-opus-4-8`) |
| Email | Gmail SMTP via aiosmtplib / Resend |
| Scheduling | APScheduler (contract expiry reminders) |
| PDF | jsPDF + html2canvas (client-side) |
| Deployment | Render (backend) · Vercel (frontend) |

---

## Getting Started

See [HOW_TO_USE.md](HOW_TO_USE.md) for local setup, environment variables, deployment instructions, and the full API reference.

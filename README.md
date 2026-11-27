# SkillBridge

**Learn. Build. Collaborate. Grow.** A student-first project discovery and collaboration platform for college students across India.

## Stack
- Frontend: React, TypeScript, Vite
- API: Node.js, Express
- Auth/database: Supabase Auth + PostgreSQL with Row Level Security
- Deployment target: Render Web Service (API) + Static Site (frontend)

## Repository
- `frontend/` responsive student workspace, Supabase email/password auth, profile editing, live project discovery, project publishing and applications
- `backend/` Express API foundation with health and authenticated identity endpoints
- `database/migrations/` schema, RLS hardening and lookup indexes
- `docs/` product specification and architecture

## Local development
Requires Node.js 20+ and npm 10+.

1. Copy `.env.example` to `.env`.
2. Set Supabase URL and publishable key in the Vite variables.
3. Install dependencies: `npm install`
4. Start frontend and API: `npm run dev`
5. Build frontend: `npm run build`

Frontend: http://localhost:5173  
API health: http://localhost:4000/api/v1/health

Never put a Supabase service-role or secret key in frontend variables or commit secrets.

## Supabase
Project URL: `https://pevrllcmwqpvdpibtvuy.supabase.co`

Initial schema and hardening migrations have been applied to the connected SkillBridge project. The migrations are mirrored in `database/migrations/`. Configure Auth email confirmation and production redirect URLs before opening signups publicly.

## Render deployment
**API Web Service**
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment: `PORT`, `FRONTEND_ORIGIN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Frontend Static Site**
- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`

## MVP status
Implemented against live Supabase data: email/password authentication, student profile editing, public project discovery, student verification requests, project publishing for verified students, and applications for verified students. Project owner application decisions are enforced in database policies/triggers but the management screen is still pending.

Not yet launch-complete: verified-college directory seeding and review operations, startup verification/publishing, team workspaces, milestones, portfolios, notifications, messaging, reporting/blocking, moderation, private document storage, account export/deletion, age-appropriate safeguards, and end-to-end tests.

## Trust and safety
- RLS is the database authorization boundary; the browser uses only the publishable key.
- Direct RPC execution of the auth profile trigger is revoked.
- Application updates are restricted to withdrawal by applicants or accept/decline by project owners.
- Verification documents are not collected in this MVP; future uploads must use private storage and narrow policies.
- Private contact details are not displayed publicly; direct messaging is not enabled.
- No student application fees. Compensation and expected workload must be disclosed.
- Public launch must wait for moderation, reporting/blocking, audit logs, account export/deletion, age-appropriate safeguards and end-to-end testing.

# SkillBridge

**Learn. Build. Collaborate. Grow.**

SkillBridge is a student-focused project discovery and collaboration platform for college students across India.

## Stack
- Frontend: React, TypeScript, Vite
- API: Node.js, Express
- Auth/database: Supabase Auth + PostgreSQL with Row Level Security
- Deployment target: Render (Web Service + Static Site)

## Repository
- `frontend/` responsive student dashboard, search/filtering, saved-project UI and Supabase email/password auth wiring
- `backend/` Express API foundation with health and authenticated identity endpoints
- `database/migrations/` initial schema and RLS policies
- `docs/` product specification and architecture

## Local development
Requires Node.js 20+ and npm 10+.

1. Copy `.env.example` to `.env`.
2. Install dependencies: `npm install`
3. Start frontend and API: `npm run dev`
4. Build frontend: `npm run build`

Frontend: http://localhost:5173  
API health: http://localhost:4000/api/v1/health

Add Supabase URL and anon/publishable key to enable real accounts. Never put a service-role key in frontend variables or commit secrets.

## Supabase setup
1. Create a Supabase project.
2. Run `database/migrations/0001_initial_schema.sql` in the SQL Editor.
3. Configure Auth email confirmation and redirect URLs.
4. Review and test RLS policies before using real student data.

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

## Current status
This is the first working UI/API foundation, not a production-ready marketplace. Project cards currently use sample preview data. Live project CRUD, applications, student/startup verification review, team collaboration, messaging, moderation, file uploads, and full account workflows remain to be implemented and tested before public launch.

## Security baseline
- Browser uses the Supabase anon/publishable key and RLS.
- API validates Supabase bearer tokens.
- CORS is restricted to configured frontend origins.
- Keep verification documents private; public profiles must never expose student ID documents.
- Add reporting, blocking, audit logs, account export/deletion, and under-18 safeguards before public launch.

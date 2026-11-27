<h1 align="center">SkillBridge</h1>
<p align="center">A student-first collaboration and project discovery platform for India.</p>

> First working foundation. Core marketplace workflows are being built in staged, testable releases.

## Stack
- Frontend: React, TypeScript, Vite
- API: Node.js, Express
- Database/Auth: Supabase (PostgreSQL + Auth)
- Hosting target: Render

## Repository layout
- `frontend/` responsive student dashboard and Supabase auth integration
- `backend/` API foundation and auth middleware
- `database/migrations/` PostgreSQL schema and row-level security policies
- `docs/` product specification and architecture

## Setup
1. Create a Supabase project and run `database/migrations/0001_initial_schema.sql` in the SQL editor.
2. Copy `.env.example` to `.env` and fill in the Supabase project URL, anon key, and service role key where required. Never commit secrets.
3. Install dependencies from the repository root with `npm install`.
4. Run `npm run dev` for the frontend and `npm run dev:api` for the API.

## Current scope
The initial UI includes sample project discovery, search/filtering, saved projects, and Supabase auth wiring. Sample projects are demonstration data; live project publishing, applications, student verification review, teams, messaging, moderation, and production operations are subsequent implementation milestones. Do not treat this starter as production-ready until those workflows and security policies are tested.

## Deployment
Deploy `backend/` as a Render Web Service and `frontend/` as a Render Static Site. Configure environment variables from `.env.example` in the respective service dashboards. Apply database migrations before enabling public signups.

## Security notes
- Keep service-role keys server-side only.
- Configure exact frontend origins in the API CORS allowlist.
- Enable and test Supabase RLS before exposing data.
- Student verification must be reviewed server-side; never trust a client-provided verified flag.

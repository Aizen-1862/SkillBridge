# Architecture

Modular monolith for a low-cost first release.

- Frontend: React + TypeScript + Vite, responsive and PWA-ready.
- API: Node.js + Express, versioned REST under /api/v1.
- Auth and database: Supabase Auth + PostgreSQL with Row Level Security.
- Planned private file storage and realtime collaboration: Supabase Storage and Realtime.

## Trust boundaries
1. Browser uses Supabase sessions and anon/publishable key only.
2. Postgres RLS is the authorization boundary for browser data access.
3. API validates bearer tokens with Supabase Auth.
4. Service-role credentials, if later needed, stay server-side and never enter Vite variables.
5. Verification documents belong in private buckets with narrow policies.

## API foundation
- GET /api/v1/health
- GET /api/v1/me (authenticated)

Future modules: profiles, colleges, verification, projects, applications, teams, milestones, portfolio, opportunities, messaging, notifications, reports and administration.

## Deployment
Render Web Service for API, Render Static Site for frontend, Supabase for Auth/Postgres. Use separate development and production projects when practical; configure explicit CORS origins and Auth redirect URLs.

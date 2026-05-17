# Integration Details Portal

An internal web application replacing the SitesCampuses Excel workbook. It provides a structured, role-gated interface for viewing and editing EHR integration details (receiving feeds, parsing feeds, EPIC integrations, cohort status, server configs, and more) across all sites and facilities, backed by Supabase (PostgreSQL + Auth + RLS).

## Prerequisites

- Node.js 20+ (22 recommended)
- Docker Desktop
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)

## Quick Start (local dev)

```bash
# 1. Clone and install dependencies
git clone <repo-url> integration-details-revamp
cd integration-details-revamp
npm install

# 2. Start the local Supabase stack (Postgres + Auth + Studio)
supabase start

# 3. Apply the schema
supabase db reset
# or manually:
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" \
  < supabase/migrations/20260517000000_initial_schema.sql

# 4. Seed test users
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" \
  < data/seed-test-users.sql

# 5. Configure environment
cp apps/web/.env.example apps/web/.env.local   # edit with values from `supabase status`

# 6. Start the dev server
npm run dev --workspace=apps/web
```

App runs at http://localhost:3000. Supabase Studio at http://localhost:54323.

## Running with Docker

The Docker image uses `output: 'standalone'` (Next.js). Point it at an external Supabase project or a running local stack.

```bash
# Copy and fill in the env file
cp .env.example .env.local

# Build and start
docker compose up --build
```

The web service is exposed on port 3000. Environment variables expected:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only) |

## Creating Test Users

After the Supabase stack is running, seed the three test accounts:

```bash
# Against the local Supabase Postgres
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" \
  < data/seed-test-users.sql

# Or, if using Docker Compose with a named supabase_db container:
docker exec -i supabase_db_integration-details-revamp \
  psql -U postgres -d postgres < data/seed-test-users.sql
```

| Email | Password | Role |
|---|---|---|
| admin@test.com | Admin1234! | admin (global) |
| editor@test.com | Editor1234! | editor (global) |
| viewer@test.com | Viewer1234! | viewer (global) |

## URLs

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| Supabase Studio | http://localhost:54323 |
| Supabase API | http://localhost:54321 |

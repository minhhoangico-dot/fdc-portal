---
name: fdc-self-hosted-supabase-migration
description: Guide migration and setup of projects on the FDC self-hosted Supabase instance running on Vostro 3470. Use when moving an existing app from Supabase Cloud, PostgreSQL, or MySQL, or when creating a new project on the FDC self-hosted Supabase environment, including schema import, auth and storage migration, environment variable updates, RLS setup, connectivity checks, and known operational constraints.
---

# Migrate Project to FDC Self-Hosted Supabase

You are helping migrate a project to the FDC self-hosted Supabase instance running on Vostro 3470 at the hospital network.

## Instance Details

| Property | Value |
|----------|-------|
| **Public URL** | `https://supabase.fdc-nhanvien.org` |
| **LAN URL** | `http://192.168.1.9:8000` |
| **Studio (dashboard)** | `https://supabase.fdc-nhanvien.org` |
| **Dashboard login** | `supabase` / `9315beb19d5d5a848181cce669837d08` |
| **Direct Postgres (LAN)** | `postgresql://postgres:a2437d1bdc994db214ca3afdfad41c2e@192.168.1.9:5432/postgres` |

### API Keys

```bash
SUPABASE_URL=https://supabase.fdc-nhanvien.org
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczNjU5MTYwLCJleHAiOjE5MzEzMzkxNjB9.lE-QSeCAeoESfRY-edDbZ_XBjV5_yoefvAiOL7nzCOo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzM2NTkxNjAsImV4cCI6MTkzMTMzOTE2MH0.GtVEBMwsDqlArSxhgfYdBvlgM-jQRVXRU347QebDBLk
```

### Active Services

- **Auth** — email/password, magic link (SMTP not configured for production — test only)
- **REST API** — PostgREST on `/rest/v1/`
- **Realtime** — websocket subscriptions
- **Storage** — file storage via MinIO
- **Edge Functions** — Deno runtime
- **Studio** — visual dashboard

---

## Migration Workflow

### Step 0 — Understand the project

Before starting, identify:
1. Current database (Supabase Cloud, plain Postgres, MySQL, SQLite, etc.)
2. Auth provider in use (Supabase Auth, NextAuth, custom JWT, etc.)
3. Storage usage (Supabase Storage, S3, local files)
4. Edge Functions / serverless functions in use
5. Environment: Next.js / React / Vue / Node.js backend / etc.

---

### Case A: Migrate from Supabase Cloud

#### 1. Export schema from Cloud

Use Supabase CLI or direct Postgres dump:
```bash
# Via Supabase CLI
supabase db dump --schema public > schema.sql
supabase db dump --data-only --schema public > data.sql

# Or via pg_dump (get DB URL from Cloud project settings)
pg_dump "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" \
  --schema=public -s -f schema.sql
pg_dump "postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres" \
  --schema=public --data-only -f data.sql
```

#### 2. Import into self-hosted

```bash
PGPASSWORD=a2437d1bdc994db214ca3afdfad41c2e psql \
  -h 192.168.1.9 -p 5432 -U postgres -d postgres \
  -f schema.sql

PGPASSWORD=a2437d1bdc994db214ca3afdfad41c2e psql \
  -h 192.168.1.9 -p 5432 -U postgres -d postgres \
  -f data.sql
```

#### 3. Migrate Storage buckets (if used)

```bash
# List buckets in cloud project via Supabase CLI or API
# Re-create buckets in self-hosted Studio dashboard
# Download files and re-upload via supabase-js or REST API
```

#### 4. Migrate Auth users (if needed)

Export `auth.users` from Cloud and import — requires service_role key on both ends. Only do this if the project manages its own user base and users need to carry over.

#### 5. Update environment variables in the project

```env
# Replace Cloud values with self-hosted values
SUPABASE_URL=https://supabase.fdc-nhanvien.org
NEXT_PUBLIC_SUPABASE_URL=https://supabase.fdc-nhanvien.org
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczNjU5MTYwLCJleHAiOjE5MzEzMzkxNjB9.lE-QSeCAeoESfRY-edDbZ_XBjV5_yoefvAiOL7nzCOo
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczNjU5MTYwLCJleHAiOjE5MzEzMzkxNjB9.lE-QSeCAeoESfRY-edDbZ_XBjV5_yoefvAiOL7nzCOo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzM2NTkxNjAsImV4cCI6MTkzMTMzOTE2MH0.GtVEBMwsDqlArSxhgfYdBvlgM-jQRVXRU347QebDBLk
```

---

### Case B: New project — set up from scratch

#### 1. Create schema via Studio

Open `https://supabase.fdc-nhanvien.org` → login → Table Editor or SQL Editor.

Best practice: use a dedicated schema per project to avoid collisions:

```sql
-- Create project schema
CREATE SCHEMA IF NOT EXISTS my_project;

-- Set search path (optional, or use fully qualified names)
-- Example table
CREATE TABLE my_project.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Expose schema via PostgREST (run once per new schema)
-- Add schema name to PGRST_DB_SCHEMAS in .env on the server
```

**Important**: To expose a new schema via REST API, add it to `PGRST_DB_SCHEMAS` in `/opt/supabase/repo/docker/.env` on the host server, then restart:
```bash
sudo systemctl restart docker  # or docker compose restart rest
```

#### 2. Enable RLS

```sql
ALTER TABLE my_project.users ENABLE ROW LEVEL SECURITY;

-- Example policy: users can only see their own row
CREATE POLICY "users_select_own" ON my_project.users
  FOR SELECT USING (auth.uid() = id);
```

#### 3. Install supabase-js in the project

```bash
npm install @supabase/supabase-js
```

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://supabase.fdc-nhanvien.org',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczNjU5MTYwLCJleHAiOjE5MzEzMzkxNjB9.lE-QSeCAeoESfRY-edDbZ_XBjV5_yoefvAiOL7nzCOo'
)

// Server-side only (never expose in browser)
export const supabaseAdmin = createClient(
  'https://supabase.fdc-nhanvien.org',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzM2NTkxNjAsImV4cCI6MTkzMTMzOTE2MH0.GtVEBMwsDqlArSxhgfYdBvlgM-jQRVXRU347QebDBLk'
)
```

---

### Case C: Migrate from plain PostgreSQL or MySQL

#### 1. Export from source

```bash
# PostgreSQL source
pg_dump "postgresql://user:pass@host:5432/dbname" -s -f schema.sql  # schema only
pg_dump "postgresql://user:pass@host:5432/dbname" --data-only -f data.sql

# MySQL source — use pgloader or mysqldump + manual conversion
pgloader mysql://user:pass@host/dbname postgresql://postgres:a2437d1bdc994db214ca3afdfad41c2e@192.168.1.9:5432/postgres
```

#### 2. Import and wrap with Supabase features

After import:
- Add `gen_random_uuid()` defaults to id columns if not present
- Add `created_at timestamptz DEFAULT now()` where missing
- Enable RLS on tables that need access control
- Create PostgREST-compatible views for complex joins

---

## Quick Reference — Common Operations

### Create a Storage bucket

Via Studio: Storage → New bucket → set public/private

Via API:
```typescript
const { data, error } = await supabaseAdmin.storage.createBucket('bucket-name', {
  public: false
})
```

### Create Edge Function

```bash
# On the host server (vostro3470)
cd /opt/supabase/repo/docker
docker exec -it supabase-edge-functions deno --version
# Deploy functions via supabase CLI or copy to functions/ volume
```

### Test connection from project machine

```bash
# Check REST API
curl -s https://supabase.fdc-nhanvien.org/rest/v1/ \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczNjU5MTYwLCJleHAiOjE5MzEzMzkxNjB9.lE-QSeCAeoESfRY-edDbZ_XBjV5_yoefvAiOL7nzCOo"

# Check Auth
curl -s https://supabase.fdc-nhanvien.org/auth/v1/health \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzczNjU5MTYwLCJleHAiOjE5MzEzMzkxNjB9.lE-QSeCAeoESfRY-edDbZ_XBjV5_yoefvAiOL7nzCOo"
```

### Direct Postgres access (from LAN only)

```bash
PGPASSWORD=a2437d1bdc994db214ca3afdfad41c2e psql \
  -h 192.168.1.9 -p 5432 -U postgres -d postgres
```

---

## Known Constraints

- **SMTP not configured**: Auth emails (confirmation, password reset) will not send. For production auth flows, configure a real SMTP provider in `/opt/supabase/repo/docker/.env` on the host.
- **Direct Postgres port 5432** is only accessible from LAN (127.0.0.1 bind) — not exposed via Cloudflare Tunnel. Use the REST API (`/rest/v1/`) or SSH tunnel for remote access.
- **Realtime** is available but test subscription limits for high-volume projects.
- **Storage** uses local MinIO (not S3). Backups of `/opt/supabase/` cover storage data.
- **New schema exposure**: Adding a new schema requires editing `PGRST_DB_SCHEMAS` in `.env` and restarting the `rest` container.

---

## Migration Checklist

- [ ] Schema imported / created
- [ ] Data imported (if migrating existing data)
- [ ] RLS policies set on all tables
- [ ] Environment variables updated in the project
- [ ] Auth flow tested (sign up / sign in)
- [ ] Storage buckets created (if used)
- [ ] API connectivity verified: `curl https://supabase.fdc-nhanvien.org/rest/v1/`
- [ ] Realtime subscriptions tested (if used)
- [ ] Edge Functions deployed (if used)

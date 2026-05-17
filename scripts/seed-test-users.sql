-- ================================================================
-- Integration Details Portal — Test User Seed
-- Idempotent: safe to run multiple times (ON CONFLICT DO NOTHING)
--
-- Run via:
--   docker exec -i supabase_db_integration-details-revamp \
--     psql -U postgres -d postgres < data/seed-test-users.sql
--
-- Or against the local Supabase stack:
--   psql "$(supabase status | grep DB URL | awk '{print $3}')" \
--     < data/seed-test-users.sql
-- ================================================================

-- Fixed UUIDs so the script is idempotent across runs
-- admin@test.com   → a0000000-0000-0000-0000-000000000001
-- editor@test.com  → a0000000-0000-0000-0000-000000000002
-- viewer@test.com  → a0000000-0000-0000-0000-000000000003

-- ── 1. Insert into auth.users ─────────────────────────────────────

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  is_super_admin
)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@test.com',
    crypt('Admin1234!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Admin User"}',
    now(),
    now(),
    '', '', '', '', false
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'editor@test.com',
    crypt('Editor1234!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Editor User"}',
    now(),
    now(),
    '', '', '', '', false
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'viewer@test.com',
    crypt('Viewer1234!', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Viewer User"}',
    now(),
    now(),
    '', '', '', '', false
  )
ON CONFLICT (id) DO NOTHING;

-- ── 2. Insert into public.users ───────────────────────────────────
-- The on_auth_user_created trigger fires on INSERT into auth.users,
-- but since we insert directly we also ensure the rows exist here.

INSERT INTO public.users (id, email, full_name)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin@test.com',  'Admin User'),
  ('a0000000-0000-0000-0000-000000000002', 'editor@test.com', 'Editor User'),
  ('a0000000-0000-0000-0000-000000000003', 'viewer@test.com', 'Viewer User')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Assign roles (global scope) ────────────────────────────────

INSERT INTO public.user_roles (user_id, role_id, scope_type, scope_id)
SELECT 'a0000000-0000-0000-0000-000000000001', id, 'global', NULL
  FROM public.roles WHERE name = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id, scope_type, scope_id)
SELECT 'a0000000-0000-0000-0000-000000000002', id, 'global', NULL
  FROM public.roles WHERE name = 'editor'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role_id, scope_type, scope_id)
SELECT 'a0000000-0000-0000-0000-000000000003', id, 'global', NULL
  FROM public.roles WHERE name = 'viewer'
ON CONFLICT DO NOTHING;

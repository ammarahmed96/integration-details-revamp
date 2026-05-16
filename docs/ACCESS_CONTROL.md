# Access Control — Integration Details Portal

## Role Definitions

| Role | Scope | Description |
|---|---|---|
| `admin` | Global | Full CRUD on all tables; user and role management |
| `editor` | Global | Create and update all domain data; cannot manage users |
| `viewer` | Global | Read-only across all tables; can export |
| `auditor` | Global | Read-only + full `audit_logs` access; cannot modify data |
| `site_editor` | Per-site | Editor permissions scoped to one or more assigned sites |
| `org_editor` | Per-org | Editor permissions scoped to one or more assigned organisations |

Roles are additive and composable. A user can hold multiple roles at different scopes (e.g. global `viewer` + `site_editor` on two specific sites).

---

## Permission Matrix

`✓` = allowed · `—` = denied · `(own)` = own records only

### Core Tables

| Table | admin | editor | viewer | auditor | site_editor |
|---|---|---|---|---|---|
| `sites` SELECT | ✓ | ✓ | ✓ | ✓ | ✓ (assigned) |
| `sites` INSERT/UPDATE | ✓ | ✓ | — | — | — |
| `sites` DELETE | ✓ | — | — | — | — |
| `facilities` SELECT | ✓ | ✓ | ✓ | ✓ | ✓ (assigned) |
| `facilities` INSERT/UPDATE | ✓ | ✓ | — | — | ✓ (assigned) |
| `facilities` DELETE | ✓ | — | — | — | — |

### Domain Tables (ehr_details, receiving_feeds, parsing_feeds, epic_integrations, facility_cohorts, cm_details, facility_cm_cohorts, letters_config, reporting_db, server_configs, facility_ports, facility_icp_golive, servers)

| Operation | admin | editor | viewer | auditor | site_editor |
|---|---|---|---|---|---|
| SELECT | ✓ | ✓ | ✓ | ✓ | ✓ (assigned sites) |
| INSERT / UPDATE | ✓ | ✓ | — | — | ✓ (assigned sites) |
| DELETE | ✓ | — | — | — | — |

### Auth & Admin Tables

| Table | admin | editor | viewer | auditor | site_editor |
|---|---|---|---|---|---|
| `users` SELECT | ✓ | ✓ | — | — | — |
| `users` INSERT/UPDATE/DELETE | ✓ | — | — | — | — |
| `roles` SELECT | ✓ | ✓ | — | — | — |
| `user_roles` SELECT | ✓ | — | — | — | — |
| `user_roles` INSERT/UPDATE/DELETE | ✓ | — | — | — | — |

### Audit & Export Tables

| Table | admin | editor | viewer | auditor | site_editor |
|---|---|---|---|---|---|
| `audit_logs` SELECT | ✓ | — | — | ✓ | — |
| `audit_logs` INSERT | service role only | | | | |
| `audit_logs` UPDATE/DELETE | — | — | — | — | — |
| `exports` SELECT | ✓ | ✓ (own) | ✓ (own) | — | ✓ (own) |
| `exports` INSERT | ✓ | ✓ | ✓ | — | ✓ |
| `exports` DELETE | ✓ | ✓ (own) | — | — | — |

---

## Supabase RLS Implementation

### Prerequisites

The `users` table links to Supabase Auth — `users.id` references `auth.users(id)`.
`auth.uid()` therefore directly identifies the current user in all RLS expressions.

### Step 1 — Update users table

```sql
-- users.id must reference auth.users so auth.uid() resolves directly
ALTER TABLE users ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
```

### Step 2 — Auto-provision user record on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
```

### Step 3 — Role-check helper functions

These are called inside RLS policies. `SECURITY DEFINER` + `STABLE` lets Postgres cache the result per query.

```sql
-- Is the current user an admin (global scope)?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
      AND ur.scope_type = 'global'
  );
$$;

-- Can the current user write to any site (global editor or admin)?
CREATE OR REPLACE FUNCTION is_global_editor()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'editor')
      AND ur.scope_type = 'global'
  );
$$;

-- Can the current user read any data?
CREATE OR REPLACE FUNCTION is_authenticated_reader()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
  );
$$;

-- Can the current user write to a specific site?
CREATE OR REPLACE FUNCTION can_edit_site(p_site_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'editor', 'site_editor', 'org_editor')
      AND (
        ur.scope_type = 'global'
        OR (ur.scope_type = 'site' AND ur.scope_id = p_site_id)
      )
  );
$$;

-- Can the current user read a specific site?
CREATE OR REPLACE FUNCTION can_read_site(p_site_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'editor', 'viewer', 'auditor', 'site_editor', 'org_editor')
      AND (
        ur.scope_type = 'global'
        OR (ur.scope_type = 'site' AND ur.scope_id = p_site_id)
      )
  );
$$;

-- Is the current user an auditor?
CREATE OR REPLACE FUNCTION is_auditor()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'auditor')
      AND ur.scope_type = 'global'
  );
$$;
```

### Step 4 — Enable RLS and apply policies

#### sites

```sql
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sites: authenticated users can read"
  ON sites FOR SELECT
  USING (is_authenticated_reader());

CREATE POLICY "sites: global editors can insert"
  ON sites FOR INSERT
  WITH CHECK (is_global_editor());

CREATE POLICY "sites: global editors can update"
  ON sites FOR UPDATE
  USING (is_global_editor())
  WITH CHECK (is_global_editor());

CREATE POLICY "sites: only admins can delete"
  ON sites FOR DELETE
  USING (is_admin());
```

#### facilities

```sql
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "facilities: read by authorised users"
  ON facilities FOR SELECT
  USING (can_read_site(site_id));

CREATE POLICY "facilities: write by site editors or above"
  ON facilities FOR INSERT
  WITH CHECK (can_edit_site(site_id));

CREATE POLICY "facilities: update by site editors or above"
  ON facilities FOR UPDATE
  USING (can_edit_site(site_id))
  WITH CHECK (can_edit_site(site_id));

CREATE POLICY "facilities: only admins can delete"
  ON facilities FOR DELETE
  USING (is_admin());
```

#### Domain tables (apply same pattern for all)

The pattern below applies to: `ehr_details`, `receiving_feeds`, `parsing_feeds`,
`epic_integrations`, `facility_cohorts`, `cm_details`, `facility_cm_cohorts`,
`letters_config`, `reporting_db`, `server_configs`, `facility_ports`, `facility_icp_golive`.

Each joins back to `facilities` to resolve `site_id`.

```sql
-- Template — replace <table> and <fk_col> for each table
-- <fk_col> is the column referencing facilities(id), always named facility_id

ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<table>: read"
  ON <table> FOR SELECT
  USING (
    can_read_site((SELECT site_id FROM facilities WHERE id = facility_id))
  );

CREATE POLICY "<table>: write"
  ON <table> FOR INSERT
  WITH CHECK (
    can_edit_site((SELECT site_id FROM facilities WHERE id = facility_id))
  );

CREATE POLICY "<table>: update"
  ON <table> FOR UPDATE
  USING (
    can_edit_site((SELECT site_id FROM facilities WHERE id = facility_id))
  );

CREATE POLICY "<table>: delete (admin only)"
  ON <table> FOR DELETE
  USING (is_admin());
```

#### servers (lookup table — editors can write)

```sql
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "servers: read by all authenticated"
  ON servers FOR SELECT USING (is_authenticated_reader());

CREATE POLICY "servers: write by global editors"
  ON servers FOR INSERT WITH CHECK (is_global_editor());

CREATE POLICY "servers: update by global editors"
  ON servers FOR UPDATE USING (is_global_editor());

CREATE POLICY "servers: delete by admin"
  ON servers FOR DELETE USING (is_admin());
```

#### users

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: admins and editors can read"
  ON users FOR SELECT
  USING (is_global_editor());

CREATE POLICY "users: only admins can insert/update/delete"
  ON users FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

#### roles & user_roles

```sql
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles: readable by editors and above"
  ON roles FOR SELECT USING (is_global_editor());
CREATE POLICY "roles: managed by admins only"
  ON roles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles: managed by admins only"
  ON user_roles FOR ALL USING (is_admin()) WITH CHECK (is_admin());
```

#### audit_logs

```sql
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and auditors can read the audit trail
CREATE POLICY "audit_logs: read by auditors"
  ON audit_logs FOR SELECT USING (is_auditor());

-- Inserts come from server-side only (service role key bypasses RLS)
-- No client-facing INSERT policy intentionally.

-- Nobody can update or delete audit entries (immutable)
```

#### exports

```sql
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exports: users see own exports; admins see all"
  ON exports FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "exports: any authenticated user can create"
  ON exports FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_authenticated_reader());

CREATE POLICY "exports: users can delete own; admin can delete all"
  ON exports FOR DELETE
  USING (user_id = auth.uid() OR is_admin());
```

---

## Audit Log Strategy

Audit entries are written server-side via the Supabase **service role key** (which bypasses RLS). Never expose the service role key to the browser.

```typescript
// Server action — called after any successful mutation
async function writeAudit({
  userId, table, recordId, action, oldData, newData
}: AuditEntry) {
  await supabaseAdmin.from('audit_logs').insert({
    user_id:    userId,
    table_name: table,
    record_id:  recordId,
    action,
    old_data:   oldData ?? null,
    new_data:   newData ?? null,
  })
}
```

Mutations that must write an audit entry: all `INSERT`, `UPDATE`, and `DELETE` operations on `facilities` and every domain table. Implemented as a wrapper around Supabase mutations in `packages/db/src/audit.ts`.

---

## PHI / Data Sensitivity Notes

| Category | Applies To | Requirement |
|---|---|---|
| Facility names / identifiers | `facilities`, `sites` | Internal identifiers only — do not expose in public URLs |
| EHR UUIDs | `ehr_details` | Treat as sensitive — exclude from CSV exports unless explicitly requested by Admin |
| Server IPs / URLs | `servers`, `server_configs` | Restrict to Admin + Editor only in the UI; never include in Viewer-facing exports |
| Ports | `facility_ports` | Same as Server IPs |
| Audit logs | `audit_logs` | Auditor role only; do not expose in API routes that lack auth middleware |
| S3 / SFTP paths | `server_configs` | Restrict same as Server IPs |

### Supabase project settings checklist

- [ ] Enable **Email confirmations** (no magic-link only flows without review)
- [ ] Set **JWT expiry** to 1 hour; enable **refresh token rotation**
- [ ] Restrict **Supabase dashboard access** to named admin emails only
- [ ] Never commit `SUPABASE_SERVICE_ROLE_KEY` — server-side env only
- [ ] Enable **SSL enforcement** on the Supabase project
- [ ] Enable **Point-in-Time Recovery** (Pro plan) before go-live
- [ ] Set **allowed redirect URLs** to production domain only before go-live

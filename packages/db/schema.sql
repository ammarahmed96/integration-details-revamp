-- ================================================================
-- Integration Details Portal — Full Database Schema
-- Apply via: Supabase SQL editor or psql
-- ================================================================

-- ── Enums ────────────────────────────────────────────────────────

CREATE TYPE cohort_type AS ENUM (
  'lcs', 'lung', 'g_lung', 'aaa', 'taa', 'pancreas',
  'ielcap', 'thyroid', 'liver', 'renal', 'calcium', 'af', 'breast'
);

-- ADT and ORU receiving feeds are tri-state (not plain boolean)
CREATE TYPE feed_status AS ENUM ('active', 'inactive', 'flat_file');

-- ── Core ─────────────────────────────────────────────────────────

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE facilities (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                    UUID NOT NULL REFERENCES sites(id),
  campus_id                  TEXT,           -- NULL when no ID in source; UNIQUE within a site
  name                       TEXT NOT NULL,
  is_active                  BOOLEAN NOT NULL DEFAULT true,
  ehr_index_pattern          TEXT,
  has_sso                    BOOLEAN,
  implementation_package_url TEXT,
  created_at                 TIMESTAMPTZ DEFAULT now(),
  updated_at                 TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, campus_id)
);

-- ── EHR Details ──────────────────────────────────────────────────

CREATE TABLE ehr_details (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id      UUID UNIQUE NOT NULL REFERENCES facilities(id),
  ehr_facility_id  TEXT,
  ehr_site_id      TEXT,
  ehr_interface_id TEXT,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ── Receiving Feed ────────────────────────────────────────────────

CREATE TABLE receiving_feeds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID UNIQUE NOT NULL REFERENCES facilities(id),
  adt         feed_status NOT NULL DEFAULT 'inactive',
  oru         feed_status NOT NULL DEFAULT 'inactive',
  orm         BOOLEAN NOT NULL DEFAULT false,
  siu         BOOLEAN NOT NULL DEFAULT false,
  mdm         BOOLEAN NOT NULL DEFAULT false,
  bar         BOOLEAN NOT NULL DEFAULT false,
  mfn         BOOLEAN NOT NULL DEFAULT false,
  clarity     BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Parsing Feed ──────────────────────────────────────────────────

CREATE TABLE parsing_feeds (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id          UUID UNIQUE NOT NULL REFERENCES facilities(id),
  parsing_files        BOOLEAN NOT NULL DEFAULT false,
  adt                  BOOLEAN NOT NULL DEFAULT false,
  oru                  BOOLEAN NOT NULL DEFAULT false,
  orm                  BOOLEAN NOT NULL DEFAULT false,
  siu                  BOOLEAN NOT NULL DEFAULT false,
  flat_file_scheduling BOOLEAN NOT NULL DEFAULT false,
  mdm                  BOOLEAN NOT NULL DEFAULT false,
  bar                  BOOLEAN NOT NULL DEFAULT false,
  mfn                  BOOLEAN NOT NULL DEFAULT false,
  clarity              BOOLEAN NOT NULL DEFAULT false,
  physician_clarity    BOOLEAN NOT NULL DEFAULT false,
  exam_clarity         BOOLEAN NOT NULL DEFAULT false,
  eon_connect          BOOLEAN NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- ── EPIC Integrations ─────────────────────────────────────────────

CREATE TABLE epic_integrations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id        UUID UNIQUE NOT NULL REFERENCES facilities(id),
  fhir               BOOLEAN NOT NULL DEFAULT false,
  outgoing_mdm       BOOLEAN NOT NULL DEFAULT false,
  parsing_middleware TEXT CHECK (parsing_middleware IN (
    'eon-middleware', 'eon-hca-middleware', 'eon-middleware-bmhcc',
    'eon-lpnt-middleware', 'eon-ascension-middleware', 'eon-uch-middleware',
    'eon-geisinger-middleware', 'eon-middleware-queue'
  )),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ── Live Cohorts (M2M) ────────────────────────────────────────────

CREATE TABLE facility_cohorts (
  facility_id UUID        NOT NULL REFERENCES facilities(id),
  cohort      cohort_type NOT NULL,
  is_live     BOOLEAN     NOT NULL DEFAULT false,
  PRIMARY KEY (facility_id, cohort)
);

-- ── Centralised Management ────────────────────────────────────────

CREATE TABLE cm_details (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       UUID UNIQUE NOT NULL REFERENCES facilities(id),
  letter_automation BOOLEAN NOT NULL DEFAULT false,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE facility_cm_cohorts (
  facility_id UUID        NOT NULL REFERENCES facilities(id),
  cohort      cohort_type NOT NULL,
  cm_type     TEXT        NOT NULL CHECK (cm_type IN ('hybrid', 'full')),
  PRIMARY KEY (facility_id, cohort, cm_type)
);

-- ── Letters ───────────────────────────────────────────────────────

CREATE TABLE letters_config (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id        UUID UNIQUE NOT NULL REFERENCES facilities(id),
  letters_to_epic    BOOLEAN NOT NULL DEFAULT false,
  quadient_service   BOOLEAN NOT NULL DEFAULT false,
  matching_algorithm TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ── Reporting DB ──────────────────────────────────────────────────

CREATE TABLE reporting_db (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID UNIQUE NOT NULL REFERENCES facilities(id),
  db_name     TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Servers lookup ────────────────────────────────────────────────

CREATE TABLE servers (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name    TEXT UNIQUE NOT NULL,
  ip      TEXT,
  hl7_url TEXT
);

-- ── Server & Config ───────────────────────────────────────────────

CREATE TABLE server_configs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id      UUID UNIQUE NOT NULL REFERENCES facilities(id),
  server_id        UUID REFERENCES servers(id),
  server_ip        TEXT,
  s3_folder        TEXT,
  sftp_folder_link TEXT,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE facility_ports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  port_number TEXT NOT NULL,
  port_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── ICP Golive (M2M) ──────────────────────────────────────────────

CREATE TABLE facility_icp_golive (
  facility_id UUID        NOT NULL REFERENCES facilities(id),
  cohort      cohort_type NOT NULL,
  is_live     BOOLEAN     NOT NULL DEFAULT false,
  PRIMARY KEY (facility_id, cohort)
);

-- ── Auth & Roles ──────────────────────────────────────────────────

CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT UNIQUE NOT NULL,
  full_name  TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE roles (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES
  ('admin'), ('editor'), ('viewer'), ('auditor'), ('site_editor'), ('org_editor');

CREATE TABLE user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('global', 'organization', 'site')),
  scope_id   UUID,
  UNIQUE NULLS NOT DISTINCT (user_id, role_id, scope_type, scope_id)
);

-- ── Audit ─────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  table_name TEXT        NOT NULL,
  record_id  UUID        NOT NULL,
  action     TEXT        NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  old_data   JSONB,
  new_data   JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Exports ───────────────────────────────────────────────────────

CREATE TABLE exports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  filter_json JSONB,
  file_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Auth trigger: auto-create user row on signup ─────────────────

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

-- ── RLS helper functions ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name = 'admin' AND ur.scope_type = 'global'
  );
$$;

CREATE OR REPLACE FUNCTION is_global_editor()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'editor') AND ur.scope_type = 'global'
  );
$$;

CREATE OR REPLACE FUNCTION is_authenticated_reader()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_auditor()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'auditor') AND ur.scope_type = 'global'
  );
$$;

CREATE OR REPLACE FUNCTION can_read_site(p_site_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin','editor','viewer','auditor','site_editor','org_editor')
      AND (ur.scope_type = 'global' OR (ur.scope_type = 'site' AND ur.scope_id = p_site_id))
  );
$$;

CREATE OR REPLACE FUNCTION can_edit_site(p_site_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin','editor','site_editor','org_editor')
      AND (ur.scope_type = 'global' OR (ur.scope_type = 'site' AND ur.scope_id = p_site_id))
  );
$$;

-- ── RLS policies ──────────────────────────────────────────────────

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sites: read"   ON sites FOR SELECT USING (is_authenticated_reader());
CREATE POLICY "sites: insert" ON sites FOR INSERT WITH CHECK (is_global_editor());
CREATE POLICY "sites: update" ON sites FOR UPDATE USING (is_global_editor()) WITH CHECK (is_global_editor());
CREATE POLICY "sites: delete" ON sites FOR DELETE USING (is_admin());

ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facilities: read"   ON facilities FOR SELECT USING (can_read_site(site_id));
CREATE POLICY "facilities: insert" ON facilities FOR INSERT WITH CHECK (can_edit_site(site_id));
CREATE POLICY "facilities: update" ON facilities FOR UPDATE USING (can_edit_site(site_id)) WITH CHECK (can_edit_site(site_id));
CREATE POLICY "facilities: delete" ON facilities FOR DELETE USING (is_admin());

-- Domain tables — macro applied per table
DO $$ DECLARE t TEXT; BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'ehr_details','receiving_feeds','parsing_feeds','epic_integrations',
    'facility_cohorts','cm_details','facility_cm_cohorts','letters_config',
    'reporting_db','server_configs','facility_ports','facility_icp_golive'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "%s: read" ON %I FOR SELECT USING (can_read_site((SELECT site_id FROM facilities WHERE id = facility_id)))', t, t);
    EXECUTE format(
      'CREATE POLICY "%s: write" ON %I FOR INSERT WITH CHECK (can_edit_site((SELECT site_id FROM facilities WHERE id = facility_id)))', t, t);
    EXECUTE format(
      'CREATE POLICY "%s: update" ON %I FOR UPDATE USING (can_edit_site((SELECT site_id FROM facilities WHERE id = facility_id)))', t, t);
    EXECUTE format(
      'CREATE POLICY "%s: delete" ON %I FOR DELETE USING (is_admin())', t, t);
  END LOOP;
END $$;

ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "servers: read"   ON servers FOR SELECT USING (is_authenticated_reader());
CREATE POLICY "servers: insert" ON servers FOR INSERT WITH CHECK (is_global_editor());
CREATE POLICY "servers: update" ON servers FOR UPDATE USING (is_global_editor());
CREATE POLICY "servers: delete" ON servers FOR DELETE USING (is_admin());

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users: editors can read" ON users FOR SELECT USING (is_global_editor());
CREATE POLICY "users: admin only write" ON users FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles: editors can read" ON roles FOR SELECT USING (is_global_editor());
CREATE POLICY "roles: admin only write" ON roles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles: admin only" ON user_roles FOR ALL USING (is_admin()) WITH CHECK (is_admin());

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs: auditors read" ON audit_logs FOR SELECT USING (is_auditor());

ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exports: read own or admin"   ON exports FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "exports: insert authenticated" ON exports FOR INSERT WITH CHECK (user_id = auth.uid() AND is_authenticated_reader());
CREATE POLICY "exports: delete own or admin" ON exports FOR DELETE USING (user_id = auth.uid() OR is_admin());

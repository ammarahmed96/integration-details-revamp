# Integration Details Portal — Project Plan

## Background

The current system is a single Excel workbook with a `SitesCampuses` tab containing ~3,158 rows and 76 columns, grouped into thematic sections:

- Site / Facility identity
- EHR details
- Receiving Feed
- Parsing Feed
- EPIC Integrations
- Live Cohorts
- Centralised Management
- Letters
- Reporting DB
- Server & Config Info
- Intelligent Care Plan Golive

**Pain points:** brittle edit access, no audit trail, hard to query, no role separation, training overhead, export is manual.

---

## Option A — Postgres + Next.js + Prisma + Custom Admin Portal

### Overview

Self-hosted stack. You own every layer. Best when you need fine-grained control over hosting, auth, and data residency.

```
Next.js (App Router)
  └── Prisma ORM
       └── PostgreSQL (self-hosted or RDS/Cloud SQL)
  └── NextAuth.js (auth)
  └── REST/tRPC API routes
```

### Pros

- Full control over schema, migrations, and hosting environment
- Prisma gives typed, safe DB access and first-class migration tooling
- No vendor lock-in — swap hosting without touching app code
- Easier to satisfy on-premise or strict data-residency requirements
- NextAuth supports SSO/SAML/OAuth providers for enterprise needs

### Cons

- You manage infrastructure: backups, failover, connection pooling (PgBouncer), TLS
- Auth, storage, and realtime must be wired manually
- Longer time to a working prototype vs. Supabase
- Requires DevOps expertise for production hardening

---

## Option B — Supabase + Next.js (Recommended for MVP speed)

### Overview

Supabase wraps Postgres with auth, row-level security, storage, and a REST/realtime API out of the box. Dramatically reduces setup time.

```
Next.js (App Router)
  └── Supabase JS client
       └── Supabase (managed Postgres + Auth + Storage + RLS)
  └── Supabase Auth (email/password, SSO, OAuth)
  └── Supabase Storage (file attachments, exports)
```

### Pros

- Postgres under the hood — same SQL, same power
- Built-in auth with Row Level Security enforced at the DB layer
- Dashboard, migrations, backups, and connection pooling included
- Realtime subscriptions for collaborative editing without extra infra
- Storage API for attachments (e.g. config files per site)
- Faster path to a working MVP
- Can self-host Supabase later if requirements change

### Cons

- Vendor dependency (mitigated by it being open-source and self-hostable)
- Supabase cloud has pricing tiers; large row counts need the Pro plan
- Less flexibility for exotic auth flows vs. rolling your own
- Some advanced Postgres features (e.g. custom extensions) require extra steps

---

## Recommended Database Entities (both options share this schema)

> Schema updated after column audit of `SitesCampuses` (1,095 facilities, 74 sites, 76 columns).
> Full audit: `docs/COLUMN_AUDIT.md`.

### Core Entities

| Entity | Purpose |
|---|---|
| `organizations` | Top-level client/organisation |
| `sites` | Physical or logical site (campus) — 74 distinct in source data |
| `facilities` | A facility within a site — 1,095 active + 92 deactivated |
| `users` | Portal users |
| `roles` | Role definitions (admin, editor, viewer, auditor) |
| `user_roles` | Many-to-many: users ↔ roles, scoped to org/site |
| `audit_logs` | Every create/update/delete event |
| `exports` | Export job records and download links |

### Domain Entities (mapped from Excel column groups)

| Entity | Maps To | Notes |
|---|---|---|
| `ehr_details` | EHR Details section | One row per facility |
| `receiving_feeds` | Receiving Feed section | One row per facility; ADT/ORU are tri-state |
| `parsing_feeds` | Parsing Feed section | One row per facility; all boolean |
| `epic_integrations` | EPIC Integrations section | One row per facility; Parsing Middleware is an enum |
| `facility_cohorts` | Live Cohorts section | M2M — replaces 13 boolean columns |
| `cm_details` | Centralised Management scalars | One row per facility |
| `facility_cm_cohorts` | CM Hybrid/Full Golive | M2M — cohort name lists parsed from Excel |
| `letters_config` | Letters section | One row per facility |
| `reporting_db` | EPM ML Reporting DB section | One row per facility |
| `servers` | Server & Config Info (lookup) | 6 distinct named servers; FK target |
| `server_configs` | Server & Config Info (per facility) | One row per facility; FK to `servers` |
| `facility_icp_golive` | Intelligent Care Plan Golive | M2M — mirrors cohort structure |

---

## Suggested Schema

```sql
-- ============================================================
-- Shared enum types
-- ============================================================

CREATE TYPE cohort_type AS ENUM (
  'lcs', 'lung', 'g_lung', 'aaa', 'taa', 'pancreas',
  'ielcap', 'thyroid', 'liver', 'renal', 'calcium', 'af', 'breast'
);

-- ADT and ORU receiving feeds are tri-state (not plain boolean)
CREATE TYPE feed_status AS ENUM ('active', 'inactive', 'flat_file');

-- ============================================================
-- Core
-- ============================================================

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  slug            TEXT UNIQUE NOT NULL,  -- e.g. "advent", "hca-prod"
  name            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE facilities (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id                   UUID NOT NULL REFERENCES sites(id),
  campus_id                 TEXT,           -- nullable: NULL when Excel had no ID or when a duplicate row is imported
  name                      TEXT NOT NULL,
  is_active                 BOOLEAN NOT NULL DEFAULT true,
  ehr_index_pattern         TEXT,
  has_sso                   BOOLEAN,
  implementation_package_url TEXT,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  UNIQUE (site_id, campus_id)  -- same campus_id valid across sites; NULLs never conflict
);

-- ============================================================
-- EHR Details  (one row per facility)
-- ============================================================

CREATE TABLE ehr_details (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id      UUID UNIQUE NOT NULL REFERENCES facilities(id),
  ehr_facility_id  TEXT,   -- UUID from EHR system
  ehr_site_id      TEXT,   -- UUID from EHR system
  ehr_interface_id TEXT,   -- UUID from EHR system
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Receiving Feed  (one row per facility)
-- ADT + ORU use feed_status enum; all others are boolean
-- ============================================================

CREATE TABLE receiving_feeds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id     UUID UNIQUE NOT NULL REFERENCES facilities(id),
  adt             feed_status NOT NULL DEFAULT 'inactive',
  oru             feed_status NOT NULL DEFAULT 'inactive',
  orm             BOOLEAN NOT NULL DEFAULT false,
  siu             BOOLEAN NOT NULL DEFAULT false,
  mdm             BOOLEAN NOT NULL DEFAULT false,
  bar             BOOLEAN NOT NULL DEFAULT false,
  mfn             BOOLEAN NOT NULL DEFAULT false,
  clarity         BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Parsing Feed  (one row per facility; all boolean)
-- ============================================================

CREATE TABLE parsing_feeds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id       UUID UNIQUE NOT NULL REFERENCES facilities(id),
  parsing_files     BOOLEAN NOT NULL DEFAULT false,
  adt               BOOLEAN NOT NULL DEFAULT false,
  oru               BOOLEAN NOT NULL DEFAULT false,
  orm               BOOLEAN NOT NULL DEFAULT false,
  siu               BOOLEAN NOT NULL DEFAULT false,
  flat_file_scheduling BOOLEAN NOT NULL DEFAULT false,
  mdm               BOOLEAN NOT NULL DEFAULT false,
  bar               BOOLEAN NOT NULL DEFAULT false,
  mfn               BOOLEAN NOT NULL DEFAULT false,
  clarity           BOOLEAN NOT NULL DEFAULT false,
  physician_clarity BOOLEAN NOT NULL DEFAULT false,
  exam_clarity      BOOLEAN NOT NULL DEFAULT false,
  eon_connect       BOOLEAN NOT NULL DEFAULT false,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- EPIC Integrations  (one row per facility)
-- parsing_middleware is an 8-value enum stored as TEXT
-- ============================================================

CREATE TABLE epic_integrations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id        UUID UNIQUE NOT NULL REFERENCES facilities(id),
  fhir               BOOLEAN NOT NULL DEFAULT false,
  outgoing_mdm       BOOLEAN NOT NULL DEFAULT false,
  parsing_middleware TEXT CHECK (parsing_middleware IN (
    'eon-middleware',
    'eon-hca-middleware',
    'eon-middleware-bmhcc',
    'eon-lpnt-middleware',
    'eon-ascension-middleware',
    'eon-uch-middleware',
    'eon-geisinger-middleware',
    'eon-middleware-queue'
  )),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Live Cohorts  (M2M — one row per facility+cohort combination)
-- Replaces 13 boolean columns in the Excel sheet.
-- Adding a new cohort type = add an enum value, not a column.
-- ============================================================

CREATE TABLE facility_cohorts (
  facility_id UUID        NOT NULL REFERENCES facilities(id),
  cohort      cohort_type NOT NULL,
  is_live     BOOLEAN     NOT NULL DEFAULT false,
  PRIMARY KEY (facility_id, cohort)
);

-- ============================================================
-- Centralised Management
-- ============================================================

-- Scalar fields (one row per facility)
CREATE TABLE cm_details (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id      UUID UNIQUE NOT NULL REFERENCES facilities(id),
  letter_automation BOOLEAN NOT NULL DEFAULT false,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Cohort-level CM go-live flags (one row per facility+cohort+cm_type)
-- Hybrid Golive and Full CM Golive were comma-separated cohort lists in Excel.
CREATE TABLE facility_cm_cohorts (
  facility_id UUID        NOT NULL REFERENCES facilities(id),
  cohort      cohort_type NOT NULL,
  cm_type     TEXT        NOT NULL CHECK (cm_type IN ('hybrid', 'full')),
  PRIMARY KEY (facility_id, cohort, cm_type)
);

-- ============================================================
-- Letters  (one row per facility)
-- ============================================================

CREATE TABLE letters_config (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id        UUID UNIQUE NOT NULL REFERENCES facilities(id),
  letters_to_epic    BOOLEAN NOT NULL DEFAULT false,
  quadient_service   BOOLEAN NOT NULL DEFAULT false,
  matching_algorithm TEXT,   -- enum-like but needs cleaning; stored as TEXT
  updated_at         TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Reporting DB  (one row per facility)
-- db_name appears derived from ehr_index_pattern; confirm before storing.
-- ============================================================

CREATE TABLE reporting_db (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID UNIQUE NOT NULL REFERENCES facilities(id),
  db_name     TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Servers lookup  (6 distinct named servers in source data)
-- Normalised out of server_configs to avoid repeated free text.
-- ============================================================

CREATE TABLE servers (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name    TEXT UNIQUE NOT NULL,   -- e.g. "Ascension HL7 1"
  ip      TEXT,
  hl7_url TEXT
);

-- ============================================================
-- Server & Config  (one row per facility)
-- ============================================================

CREATE TABLE server_configs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id      UUID UNIQUE NOT NULL REFERENCES facilities(id),
  server_id        UUID REFERENCES servers(id),   -- FK to servers lookup
  server_ip        TEXT,                          -- per-facility IP
  s3_folder        TEXT,
  sftp_folder_link TEXT,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Ports are stored as TEXT and a facility can have multiple
-- (e.g. "22137_Ocala_Prod" and "21137_Test" on the same facility)
CREATE TABLE facility_ports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  port_number TEXT NOT NULL,   -- TEXT: may contain suffixes or combined values
  port_name   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ICP Golive  (M2M — mirrors facility_cohorts structure)
-- ============================================================

CREATE TABLE facility_icp_golive (
  facility_id UUID        NOT NULL REFERENCES facilities(id),
  cohort      cohort_type NOT NULL,
  is_live     BOOLEAN     NOT NULL DEFAULT false,
  PRIMARY KEY (facility_id, cohort)
);

-- ============================================================
-- Auth & Roles
-- ============================================================

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  full_name  TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE roles (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL   -- admin | editor | viewer | auditor
);

CREATE TABLE user_roles (
  user_id    UUID REFERENCES users(id),
  role_id    UUID REFERENCES roles(id),
  scope_type TEXT NOT NULL,   -- global | organization | site
  scope_id   UUID,            -- null for global
  PRIMARY KEY (user_id, role_id, scope_type,
    COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::UUID))
);

-- ============================================================
-- Audit
-- ============================================================

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

-- ============================================================
-- Exports
-- ============================================================

CREATE TABLE exports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  filter_json JSONB,
  file_url    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Migration Plan from Excel

### Phase 0 — Column Audit ✅ Complete

1. ✅ Exported `SitesCampuses` — 1,095 facilities, 74 sites, 76 columns.
2. ✅ Column inventory produced: `docs/COLUMN_AUDIT.md`.
3. ✅ All 76 columns mapped to target entities and fields.
4. ✅ 11 data quality issues flagged for stakeholder review.
5. ✅ Derived columns identified (`DB Name` from `ehr_index_pattern`).

### Phase 1 — Schema Finalisation (3 days)

1. Stakeholder sign-off on the 11 data quality issues in `COLUMN_AUDIT.md`.
2. Confirm `DB Name` derivation rule (computed vs. stored).
3. Confirm `Duplicate Folder Name` deprecation.
4. Schema is otherwise finalised — see **Suggested Schema** above.

### Phase 2 — Migration Script (1 week)

1. Write a one-time migration script (Python + pandas or Node.js).
2. Script reads the CSV, validates data, and inserts into the correct tables.
3. Handle known issues: merged cells, inconsistent date formats, multi-value cells (pipe-delimited, comma-delimited).
4. Run against a staging DB; compare row counts and spot-check 50 sites manually.
5. Document unmigratable rows (e.g. empty key fields) for manual review.

### Phase 3 — Parallel Run (2 weeks)

1. Excel remains the write-of-record.
2. DB is read-only to stakeholders for verification.
3. Identify discrepancies and fix migration script or schema.

### Phase 4 — Cutover

1. Final re-import from the latest Excel snapshot.
2. Lock Excel for writes; redirect team to the portal.
3. Archive the Excel file with a timestamp.

---

## Dashboard Pages

| Page | Description |
|---|---|
| `/` | Summary dashboard: total sites, live count, recent activity |
| `/sites` | Filterable, searchable table of all sites with status badges |
| `/sites/[id]` | Site detail: all grouped sections as collapsible panels |
| `/sites/[id]/facilities` | Facilities under a site |
| `/sites/[id]/history` | Audit log for this site |
| `/facilities` | Cross-site facility listing |
| `/facilities/[id]` | Facility detail view |
| `/admin/users` | User management and role assignment |
| `/admin/import` | Excel import tool (for ongoing or one-off imports) |
| `/reports` | Saved and ad-hoc export builder |
| `/reports/export` | "Sites where X is live" query UI + CSV/Excel download |

---

## User Roles

| Role | Permissions |
|---|---|
| **Admin** | Full CRUD on all entities, user management, import, export |
| **Editor** | Create and update sites/facilities/integrations; no user management |
| **Viewer** | Read-only access to all data; can export |
| **Auditor** | Read-only + full audit log access; cannot modify data |
| **Org Editor** | Editor scope limited to their assigned organization(s) |
| **Site Editor** | Editor scope limited to their assigned site(s) |

Roles are composable: a user can be a Viewer globally and an Editor on specific sites.

---

## Export / Reporting Approach

### Ad-hoc Query Builder (UI)

- Select entity (sites, integrations, feeds, etc.)
- Add filter conditions: `ehr_vendor = Epic`, `live_cohorts.status = live`, `go_live_date < 2025-01-01`
- Choose output columns
- Download as CSV or Excel (xlsx via `exceljs`)

### Saved Reports

- Persist filter JSON to `exports` table
- Shareable URL that re-runs the query on demand

### Pre-built Reports (MVP)

- "All sites where [integration type] is live"
- "Sites with no reporting DB configured"
- "Sites going live in the next 90 days"
- "Sites by EHR vendor"

### API Export (Post-MVP)

- REST endpoint: `GET /api/export?filter=...&format=csv`
- Useful for downstream BI tools (Metabase, Tableau, Power BI)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Excel column data quality is poor | High | High | Thorough audit in Phase 0; stakeholder sign-off on mappings |
| Schema needs changes mid-build | Medium | Medium | Lock schema before coding; use Prisma migrations |
| Adoption resistance from existing users | Medium | High | Parallel run period; training sessions; intuitive UI |
| RBAC complexity grows beyond plan | Medium | Medium | Start with flat global roles; add scoped roles in Phase 2 |
| Data residency / HIPAA compliance | Depends | High | Confirm requirements before choosing hosting; encrypt at rest |
| Excel used as backup after cutover | High | Medium | Lock file; communicate change firmly; archive publicly |

---

## MVP Scope

The MVP should be usable as a replacement for Excel read access immediately after launch. Write access follows once trust is established.

**In MVP:**
- Site list with search and filter (status, EHR vendor, org)
- Site detail page with all section panels (read-only first)
- Inline edit for all fields (editor role)
- Audit log per site
- Basic user auth (email/password or SSO)
- Admin: role assignment
- Export: CSV download of filtered site list
- Import: one-time Excel migration script (admin only)

**Out of MVP:**
- Facility sub-pages (link exists, detail page deferred)
- Saved reports
- API export
- Attachments/file storage
- Org-scoped roles
- Realtime collaboration indicators
- Power BI / Metabase connector

---

## Phase-wise Execution Plan

### Phase 1 — Foundation (Weeks 1–2)

- [ ] Column audit of Excel workbook; produce mapping document
- [ ] Finalise schema with stakeholder sign-off
- [ ] Set up monorepo: `apps/web`, `packages/db`, `packages/types`
- [ ] Provision DB (Supabase project or Postgres instance)
- [ ] Configure auth (Supabase Auth or NextAuth)
- [ ] Run Prisma migrations (Option A) or apply SQL (Option B)
- [ ] Write and test Excel migration script in staging

### Phase 2 — Core Portal (Weeks 3–5)

- [ ] Site list page with search/filter
- [ ] Site detail page with all section panels
- [ ] Inline edit form with validation
- [ ] Audit log display per site
- [ ] Role-based access enforcement (middleware + DB layer)
- [ ] Basic admin: user list, role assignment

### Phase 3 — Export & Import (Week 6)

- [ ] CSV export from filtered site list
- [ ] Excel download (xlsx)
- [ ] Admin import UI (re-run migration script from UI)
- [ ] Pre-built reports (5 standard queries)

### Phase 4 — Parallel Run & Cutover (Weeks 7–8)

- [ ] Stakeholder UAT against staging environment
- [ ] Final Excel import from latest snapshot
- [ ] Training sessions for editors and viewers
- [ ] Go-live; archive Excel file
- [ ] Monitor for issues; bug fix sprint

### Phase 5 — Post-MVP (Weeks 9–12)

- [ ] Facility detail pages
- [ ] Saved / shareable reports
- [ ] Org-scoped and site-scoped role refinements
- [ ] REST API for BI tool integration
- [ ] File attachments per site (config files, contracts)
- [ ] Performance tuning for large result sets

---

## Recommendation

**Use Option B (Supabase) for MVP.** It eliminates infrastructure overhead, gives you auth and Row Level Security at the DB layer out of the box, and cuts 2–3 weeks off the path to a working prototype. The Postgres core means you are not locked in — you can migrate to self-hosted Supabase or a plain Postgres stack later with no application code changes.

Once the system is proven in production, revisit the hosting model if data-residency or cost requirements demand it.

# SitesCampuses Column Audit

Generated: 2026-05-17  
Source: `data/integration-details.xlsx` → sheet `SitesCampuses`

---

## Summary Statistics

| Metric | Value |
|---|---|
| Total rows in sheet | 3,158 (including 2 header rows) |
| Data rows | 3,156 |
| Blank separator rows | 2,061 |
| **Actual facility records** | **1,095** |
| Deactivated facilities | 92 |
| Active facilities | 1,003 |
| Distinct sites (Site Ids) | 74 |
| Distinct facility IDs (campus_id) | 957 |
| Total columns | 76 |

> **Row structure note:** The sheet uses blank rows as visual group separators between sites. Every data row represents one facility. All "% populated" figures below are relative to the 1,095 facility records, not raw row count.

---

## Largest Sites by Facility Count

| Site ID | Facility Count |
|---|---|
| hca-prod | 127 |
| bmhcc | 99 |
| lifepoint | 85 |
| ascension | 78 |
| bhsf | 56 |
| ardent | 32 |
| uchealth | 30 |
| tgh | 30 |
| ccf-screening | 26 |
| baptist | 25 |

---

## Section: Identity (no section header in Excel)

| # | Column | Type | % Pop | Distinct | Kind | Target Entity | Target Field | Notes |
|---|---|---|---|---|---|---|---|---|
| 0 | Facility Name | text | ~100% | 1,087 | free-text | `facilities` | `name` | Primary identifier |
| 1 | Facility Id (campus_id) | text | ~100% | 957 | free-text | `facilities` | `campus_id` | Natural key; used everywhere as FK |
| 2 | Deactivated/Disabled | boolean | ~100% | 2 | boolean | `facilities` | `is_active` | Invert: `True` → `is_active = false` |

---

## Section: Site

| # | Column | Type | % Pop | Distinct | Kind | Target Entity | Target Field | Notes |
|---|---|---|---|---|---|---|---|---|
| 3 | Site Ids | text | ~100% | 74 | free-text | `sites` | `slug` | FK; becomes the `sites` primary lookup key |
| 4 | Site Name | text | ~100% | 86 | free-text | `sites` | `name` | Multiple display names per site slug (variant names) |

---

## Section: EHR

| # | Column | Type | % Pop | Distinct | Kind | Target Entity | Target Field | Notes |
|---|---|---|---|---|---|---|---|---|
| 5 | EHR Facility ID | text | 20% | 384 | free-text | `ehr_details` | `ehr_facility_id` | UUID-format; sparse — many facilities share a site EHR config |
| 6 | EHR Site ID | text | 26% | 76 | free-text | `ehr_details` | `ehr_site_id` | UUID-format; one per site |
| 7 | EHR Interface ID | text | 31% | 211 | free-text | `ehr_details` | `ehr_interface_id` | UUID-format |
| 8 | EHR Index Pattern | text | ~100% | 169 | free-text | `facilities` | `ehr_index_pattern` | Pattern like `hl7-advent-ocala`; used to derive DB name |

---

## Section: Receiving Feed

ADT and ORU are **tri-state**, not boolean: `true | false | "flat file"` (187 facilities use flat file).  
All other receiving feed columns are pure boolean.

| # | Column | Type | % Pop | Distinct | Kind | Target Entity | Target Field | Schema Type |
|---|---|---|---|---|---|---|---|---|
| 9 | ADT | mixed | ~100% | 3 | enum | `receiving_feeds` | `adt` | `TEXT` — enum: `active\|inactive\|flat_file` |
| 10 | ORU | mixed | ~100% | 3 | enum | `receiving_feeds` | `oru` | `TEXT` — enum: `active\|inactive\|flat_file` |
| 11 | ORM | boolean | ~100% | 2 | boolean | `receiving_feeds` | `orm` | `BOOLEAN` |
| 12 | SIU | boolean | ~100% | 2 | boolean | `receiving_feeds` | `siu` | `BOOLEAN` |
| 13 | MDM | boolean | ~100% | 2 | boolean | `receiving_feeds` | `mdm` | `BOOLEAN` |
| 14 | BAR | boolean | ~100% | 2 | boolean | `receiving_feeds` | `bar` | `BOOLEAN` |
| 15 | MFN | boolean | ~100% | 2 | boolean | `receiving_feeds` | `mfn` | `BOOLEAN` |
| 16 | Clarity | boolean | ~100% | 2 | boolean | `receiving_feeds` | `clarity` | `BOOLEAN` |

> **Migration action:** Convert ADT/ORU: `True → 'active'`, `False → 'inactive'`, `'flat file' → 'flat_file'`.

---

## Section: Parsing Feed

All 13 columns are pure boolean.

| # | Column | % Pop | Target Entity | Target Field |
|---|---|---|---|---|
| 17 | Parsing Files | ~100% | `parsing_feeds` | `parsing_files` |
| 18 | ADT | ~100% | `parsing_feeds` | `adt` |
| 19 | ORU | ~100% | `parsing_feeds` | `oru` |
| 20 | ORM | ~100% | `parsing_feeds` | `orm` |
| 21 | SIU | ~100% | `parsing_feeds` | `siu` |
| 22 | Flat File Scheduling | ~100% | `parsing_feeds` | `flat_file_scheduling` |
| 23 | MDM | ~100% | `parsing_feeds` | `mdm` |
| 24 | BAR | ~100% | `parsing_feeds` | `bar` |
| 25 | MFN | ~100% | `parsing_feeds` | `mfn` |
| 26 | Clarity | ~100% | `parsing_feeds` | `clarity` |
| 27 | Physician Clarity | ~100% | `parsing_feeds` | `physician_clarity` |
| 28 | Exam Clarity | ~100% | `parsing_feeds` | `exam_clarity` |
| 29 | Eon Connect | 99% | `parsing_feeds` | `eon_connect` |

---

## Section: EPIC Integrations

| # | Column | Type | % Pop | Distinct | Kind | Target Entity | Target Field | Notes |
|---|---|---|---|---|---|---|---|---|
| 30 | FHIR | boolean | ~100% | 2 | boolean | `epic_integrations` | `fhir` | `BOOLEAN` |
| 31 | Outgoing MDM | boolean | ~100% | 2 | boolean | `epic_integrations` | `outgoing_mdm` | `BOOLEAN` |
| 32 | Parsing Middleware | text | ~100% | 8 | **enum** | `epic_integrations` | `parsing_middleware` | Clean enum — see values below |

**Parsing Middleware enum values:**

| Value | Count |
|---|---|
| eon-middleware | 608 |
| eon-hca-middleware | 187 |
| eon-middleware-bmhcc | 99 |
| eon-lpnt-middleware | 87 |
| eon-ascension-middleware | 78 |
| eon-uch-middleware | 30 |
| eon-geisinger-middleware | 3 |
| eon-middleware-queue | 3 |

> **Migration action:** Create a `middleware_types` lookup table or use a Postgres enum.

---

## Section: Live Cohorts

Cohort columns are **boolean** (is this cohort live at this facility). Population varies by cohort — newer cohorts have lower coverage.

| # | Column | % Pop | Notes |
|---|---|---|---|
| 33 | LCS | ~100% | |
| 34 | LUNG | ~100% | |
| 35 | G LUNG | 78% | Newer cohort |
| 36 | AAA | 66% | |
| 37 | TAA | 68% | |
| 38 | Pancreas | 78% | |
| 39 | IELCAP | 60% | |
| 40 | Thyroid | 66% | |
| 41 | Liver | 75% | |
| 42 | Renal | 61% | |
| 43 | Calcium | 65% | |
| 44 | AF | 61% | |
| 45 | Breast | 61% | |

All map to `live_cohorts` table as boolean columns per cohort type, or alternatively a M2M `facility_cohorts` table (preferred for extensibility as new cohorts are added).

| # | Column | Type | % Pop | Target Entity | Notes |
|---|---|---|---|---|---|
| 46 | Implementation Package Link | text | 99% | `facilities` | `implementation_package_url` — hyperlink to external doc |
| 47 | Has SSO | boolean | 67% | `facilities` | `has_sso` |

---

## Section: Centralised Management (CM)

**Critical finding:** `Hybrid Golive` and `Full CM Golive` do **not** contain dates. They contain comma-separated cohort name lists (e.g., `"LCS, Lung"`, `"Panc, AAA, Thyroid"`). A value of `-` means CM is not applicable.

| # | Column | Type | % Pop | Distinct | Kind | Target Entity | Notes |
|---|---|---|---|---|---|---|---|
| 48 | Hybrid Golive | mixed | 93% | 18 | semi-structured | `cm_details` | Cohort name list or `False`/`-`; needs parsing |
| 49 | Full CM Golive | mixed | 91% | 12 | semi-structured | `cm_details` | Cohort name list or `False`/`-`; needs parsing |
| 50 | Letter Automation | boolean | 98% | 2 | boolean | `cm_details` | `letter_automation` — `BOOLEAN` |

> **Migration action:** Parse Hybrid/Full CM Golive strings into a `facility_cm_cohorts` M2M table with a `cm_type` column (`hybrid | full`). Normalize cohort names to match the cohort enum used in Live Cohorts.

---

## Section: Letters

| # | Column | Type | % Pop | Distinct | Kind | Target Entity | Target Field | Notes |
|---|---|---|---|---|---|---|---|---|
| 51 | Letters to EPIC | boolean | 97% | 2 | boolean | `letters_config` | `letters_to_epic` | `BOOLEAN` |
| 52 | Quadient Service | boolean | 97% | 2 | boolean | `letters_config` | `quadient_service` | `BOOLEAN` |
| 53 | Matching Algorithm | text | 38% | 16 | **enum** (dirty) | `letters_config` | `matching_algorithm` | Has data quality issues — see below |

**Matching Algorithm values (cleaned):**

| Value | Count | Action |
|---|---|---|
| mrn | 286 | keep |
| mrn, accession, facility id | 42 | keep |
| urn | 32 | keep |
| EPI (mrn) | 10 | normalise to `epi_mrn` |
| first name, last name, dob, sex, accession, facility id | 8 | keep |
| mrn, first name, last name, accession, facility id | 6 | keep |
| mrn, accession | 4 | keep |
| urn, accession, facility id | 3 | keep |
| True / False (text) | 15 | **bad data** — treat as NULL |
| first name, last name, dob, accession, facillity id | 1 | **typo** — merge into standard value |

> **Migration action:** Null-out `True`/`False` text values. Fix the typo. Normalise `EPI (mrn)`. Store as TEXT with a check constraint on known values, or create a lookup table.

---

## Section: EPM ML Reporting DB

| # | Column | Type | % Pop | Distinct | Kind | Target Entity | Target Field | Notes |
|---|---|---|---|---|---|---|---|---|
| 54 | DB Name | text | 96% | 65 | free-text | `reporting_db` | `db_name` | Derived from EHR Index Pattern: strip `hl7-` prefix, add `-db` suffix. Verify derivation is correct rather than storing duplicate. |

---

## Section: Server & Config Info

**Critical finding:** `Server` (6 distinct values) and `HL7 Server URL` (7 distinct values) are lookup values — they should be a FK to a `servers` table rather than stored as free text per facility.

| # | Column | Type | % Pop | Distinct | Kind | Target Entity | Target Field | Notes |
|---|---|---|---|---|---|---|---|---|
| 55 | Server | text | 12% | 6 | **enum/FK** | `servers` | `name` | FK — only 6 named servers |
| 56 | Server IP | text | ~100% | 129 | free-text | `servers` | `ip_address` | Per-facility IP; stays on facility |
| 57 | HL7 Server URL | text | 12% | 7 | **enum/FK** | `servers` | `hl7_url` | FK — only 7 distinct URLs |
| 58 | Port Number | mixed | 96% | 153 | free-text | `server_configs` | `port_number` | **Mixed types**: stored as int/float/string in Excel — normalise to `INTEGER` |
| 59 | Port Name | text | 96% | 151 | free-text | `server_configs` | `port_name` | |
| 60 | S3 Folder Name | text | 91% | 155 | free-text | `server_configs` | `s3_folder` | |
| 61 | Duplicate Folder Name | text | 0.4% | 4 | free-text | — | — | **Candidate for deprecation** — only 4 rows populated; confirm with stakeholders before migrating |
| 62 | SFTP Folder Link | text | 14% | 7 | free-text | `server_configs` | `sftp_folder_link` | |

**Server lookup values:**

| Server Name | Count |
|---|---|
| Ascension HL7 1 | 57 |
| Baptist HL7 | 25 |
| Aspirus HL7 | 23 |
| Ascension HL7 3 | 13 |
| Ascension HL7 2 | 8 |
| Advent Hl7 | 2 |

**HL7 Server URL lookup values:**

| URL | Count |
|---|---|
| ascension.three.hl7.internal.eonhealth.com | 40 |
| ascension.two.hl7.internal.eonhealth.com | 28 |
| baptist.main.hl7.internal.eonhealth.com | 25 |
| aspirus.main.hl7.internal.eonhealth.com | 23 |
| ascension.main.hl7.internal.eonhealth.com | 10 |
| advent.ocala.hl7.internal.eonhealth.com | 1 |
| advent.rao.hl7.internal.eonhealth.com | 1 |

> **Migration action:** Create a `servers` table (name, ip, hl7_url) and FK `server_configs.server_id` to it. Join on server name during migration.

> **Port Number migration action:** Cast to integer; flag/null out any values that fail the cast.

---

## Section: Intelligent Care Plan (ICP) Golive

All 13 columns are pure boolean. They mirror the Live Cohorts structure but represent ICP-specific go-live status, not general cohort status. Map identically.

| # | Column | % Pop | Target Entity | Target Field |
|---|---|---|---|---|
| 63 | LCS | 98% | `icp_golive` | `lcs` |
| 64 | LUNG | 98% | `icp_golive` | `lung` |
| 65 | G LUNG | 78% | `icp_golive` | `g_lung` |
| 66 | AAA | 61% | `icp_golive` | `aaa` |
| 67 | TAA | 64% | `icp_golive` | `taa` |
| 68 | Pancreas | 64% | `icp_golive` | `pancreas` |
| 69 | IELCAP | 59% | `icp_golive` | `ielcap` |
| 70 | Thyroid | 61% | `icp_golive` | `thyroid` |
| 71 | Liver | 62% | `icp_golive` | `liver` |
| 72 | Renal | 61% | `icp_golive` | `renal` |
| 73 | Calcium | 61% | `icp_golive` | `calcium` |
| 74 | AF | 61% | `icp_golive` | `af` |
| 75 | Breast | 61% | `icp_golive` | `breast` |

---

## Data Quality Issues Requiring Stakeholder Sign-off

| # | Column | Issue | Recommended Action |
|---|---|---|---|
| 1 | ADT (Receiving) | Tri-state: `True/False/"flat file"` | Convert to enum `active/inactive/flat_file` |
| 2 | ORU (Receiving) | Same tri-state issue | Same conversion |
| 3 | Hybrid Golive | Stores cohort name lists, not dates/booleans | Parse into `facility_cm_cohorts` M2M table |
| 4 | Full CM Golive | Same as above | Same parsing |
| 5 | Matching Algorithm | 15 rows with text `"True"` or `"False"` | Null out in migration |
| 6 | Matching Algorithm | Typo: `"facillity"` | Merge into correct value |
| 7 | Port Number | Mixed int/float/string | Normalise to INTEGER; flag failures |
| 8 | DB Name | Appears derived from EHR Index Pattern | Verify derivation rule; store or compute |
| 9 | Duplicate Folder Name | 4 rows only | Confirm deprecation with stakeholders |
| 10 | Server / HL7 URL | Repeated strings rather than FK | Normalise to `servers` lookup table |
| 11 | EHR Facility ID | 20% populated — many facilities missing | Confirm whether absence is expected or a gap |

---

## Revised Schema Additions (beyond PROJECT_PLAN.md)

The audit revealed structure not captured in the initial schema:

```sql
-- Lookup table for HL7 servers (replacing free-text columns 55 + 57)
CREATE TABLE servers (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT UNIQUE NOT NULL,
  ip        TEXT,
  hl7_url   TEXT
);

-- Replace: server_configs.server TEXT → server_configs.server_id UUID FK
ALTER TABLE server_configs ADD COLUMN server_id UUID REFERENCES servers(id);

-- Cohort types enum (shared across live_cohorts, icp_golive, cm_cohorts)
CREATE TYPE cohort_type AS ENUM (
  'lcs', 'lung', 'g_lung', 'aaa', 'taa', 'pancreas',
  'ielcap', 'thyroid', 'liver', 'renal', 'calcium', 'af', 'breast'
);

-- Preferred: M2M for live cohorts (extensible as new cohorts are added)
CREATE TABLE facility_cohorts (
  facility_id   UUID REFERENCES facilities(id),
  cohort        cohort_type NOT NULL,
  is_live       BOOLEAN DEFAULT false,
  PRIMARY KEY (facility_id, cohort)
);

-- M2M for ICP golive (same cohort set, separate table)
CREATE TABLE facility_icp_golive (
  facility_id   UUID REFERENCES facilities(id),
  cohort        cohort_type NOT NULL,
  is_live       BOOLEAN DEFAULT false,
  PRIMARY KEY (facility_id, cohort)
);

-- M2M for CM cohorts (hybrid vs full)
CREATE TABLE facility_cm_cohorts (
  facility_id   UUID REFERENCES facilities(id),
  cohort        cohort_type NOT NULL,
  cm_type       TEXT NOT NULL CHECK (cm_type IN ('hybrid', 'full')),
  PRIMARY KEY (facility_id, cohort, cm_type)
);

-- ADT/ORU tri-state: change from BOOLEAN to TEXT with constraint
-- In receiving_feeds table:
ALTER TABLE receiving_feeds
  ALTER COLUMN adt TYPE TEXT,
  ALTER COLUMN oru TYPE TEXT,
  ADD CONSTRAINT adt_enum CHECK (adt IN ('active', 'inactive', 'flat_file')),
  ADD CONSTRAINT oru_enum CHECK (oru IN ('active', 'inactive', 'flat_file'));
```

---

## Migration Script Complexity Estimate

| Section | Complexity | Reason |
|---|---|---|
| Identity / Site | Low | Clean data, straightforward mapping |
| EHR | Low | UUID strings, minor sparsity |
| Receiving Feed | Medium | ADT/ORU tri-state conversion |
| Parsing Feed | Low | All boolean |
| EPIC Integrations | Low | Enum normalisation for Parsing Middleware |
| Live Cohorts | Medium | Prefer M2M reshape from 13 boolean columns |
| CM Golive | High | Parse comma-separated cohort strings; handle `False`/`-` sentinel values |
| Letters | Medium | Matching Algorithm data cleanup required |
| Reporting DB | Low | Verify derived DB name rule |
| Server & Config | Medium | Extract `servers` lookup; normalise port types |
| ICP Golive | Medium | Same M2M reshape as Live Cohorts |

**Overall migration estimate:** 1.5–2 weeks for script + validation, assuming a developer familiar with the data.

---

## Recommended Next Step

1. Share this document with stakeholders for sign-off on the 11 data quality issues.
2. Confirm the `DB Name` derivation rule (computed vs. stored).
3. Confirm `Duplicate Folder Name` deprecation.
4. Update `PROJECT_PLAN.md` schema section with the M2M tables and `servers` lookup.
5. Begin migration script development once sign-offs are received.

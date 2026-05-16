#!/usr/bin/env python3
"""
Migrate SitesCampuses Excel sheet → Postgres schema SQL.

Usage:
    python scripts/migrate_excel.py                        # writes data/migration.sql
    python scripts/migrate_excel.py --output path/out.sql
    python scripts/migrate_excel.py --stdout               # print SQL to stdout
    python scripts/migrate_excel.py --dry-run              # validate only, no SQL output

Requires: openpyxl  (pip install openpyxl)
"""

import argparse
import sys
import uuid
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required: pip install openpyxl")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEL_PATH = REPO_ROOT / "data" / "integration-details.xlsx"
DEFAULT_OUT = REPO_ROOT / "data" / "migration.sql"

# ---------------------------------------------------------------------------
# Cohort name → enum value  (case-insensitive, stripped)
# ---------------------------------------------------------------------------

COHORT_MAP = {
    "lcs":       "lcs",
    "lung":      "lung",
    "g lung":    "g_lung",
    "g_lung":    "g_lung",
    "gllung":    "g_lung",
    "aaa":       "aaa",
    "taa":       "taa",
    "panc":      "pancreas",
    "pancreas":  "pancreas",
    "ielcap":    "ielcap",
    "thyroid":   "thyroid",
    "liver":     "liver",
    "renal":     "renal",
    "calcium":   "calcium",
    "af":        "af",
    "breast":    "breast",
}

VALID_MIDDLEWARE = {
    "eon-middleware",
    "eon-hca-middleware",
    "eon-middleware-bmhcc",
    "eon-lpnt-middleware",
    "eon-ascension-middleware",
    "eon-uch-middleware",
    "eon-geisinger-middleware",
    "eon-middleware-queue",
}

MATCHING_ALGO_TYPO = "first name, last name, dob, accession, facillity id"
MATCHING_ALGO_FIXED = "first name, last name, dob, accession, facility id"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def new_id() -> str:
    return str(uuid.uuid4())


def q(value) -> str:
    """SQL-escape a Python value → SQL literal."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    s = str(value).replace("'", "''")
    return f"'{s}'"


def bool_val(cell) -> bool:
    """Coerce Excel cell to bool."""
    if isinstance(cell, bool):
        return cell
    if isinstance(cell, (int, float)):
        return bool(cell)
    if isinstance(cell, str):
        return cell.strip().lower() == "true"
    return False


def feed_status(cell) -> str:
    """Convert ADT/ORU tri-state cell → feed_status enum value."""
    if cell is None:
        return "inactive"
    if isinstance(cell, bool):
        return "active" if cell else "inactive"
    s = str(cell).strip().lower()
    if s == "flat file":
        return "flat_file"
    if s == "true":
        return "active"
    return "inactive"


def parse_cohort_string(value) -> list[str]:
    """
    Parse a CM Golive cohort string like "LCS, Lung, Panc, AAA" into
    a list of valid cohort_type enum values.
    Returns [] for False / "-" / unrecognised values.
    """
    if value is None:
        return []
    if isinstance(value, bool):
        return []
    s = str(value).strip()
    if s in ("-", "False", "false", ""):
        return []
    cohorts = []
    for part in s.split(","):
        key = part.strip().lower()
        mapped = COHORT_MAP.get(key)
        if mapped and mapped not in cohorts:
            cohorts.append(mapped)
    return cohorts


def split_ports(port_num_cell, port_name_cell):
    """
    Split potentially comma-separated port number / name cells.
    Returns list of (port_number_str, port_name_str | None) tuples.
    e.g. cell="27851, 27852", name_cell="Prod_Rad_ORU, Prod_LAB_ORU"
         → [("27851", "Prod_Rad_ORU"), ("27852", "Prod_LAB_ORU")]
    """
    if port_num_cell is None:
        return []

    raw_num = str(port_num_cell).strip()
    raw_name = str(port_name_cell).strip() if port_name_cell is not None else ""

    nums  = [p.strip() for p in raw_num.split(",") if p.strip()]
    names = [p.strip() for p in raw_name.split(",") if p.strip()] if raw_name else []

    pairs = []
    for i, num in enumerate(nums):
        # Normalise float strings like "22137.0" → "22137"
        try:
            num = str(int(float(num)))
        except (ValueError, OverflowError):
            pass
        name = names[i] if i < len(names) else None
        pairs.append((num, name))
    return pairs


def clean_matching_algo(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None          # "True"/"False" stored as bool — bad data
    s = str(value).strip()
    if s in ("True", "False", ""):
        return None          # "True"/"False" stored as text — bad data
    if s == MATCHING_ALGO_TYPO:
        s = MATCHING_ALGO_FIXED
    return s


def is_data_row(row) -> bool:
    """A data row has a non-empty Facility Name (col 0)."""
    return row[0] is not None and str(row[0]).strip() not in ("", "None")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run(excel_path: Path, output, dry_run: bool, warnings: list):

    wb = openpyxl.load_workbook(str(excel_path), read_only=True, data_only=True)
    ws = wb["SitesCampuses"]
    all_rows = list(ws.iter_rows(values_only=True))
    data_rows = [r for r in all_rows[2:] if is_data_row(r)]

    # -----------------------------------------------------------------------
    # Pass 1 — collect distinct sites and servers for lookup tables
    # -----------------------------------------------------------------------

    # sites: slug → name (last seen wins for name)
    sites_map: dict[str, str] = {}
    for r in data_rows:
        slug = str(r[3]).strip() if r[3] else None
        name = str(r[4]).strip() if r[4] else None
        if slug:
            sites_map[slug] = name or slug

    # servers: name → {ip, hl7_url} — collect from col 55/56/57
    servers_raw: dict[str, dict] = {}
    for r in data_rows:
        sname = str(r[55]).strip() if r[55] else None
        if sname:
            entry = servers_raw.setdefault(sname, {"ip": None, "hl7_url": None})
            if r[57] and not entry["hl7_url"]:
                entry["hl7_url"] = str(r[57]).strip()

    # -----------------------------------------------------------------------
    # Pass 2 — assign UUIDs and validate
    #
    # Uniqueness is (site_slug, campus_id) — the same campus_id is valid
    # across different sites. Facilities with no campus_id get a synthetic
    # slug derived from their facility name.
    # -----------------------------------------------------------------------

    site_ids:   dict[str, str] = {slug: new_id() for slug in sites_map}
    server_ids: dict[str, str] = {name: new_id() for name in servers_raw}

    # key: (site_slug, campus_id) → facility UUID  (rows with a real campus_id, first occurrence only)
    facility_ids: dict[tuple[str, str], str] = {}
    # rows migrated with campus_id = NULL: no campus_id in Excel, or a same-site duplicate
    null_campus_rows: list[tuple] = []

    for r in data_rows:
        site_slug = str(r[3]).strip() if r[3] else "__no_site__"
        campus_id = str(r[1]).strip() if r[1] else None

        if not campus_id:
            warnings.append(
                f"NULL campus_id: facility '{r[0]}' (site '{site_slug}') "
                f"has no campus_id in Excel"
            )
            null_campus_rows.append(r)
            continue

        key = (site_slug, campus_id)
        if key in facility_ids:
            warnings.append(
                f"DUPLICATE (site='{site_slug}', campus_id='{campus_id}') "
                f"facility '{r[0]}' — included with campus_id = NULL"
            )
            null_campus_rows.append(r)
            continue
        facility_ids[key] = new_id()

        # Validate middleware
        mw = r[32]
        if mw and str(mw).strip() not in VALID_MIDDLEWARE:
            warnings.append(f"UNKNOWN middleware '{mw}' for campus '{campus_id}' (site '{site_slug}')")

        # Warn on bad matching algorithm
        if r[53] is not None:
            cleaned = clean_matching_algo(r[53])
            if cleaned is None and r[53] not in (None, True, False):
                warnings.append(
                    f"Matching algorithm '{r[53]}' for campus '{campus_id}' → set to NULL"
                )

    # -----------------------------------------------------------------------
    # SQL generation
    # -----------------------------------------------------------------------

    def emit(line=""):
        if not dry_run:
            print(line, file=output)

    emit("-- ================================================================")
    emit("-- Migration: SitesCampuses Excel → Postgres")
    emit(f"-- Source:    {excel_path.name}")
    emit(f"-- Facilities: {len(facility_ids)} with campus_id  |  {len(null_campus_rows)} with campus_id=NULL  |  Sites: {len(sites_map)}")
    emit("-- Uniqueness: campus_id is scoped per site, not globally unique")
    emit("-- ================================================================")
    emit()
    emit("BEGIN;")
    emit()

    # -----------------------------------------------------------------------
    # sites
    # -----------------------------------------------------------------------
    emit("-- ----------------------------------------------------------------")
    emit("-- sites")
    emit("-- ----------------------------------------------------------------")
    for slug, name in sorted(sites_map.items()):
        sid = site_ids[slug]
        emit(
            f"INSERT INTO sites (id, slug, name) VALUES "
            f"({q(sid)}, {q(slug)}, {q(name)}) "
            f"ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;"
        )
    emit()

    # -----------------------------------------------------------------------
    # servers
    # -----------------------------------------------------------------------
    emit("-- ----------------------------------------------------------------")
    emit("-- servers")
    emit("-- ----------------------------------------------------------------")
    for sname, info in sorted(servers_raw.items()):
        sid = server_ids[sname]
        emit(
            f"INSERT INTO servers (id, name, hl7_url) VALUES "
            f"({q(sid)}, {q(sname)}, {q(info['hl7_url'])}) "
            f"ON CONFLICT (name) DO UPDATE SET hl7_url = EXCLUDED.hl7_url;"
        )
    emit()

    # -----------------------------------------------------------------------
    # Per-facility rows
    # -----------------------------------------------------------------------

    seen_keys: set[tuple[str, str]] = set()

    for r in data_rows:
        site_slug = str(r[3]).strip() if r[3] else "__no_site__"
        campus_id = str(r[1]).strip() if r[1] else None

        if not campus_id:
            continue   # handled in null_campus_rows block below

        key = (site_slug, campus_id)
        if key in seen_keys:
            continue
        seen_keys.add(key)

        fac_id  = facility_ids[key]
        site_id = site_ids.get(site_slug)

        is_active = not bool_val(r[2])   # Deactivated=True → is_active=False

        # ---- facilities ----
        emit("-- ----------------------------------------------------------------")
        emit(f"-- facility: {r[0]}  ({campus_id})  site: {site_slug}")
        emit("-- ----------------------------------------------------------------")
        emit(
            f"INSERT INTO facilities "
            f"(id, site_id, campus_id, name, is_active, ehr_index_pattern, has_sso, implementation_package_url) VALUES ("
            f"{q(fac_id)}, {q(site_id)}, {q(campus_id)}, {q(str(r[0]).strip())}, "
            f"{q(is_active)}, {q(r[8])}, {q(bool_val(r[47]) if r[47] is not None else None)}, {q(r[46])}"
            f") ON CONFLICT (site_id, campus_id) DO UPDATE SET "
            f"name = EXCLUDED.name, is_active = EXCLUDED.is_active, "
            f"ehr_index_pattern = EXCLUDED.ehr_index_pattern, "
            f"has_sso = EXCLUDED.has_sso, "
            f"implementation_package_url = EXCLUDED.implementation_package_url;"
        )

        # ---- ehr_details ----
        if any(r[i] for i in (5, 6, 7)):
            emit(
                f"INSERT INTO ehr_details (id, facility_id, ehr_facility_id, ehr_site_id, ehr_interface_id) VALUES ("
                f"{q(new_id())}, {q(fac_id)}, {q(r[5])}, {q(r[6])}, {q(r[7])}"
                f") ON CONFLICT (facility_id) DO UPDATE SET "
                f"ehr_facility_id = EXCLUDED.ehr_facility_id, "
                f"ehr_site_id = EXCLUDED.ehr_site_id, "
                f"ehr_interface_id = EXCLUDED.ehr_interface_id;"
            )

        # ---- receiving_feeds ----
        emit(
            f"INSERT INTO receiving_feeds "
            f"(id, facility_id, adt, oru, orm, siu, mdm, bar, mfn, clarity) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, "
            f"'{feed_status(r[9])}', '{feed_status(r[10])}', "
            f"{q(bool_val(r[11]))}, {q(bool_val(r[12]))}, {q(bool_val(r[13]))}, "
            f"{q(bool_val(r[14]))}, {q(bool_val(r[15]))}, {q(bool_val(r[16]))}"
            f") ON CONFLICT (facility_id) DO UPDATE SET "
            f"adt = EXCLUDED.adt, oru = EXCLUDED.oru, orm = EXCLUDED.orm, "
            f"siu = EXCLUDED.siu, mdm = EXCLUDED.mdm, bar = EXCLUDED.bar, "
            f"mfn = EXCLUDED.mfn, clarity = EXCLUDED.clarity;"
        )

        # ---- parsing_feeds ----
        emit(
            f"INSERT INTO parsing_feeds "
            f"(id, facility_id, parsing_files, adt, oru, orm, siu, flat_file_scheduling, "
            f"mdm, bar, mfn, clarity, physician_clarity, exam_clarity, eon_connect) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, "
            f"{q(bool_val(r[17]))}, {q(bool_val(r[18]))}, {q(bool_val(r[19]))}, "
            f"{q(bool_val(r[20]))}, {q(bool_val(r[21]))}, {q(bool_val(r[22]))}, "
            f"{q(bool_val(r[23]))}, {q(bool_val(r[24]))}, {q(bool_val(r[25]))}, "
            f"{q(bool_val(r[26]))}, {q(bool_val(r[27]))}, {q(bool_val(r[28]))}, "
            f"{q(bool_val(r[29]))}"
            f") ON CONFLICT (facility_id) DO UPDATE SET "
            f"parsing_files = EXCLUDED.parsing_files, adt = EXCLUDED.adt, oru = EXCLUDED.oru, "
            f"orm = EXCLUDED.orm, siu = EXCLUDED.siu, flat_file_scheduling = EXCLUDED.flat_file_scheduling, "
            f"mdm = EXCLUDED.mdm, bar = EXCLUDED.bar, mfn = EXCLUDED.mfn, "
            f"clarity = EXCLUDED.clarity, physician_clarity = EXCLUDED.physician_clarity, "
            f"exam_clarity = EXCLUDED.exam_clarity, eon_connect = EXCLUDED.eon_connect;"
        )

        # ---- epic_integrations ----
        mw_raw = str(r[32]).strip() if r[32] else None
        mw_val = mw_raw if mw_raw in VALID_MIDDLEWARE else None
        emit(
            f"INSERT INTO epic_integrations (id, facility_id, fhir, outgoing_mdm, parsing_middleware) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, "
            f"{q(bool_val(r[30]))}, {q(bool_val(r[31]))}, {q(mw_val)}"
            f") ON CONFLICT (facility_id) DO UPDATE SET "
            f"fhir = EXCLUDED.fhir, outgoing_mdm = EXCLUDED.outgoing_mdm, "
            f"parsing_middleware = EXCLUDED.parsing_middleware;"
        )

        # ---- facility_cohorts (live) — cols 33-45 ----
        LIVE_COHORT_COLS = [
            (33, "lcs"), (34, "lung"), (35, "g_lung"), (36, "aaa"), (37, "taa"),
            (38, "pancreas"), (39, "ielcap"), (40, "thyroid"), (41, "liver"),
            (42, "renal"), (43, "calcium"), (44, "af"), (45, "breast"),
        ]
        for col_idx, cohort in LIVE_COHORT_COLS:
            live = bool_val(r[col_idx]) if r[col_idx] is not None else False
            emit(
                f"INSERT INTO facility_cohorts (facility_id, cohort, is_live) VALUES ("
                f"{q(fac_id)}, '{cohort}', {q(live)}"
                f") ON CONFLICT (facility_id, cohort) DO UPDATE SET is_live = EXCLUDED.is_live;"
            )

        # ---- cm_details ----
        emit(
            f"INSERT INTO cm_details (id, facility_id, letter_automation) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, {q(bool_val(r[50]))}"
            f") ON CONFLICT (facility_id) DO UPDATE SET letter_automation = EXCLUDED.letter_automation;"
        )

        # ---- facility_cm_cohorts — hybrid (col 48) + full (col 49) ----
        for cm_type, cell in (("hybrid", r[48]), ("full", r[49])):
            for cohort in parse_cohort_string(cell):
                emit(
                    f"INSERT INTO facility_cm_cohorts (facility_id, cohort, cm_type) VALUES ("
                    f"{q(fac_id)}, '{cohort}', '{cm_type}'"
                    f") ON CONFLICT (facility_id, cohort, cm_type) DO NOTHING;"
                )

        # ---- letters_config ----
        emit(
            f"INSERT INTO letters_config (id, facility_id, letters_to_epic, quadient_service, matching_algorithm) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, "
            f"{q(bool_val(r[51]))}, {q(bool_val(r[52]))}, {q(clean_matching_algo(r[53]))}"
            f") ON CONFLICT (facility_id) DO UPDATE SET "
            f"letters_to_epic = EXCLUDED.letters_to_epic, "
            f"quadient_service = EXCLUDED.quadient_service, "
            f"matching_algorithm = EXCLUDED.matching_algorithm;"
        )

        # ---- reporting_db ----
        if r[54]:
            emit(
                f"INSERT INTO reporting_db (id, facility_id, db_name) VALUES ("
                f"{q(new_id())}, {q(fac_id)}, {q(r[54])}"
                f") ON CONFLICT (facility_id) DO UPDATE SET db_name = EXCLUDED.db_name;"
            )

        # ---- server_configs ----
        server_name = str(r[55]).strip() if r[55] else None
        server_fk   = server_ids.get(server_name) if server_name else None
        if any([server_fk, r[56], r[60], r[62]]):
            emit(
                f"INSERT INTO server_configs (id, facility_id, server_id, server_ip, s3_folder, sftp_folder_link) VALUES ("
                f"{q(new_id())}, {q(fac_id)}, {q(server_fk)}, {q(r[56])}, {q(r[60])}, {q(r[62])}"
                f") ON CONFLICT (facility_id) DO UPDATE SET "
                f"server_id = EXCLUDED.server_id, server_ip = EXCLUDED.server_ip, "
                f"s3_folder = EXCLUDED.s3_folder, sftp_folder_link = EXCLUDED.sftp_folder_link;"
            )

        # ---- facility_ports — may be multiple per facility ----
        port_pairs = split_ports(r[58], r[59])
        for pnum, pname in port_pairs:
            emit(
                f"INSERT INTO facility_ports (id, facility_id, port_number, port_name) VALUES ("
                f"{q(new_id())}, {q(fac_id)}, {q(pnum)}, {q(pname)}"
                f");"
            )

        # ---- facility_icp_golive — cols 63-75 ----
        ICP_COLS = [
            (63, "lcs"), (64, "lung"), (65, "g_lung"), (66, "aaa"), (67, "taa"),
            (68, "pancreas"), (69, "ielcap"), (70, "thyroid"), (71, "liver"),
            (72, "renal"), (73, "calcium"), (74, "af"), (75, "breast"),
        ]
        for col_idx, cohort in ICP_COLS:
            live = bool_val(r[col_idx]) if r[col_idx] is not None else False
            emit(
                f"INSERT INTO facility_icp_golive (facility_id, cohort, is_live) VALUES ("
                f"{q(fac_id)}, '{cohort}', {q(live)}"
                f") ON CONFLICT (facility_id, cohort) DO UPDATE SET is_live = EXCLUDED.is_live;"
            )

        emit()

    # -----------------------------------------------------------------------
    # Null campus_id rows — no campus_id in Excel, or same-site duplicate.
    # Both cases are inserted with campus_id = NULL (no ON CONFLICT).
    # -----------------------------------------------------------------------

    if null_campus_rows:
        emit("-- ----------------------------------------------------------------")
        emit("-- Facilities with campus_id = NULL")
        emit("-- Includes: missing campus_id in Excel + same-site duplicates.")
        emit("-- Review and assign proper campus_ids before go-live.")
        emit("-- ----------------------------------------------------------------")

    for r in null_campus_rows:
        site_slug = str(r[3]).strip() if r[3] else "__no_site__"
        site_id   = site_ids.get(site_slug)
        fac_id    = new_id()
        is_active = not bool_val(r[2])

        orig = str(r[1]).strip() if r[1] else "none in Excel"
        emit(f"-- facility: {r[0]}  (campus_id in Excel: {orig})  site: {site_slug}")
        emit(
            f"INSERT INTO facilities "
            f"(id, site_id, campus_id, name, is_active, ehr_index_pattern, has_sso, implementation_package_url) VALUES ("
            f"{q(fac_id)}, {q(site_id)}, NULL, {q(str(r[0]).strip())}, "
            f"{q(is_active)}, {q(r[8])}, {q(bool_val(r[47]) if r[47] is not None else None)}, {q(r[46])}"
            f");"
        )

        if any(r[i] for i in (5, 6, 7)):
            emit(
                f"INSERT INTO ehr_details (id, facility_id, ehr_facility_id, ehr_site_id, ehr_interface_id) VALUES ("
                f"{q(new_id())}, {q(fac_id)}, {q(r[5])}, {q(r[6])}, {q(r[7])});"
            )

        emit(
            f"INSERT INTO receiving_feeds "
            f"(id, facility_id, adt, oru, orm, siu, mdm, bar, mfn, clarity) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, "
            f"'{feed_status(r[9])}', '{feed_status(r[10])}', "
            f"{q(bool_val(r[11]))}, {q(bool_val(r[12]))}, {q(bool_val(r[13]))}, "
            f"{q(bool_val(r[14]))}, {q(bool_val(r[15]))}, {q(bool_val(r[16]))});"
        )

        emit(
            f"INSERT INTO parsing_feeds "
            f"(id, facility_id, parsing_files, adt, oru, orm, siu, flat_file_scheduling, "
            f"mdm, bar, mfn, clarity, physician_clarity, exam_clarity, eon_connect) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, "
            f"{q(bool_val(r[17]))}, {q(bool_val(r[18]))}, {q(bool_val(r[19]))}, "
            f"{q(bool_val(r[20]))}, {q(bool_val(r[21]))}, {q(bool_val(r[22]))}, "
            f"{q(bool_val(r[23]))}, {q(bool_val(r[24]))}, {q(bool_val(r[25]))}, "
            f"{q(bool_val(r[26]))}, {q(bool_val(r[27]))}, {q(bool_val(r[28]))}, "
            f"{q(bool_val(r[29]))});"
        )

        mw_raw = str(r[32]).strip() if r[32] else None
        mw_val  = mw_raw if mw_raw in VALID_MIDDLEWARE else None
        emit(
            f"INSERT INTO epic_integrations (id, facility_id, fhir, outgoing_mdm, parsing_middleware) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, {q(bool_val(r[30]))}, {q(bool_val(r[31]))}, {q(mw_val)});"
        )

        LIVE_COHORT_COLS = [
            (33, "lcs"), (34, "lung"), (35, "g_lung"), (36, "aaa"), (37, "taa"),
            (38, "pancreas"), (39, "ielcap"), (40, "thyroid"), (41, "liver"),
            (42, "renal"), (43, "calcium"), (44, "af"), (45, "breast"),
        ]
        for col_idx, cohort in LIVE_COHORT_COLS:
            live = bool_val(r[col_idx]) if r[col_idx] is not None else False
            emit(
                f"INSERT INTO facility_cohorts (facility_id, cohort, is_live) VALUES "
                f"({q(fac_id)}, '{cohort}', {q(live)});"
            )

        emit(
            f"INSERT INTO cm_details (id, facility_id, letter_automation) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, {q(bool_val(r[50]))});"
        )

        for cm_type, cell in (("hybrid", r[48]), ("full", r[49])):
            for cohort in parse_cohort_string(cell):
                emit(
                    f"INSERT INTO facility_cm_cohorts (facility_id, cohort, cm_type) VALUES "
                    f"({q(fac_id)}, '{cohort}', '{cm_type}');"
                )

        emit(
            f"INSERT INTO letters_config (id, facility_id, letters_to_epic, quadient_service, matching_algorithm) VALUES ("
            f"{q(new_id())}, {q(fac_id)}, "
            f"{q(bool_val(r[51]))}, {q(bool_val(r[52]))}, {q(clean_matching_algo(r[53]))});"
        )

        if r[54]:
            emit(
                f"INSERT INTO reporting_db (id, facility_id, db_name) VALUES "
                f"({q(new_id())}, {q(fac_id)}, {q(r[54])});"
            )

        server_name = str(r[55]).strip() if r[55] else None
        server_fk   = server_ids.get(server_name) if server_name else None
        if any([server_fk, r[56], r[60], r[62]]):
            emit(
                f"INSERT INTO server_configs (id, facility_id, server_id, server_ip, s3_folder, sftp_folder_link) VALUES ("
                f"{q(new_id())}, {q(fac_id)}, {q(server_fk)}, {q(r[56])}, {q(r[60])}, {q(r[62])});"
            )

        for pnum, pname in split_ports(r[58], r[59]):
            emit(
                f"INSERT INTO facility_ports (id, facility_id, port_number, port_name) VALUES "
                f"({q(new_id())}, {q(fac_id)}, {q(pnum)}, {q(pname)});"
            )

        ICP_COLS = [
            (63, "lcs"), (64, "lung"), (65, "g_lung"), (66, "aaa"), (67, "taa"),
            (68, "pancreas"), (69, "ielcap"), (70, "thyroid"), (71, "liver"),
            (72, "renal"), (73, "calcium"), (74, "af"), (75, "breast"),
        ]
        for col_idx, cohort in ICP_COLS:
            live = bool_val(r[col_idx]) if r[col_idx] is not None else False
            emit(
                f"INSERT INTO facility_icp_golive (facility_id, cohort, is_live) VALUES "
                f"({q(fac_id)}, '{cohort}', {q(live)});"
            )

        emit()

    emit("COMMIT;")
    emit()
    emit("-- ================================================================")
    emit(f"-- Done. {len(facility_ids) + len(null_campus_rows)} facilities migrated across {len(sites_map)} sites.")
    emit(f"--       {len(facility_ids)} with campus_id, {len(null_campus_rows)} with campus_id = NULL.")
    emit("-- ================================================================")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--excel",   default=str(EXCEL_PATH), help="Path to the Excel file")
    parser.add_argument("--output",  default=str(DEFAULT_OUT), help="Output SQL file path")
    parser.add_argument("--stdout",  action="store_true",      help="Write SQL to stdout instead of file")
    parser.add_argument("--dry-run", action="store_true",      help="Validate only; do not write SQL")
    args = parser.parse_args()

    excel_path = Path(args.excel)
    if not excel_path.exists():
        sys.exit(f"Excel file not found: {excel_path}")

    warnings: list[str] = []

    if args.dry_run:
        print("Dry run — validating data only...", file=sys.stderr)
        run(excel_path, output=None, dry_run=True, warnings=warnings)
    elif args.stdout:
        run(excel_path, output=sys.stdout, dry_run=False, warnings=warnings)
    else:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("w", encoding="utf-8") as f:
            run(excel_path, output=f, dry_run=False, warnings=warnings)
        print(f"SQL written to: {out_path}", file=sys.stderr)

    if warnings:
        print(f"\n{len(warnings)} warning(s):", file=sys.stderr)
        for w in warnings:
            print(f"  WARN: {w}", file=sys.stderr)
    else:
        print("No data quality warnings.", file=sys.stderr)


if __name__ == "__main__":
    main()

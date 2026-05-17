import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { COHORT_LIST, type CohortType } from '@/lib/cohorts'

// Column indices matching the SitesCampuses sheet layout
const C = {
  FAC_NAME:       0,
  CAMPUS_ID:      1,
  DEACTIVATED:    2,
  SITE_SLUG:      3,
  SITE_NAME:      4,
  EHR_FAC_ID:     5,
  EHR_SITE_ID:    6,
  EHR_IFACE_ID:   7,
  EHR_INDEX:      8,
  ADT:            9,
  ORU:            10,
  ORM:            11,
  SIU:            12,
  MDM:            13,
  BAR:            14,
  MFN:            15,
  CLARITY_RX:     16,
  PARSE_FILES:    17,
  PARSE_ADT:      18,
  PARSE_ORU:      19,
  PARSE_ORM:      20,
  PARSE_SIU:      21,
  PARSE_FF_SCHED: 22,
  PARSE_MDM:      23,
  PARSE_BAR:      24,
  PARSE_MFN:      25,
  PARSE_CLARITY:  26,
  PARSE_PHYS:     27,
  PARSE_EXAM:     28,
  PARSE_EON:      29,
  FHIR:           30,
  OUT_MDM:        31,
  MIDDLEWARE:     32,
  // cols 33-45: cohorts in COHORT_LIST order
  IMPL_PKG_URL:   46,
  HAS_SSO:        47,
  CM_HYBRID:      48,
  CM_FULL:        49,
  LETTER_AUTO:    50,
  LETTERS_EPIC:   51,
  QUADIENT:       52,
  MATCHING_ALGO:  53,
  DB_NAME:        54,
  SERVER_NAME:    55,
  SERVER_IP:      56,
  PORT_NUM:       58,
  PORT_NAME:      59,
  S3_FOLDER:      60,
  SFTP_LINK:      62,
} as const

const LIVE_COHORT_COLS  = [33,34,35,36,37,38,39,40,41,42,43,44,45] as const
const ICP_COHORT_COLS   = [63,64,65,66,67,68,69,70,71,72,73,74,75] as const

const VALID_MIDDLEWARE = new Set([
  'eon-middleware','eon-hca-middleware','eon-middleware-bmhcc',
  'eon-lpnt-middleware','eon-ascension-middleware','eon-uch-middleware',
  'eon-geisinger-middleware','eon-middleware-queue',
])

const COHORT_MAP: Record<string, CohortType> = {
  'lcs':'lcs','lung':'lung','g lung':'g_lung','g_lung':'g_lung','aaa':'aaa','taa':'taa',
  'panc':'pancreas','pancreas':'pancreas','ielcap':'ielcap','thyroid':'thyroid',
  'liver':'liver','renal':'renal','calcium':'calcium','af':'af','breast':'breast',
}

const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

type Row = unknown[]

function str(v: unknown): string { return v == null ? '' : String(v).trim() }
function boolV(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  return str(v).toLowerCase() === 'true'
}
function feedStatus(v: unknown): 'active' | 'inactive' | 'flat_file' {
  if (typeof v === 'boolean') return v ? 'active' : 'inactive'
  const s = str(v).toLowerCase()
  if (s === 'flat file' || s === 'flat_file') return 'flat_file'
  return s === 'true' || s === 'active' ? 'active' : 'inactive'
}
function parseCohorts(v: unknown): CohortType[] {
  if (!v || typeof v === 'boolean') return []
  return String(v).split(',').map(p => COHORT_MAP[p.trim().toLowerCase()]).filter(Boolean) as CohortType[]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { data: isAuditor } = await supabase.rpc('is_auditor')
  if (!isAuditor) return NextResponse.json({ error: 'Admin or auditor role required' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  // C-2: file size and magic bytes validation
  if (file.size > MAX_FILE_BYTES)
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 413 })

  const buffer = Buffer.from(await file.arrayBuffer())
  // XLSX is a ZIP container — must start with PK magic bytes
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4B)
    return NextResponse.json({ error: 'File is not a valid .xlsx workbook' }, { status: 400 })

  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return NextResponse.json({ error: 'Could not parse workbook' }, { status: 400 })
  }

  const ws = wb.Sheets['SitesCampuses']
  if (!ws) return NextResponse.json({ error: 'Sheet "SitesCampuses" not found' }, { status: 400 })

  const allRows: Row[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const dataRows = allRows.slice(2).filter(r => str(r[C.FAC_NAME]) !== '')

  const admin = createAdminClient()
  const summary = { sites: 0, facilities: 0, warnings: [] as string[] }

  // ── Upsert sites ──────────────────────────────────────────────────────────

  const sitesMap = new Map<string, string>()
  for (const r of dataRows) {
    const slug = str(r[C.SITE_SLUG])
    const name = str(r[C.SITE_NAME]) || slug
    if (slug) sitesMap.set(slug, name)
  }

  if (sitesMap.size > 0) {
    const { error } = await admin.from('sites').upsert(
      Array.from(sitesMap.entries()).map(([slug, name]) => ({ slug, name })),
      { onConflict: 'slug' }
    )
    if (error) {
      console.error('Sites upsert failed', error)
      return NextResponse.json({ error: 'Failed to upsert sites — see server logs' }, { status: 500 })
    }
    summary.sites = sitesMap.size
  }

  const { data: siteRows } = await admin.from('sites').select('id, slug').in('slug', Array.from(sitesMap.keys()))
  const siteIdBySlug = new Map((siteRows ?? []).map(s => [s.slug, s.id]))

  // ── Upsert facilities (parallel child inserts per row) ────────────────────

  for (const r of dataRows) {
    const siteSlug = str(r[C.SITE_SLUG])
    const campusId = str(r[C.CAMPUS_ID]) || null
    const siteId   = siteIdBySlug.get(siteSlug)
    if (!siteId) { summary.warnings.push(`Unknown site slug: ${siteSlug}`); continue }

    const middleware = str(r[C.MIDDLEWARE]) || null
    const mwVal = middleware && VALID_MIDDLEWARE.has(middleware) ? middleware : null

    let facId: string
    if (campusId) {
      const { data: facData, error } = await admin
        .from('facilities')
        .upsert({
          site_id: siteId, campus_id: campusId,
          name: str(r[C.FAC_NAME]), is_active: !boolV(r[C.DEACTIVATED]),
          ehr_index_pattern: str(r[C.EHR_INDEX]) || null,
          has_sso: boolV(r[C.HAS_SSO]),
          implementation_package_url: str(r[C.IMPL_PKG_URL]) || null,
        }, { onConflict: 'site_id,campus_id' })
        .select('id').single()
      if (error || !facData) {
        console.error(`Facility upsert failed (${siteSlug}/${campusId})`, error)
        summary.warnings.push(`Facility upsert failed for ${siteSlug}/${campusId}`)
        continue
      }
      facId = facData.id
    } else {
      const { data: facData, error } = await admin
        .from('facilities')
        .insert({
          site_id: siteId, campus_id: null,
          name: str(r[C.FAC_NAME]), is_active: !boolV(r[C.DEACTIVATED]),
          ehr_index_pattern: str(r[C.EHR_INDEX]) || null,
          has_sso: boolV(r[C.HAS_SSO]),
          implementation_package_url: str(r[C.IMPL_PKG_URL]) || null,
        })
        .select('id').single()
      if (error || !facData) {
        console.error(`Facility insert (null campus) failed (${siteSlug})`, error)
        summary.warnings.push(`Facility insert (null campus) failed for site ${siteSlug}`)
        continue
      }
      facId = facData.id
    }

    summary.facilities++

    const cohortRows     = COHORT_LIST.map((cohort, i) => ({ facility_id: facId, cohort, is_live: boolV(r[LIVE_COHORT_COLS[i]]) }))
    const icpRows        = COHORT_LIST.map((cohort, i) => ({ facility_id: facId, cohort, is_live: boolV(r[ICP_COHORT_COLS[i]]) }))
    const hybridCohorts  = parseCohorts(r[C.CM_HYBRID])
    const fullCohorts    = parseCohorts(r[C.CM_FULL])
    const cmRows         = [
      ...hybridCohorts.map(c => ({ facility_id: facId, cohort: c, cm_type: 'hybrid' as const })),
      ...fullCohorts.map(c => ({ facility_id: facId, cohort: c, cm_type: 'full' as const })),
    ]
    const matchAlgo = str(r[C.MATCHING_ALGO]) || null
    const cleanAlgo = matchAlgo === 'True' || matchAlgo === 'False' ? null : matchAlgo
    const dbName    = str(r[C.DB_NAME]) || null

    // Fire all per-table upserts in parallel
    await Promise.all([
      admin.from('ehr_details').upsert({
        facility_id: facId,
        ehr_facility_id:  str(r[C.EHR_FAC_ID])  || null,
        ehr_site_id:      str(r[C.EHR_SITE_ID])  || null,
        ehr_interface_id: str(r[C.EHR_IFACE_ID]) || null,
      }, { onConflict: 'facility_id' }),
      admin.from('receiving_feeds').upsert({
        facility_id: facId,
        adt: feedStatus(r[C.ADT]), oru: feedStatus(r[C.ORU]),
        orm: boolV(r[C.ORM]), siu: boolV(r[C.SIU]), mdm: boolV(r[C.MDM]),
        bar: boolV(r[C.BAR]), mfn: boolV(r[C.MFN]), clarity: boolV(r[C.CLARITY_RX]),
      }, { onConflict: 'facility_id' }),
      admin.from('parsing_feeds').upsert({
        facility_id: facId,
        parsing_files: boolV(r[C.PARSE_FILES]), adt: boolV(r[C.PARSE_ADT]),
        oru: boolV(r[C.PARSE_ORU]), orm: boolV(r[C.PARSE_ORM]),
        siu: boolV(r[C.PARSE_SIU]), flat_file_scheduling: boolV(r[C.PARSE_FF_SCHED]),
        mdm: boolV(r[C.PARSE_MDM]), bar: boolV(r[C.PARSE_BAR]),
        mfn: boolV(r[C.PARSE_MFN]), clarity: boolV(r[C.PARSE_CLARITY]),
        physician_clarity: boolV(r[C.PARSE_PHYS]), exam_clarity: boolV(r[C.PARSE_EXAM]),
        eon_connect: boolV(r[C.PARSE_EON]),
      }, { onConflict: 'facility_id' }),
      admin.from('epic_integrations').upsert({
        facility_id: facId,
        fhir: boolV(r[C.FHIR]), outgoing_mdm: boolV(r[C.OUT_MDM]),
        parsing_middleware: mwVal,
      }, { onConflict: 'facility_id' }),
      admin.from('facility_cohorts').upsert(cohortRows, { onConflict: 'facility_id,cohort' }),
      admin.from('facility_icp_golive').upsert(icpRows, { onConflict: 'facility_id,cohort' }),
      cmRows.length > 0
        ? admin.from('facility_cm_cohorts').upsert(cmRows, { onConflict: 'facility_id,cohort,cm_type' })
        : Promise.resolve(),
      admin.from('letters_config').upsert({
        facility_id: facId,
        letters_to_epic: boolV(r[C.LETTERS_EPIC]),
        quadient_service: boolV(r[C.QUADIENT]),
        matching_algorithm: cleanAlgo,
      }, { onConflict: 'facility_id' }),
      dbName
        ? admin.from('reporting_db').upsert({ facility_id: facId, db_name: dbName }, { onConflict: 'facility_id' })
        : Promise.resolve(),
      admin.from('server_configs').upsert({
        facility_id: facId,
        server_ip: str(r[C.SERVER_IP]) || null,
        s3_folder: str(r[C.S3_FOLDER]) || null,
        sftp_folder_link: str(r[C.SFTP_LINK]) || null,
      }, { onConflict: 'facility_id' }),
    ])

    // Ports: delete + reinsert (sequential, small, safe with admin client)
    const portNum = str(r[C.PORT_NUM])
    if (portNum) {
      const nums  = portNum.split(',').map(p => p.trim()).filter(Boolean)
      const names = str(r[C.PORT_NAME]).split(',').map(p => p.trim())
      await admin.from('facility_ports').delete().eq('facility_id', facId)
      const portRows = nums.map((num, i) => ({
        facility_id: facId,
        port_number: num.replace(/\.0$/, ''),
        port_name: names[i] || null,
      }))
      await admin.from('facility_ports').insert(portRows)
    }
  }

  // H-1: Write a single bulk-import audit record
  const { error: auditErr } = await admin.from('audit_logs').insert({
    user_id:    user.id,
    table_name: 'import',
    record_id:  '00000000-0000-0000-0000-000000000000',
    action:     'UPDATE',
    old_data:   null,
    new_data:   { sites: summary.sites, facilities: summary.facilities, filename: file.name } as never,
  })
  if (auditErr) console.error('Import audit log failed', auditErr)

  return NextResponse.json({
    ok: true,
    sites: summary.sites,
    facilities: summary.facilities,
    warnings: summary.warnings,
  })
}

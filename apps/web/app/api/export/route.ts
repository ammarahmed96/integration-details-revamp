import { createClient, createAdminClient } from '@/lib/supabase/server'

function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function csvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',')
}

export async function GET(request: Request) {
  // Auth check via user client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  const { data: ok } = await supabase.rpc('is_auditor')
  if (!ok) {
    return new Response('Forbidden — auditor or admin role required', { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const siteFilter = searchParams.get('site')
  const statusFilter = searchParams.get('status')

  const admin = createAdminClient()

  // Fetch all related data in parallel
  let facilitiesQuery = admin
    .from('facilities')
    .select(`
      id, campus_id, name, is_active, ehr_index_pattern, has_sso,
      sites!inner(id, slug, name)
    `)
    .order('name')

  if (siteFilter) {
    facilitiesQuery = facilitiesQuery.eq('site_id', siteFilter)
  }
  if (statusFilter === 'active') {
    facilitiesQuery = facilitiesQuery.eq('is_active', true)
  } else if (statusFilter === 'inactive') {
    facilitiesQuery = facilitiesQuery.eq('is_active', false)
  }

  const [
    { data: facilities, error: fErr },
    { data: ehrDetails },
    { data: receivingFeeds },
    { data: parsingFeeds },
    { data: epicIntegrations },
    { data: facilityCohorts },
    { data: lettersConfigs },
    { data: reportingDbs },
    { data: serverConfigs },
  ] = await Promise.all([
    facilitiesQuery,
    admin.from('ehr_details').select('*'),
    admin.from('receiving_feeds').select('*'),
    admin.from('parsing_feeds').select('*'),
    admin.from('epic_integrations').select('*'),
    admin.from('facility_cohorts').select('*').eq('is_live', true),
    admin.from('letters_config').select('*'),
    admin.from('reporting_db').select('*'),
    admin.from('server_configs').select('*'),
  ])

  if (fErr || !facilities) {
    return new Response('Failed to fetch facilities', { status: 500 })
  }

  // Build lookup maps
  const ehrMap = new Map((ehrDetails ?? []).map(r => [r.facility_id, r]))
  const rfMap = new Map((receivingFeeds ?? []).map(r => [r.facility_id, r]))
  const pfMap = new Map((parsingFeeds ?? []).map(r => [r.facility_id, r]))
  const eiMap = new Map((epicIntegrations ?? []).map(r => [r.facility_id, r]))
  const lettersMap = new Map((lettersConfigs ?? []).map(r => [r.facility_id, r]))
  const rdbMap = new Map((reportingDbs ?? []).map(r => [r.facility_id, r]))
  const scMap = new Map((serverConfigs ?? []).map(r => [r.facility_id, r]))

  // Group live cohorts by facility
  const cohortMap = new Map<string, string[]>()
  for (const fc of facilityCohorts ?? []) {
    const arr = cohortMap.get(fc.facility_id) ?? []
    arr.push(fc.cohort)
    cohortMap.set(fc.facility_id, arr)
  }

  const HEADERS = [
    'site_slug', 'site_name', 'facility_name', 'campus_id', 'is_active', 'has_sso',
    'ehr_index_pattern', 'ehr_facility_id', 'ehr_site_id', 'ehr_interface_id',
    // receiving feeds
    'adt', 'oru', 'orm', 'siu', 'mdm', 'bar', 'mfn', 'clarity',
    // parsing feeds
    'parsing_files', 'parse_adt', 'parse_oru', 'parse_orm', 'parse_siu',
    'flat_file_scheduling', 'parse_mdm', 'parse_bar', 'parse_mfn', 'parse_clarity',
    'physician_clarity', 'exam_clarity', 'eon_connect',
    // epic integrations
    'fhir', 'outgoing_mdm', 'parsing_middleware',
    // cohorts
    'live_cohorts',
    // letters
    'letters_to_epic', 'quadient_service', 'matching_algorithm',
    // reporting db / server
    'db_name', 'server_ip', 's3_folder',
  ]

  const lines: string[] = [HEADERS.join(',')]

  for (const f of facilities) {
    const site = f.sites as { id: string; slug: string; name: string } | null
    const ehr = ehrMap.get(f.id)
    const rf = rfMap.get(f.id)
    const pf = pfMap.get(f.id)
    const ei = eiMap.get(f.id)
    const lc = lettersMap.get(f.id)
    const rdb = rdbMap.get(f.id)
    const sc = scMap.get(f.id)
    const liveCohorts = (cohortMap.get(f.id) ?? []).sort().join(', ')

    lines.push(csvRow([
      site?.slug ?? '',
      site?.name ?? '',
      f.name,
      f.campus_id,
      f.is_active,
      f.has_sso,
      f.ehr_index_pattern,
      ehr?.ehr_facility_id,
      ehr?.ehr_site_id,
      ehr?.ehr_interface_id,
      // receiving
      rf?.adt,
      rf?.oru,
      rf?.orm,
      rf?.siu,
      rf?.mdm,
      rf?.bar,
      rf?.mfn,
      rf?.clarity,
      // parsing
      pf?.parsing_files,
      pf?.adt,
      pf?.oru,
      pf?.orm,
      pf?.siu,
      pf?.flat_file_scheduling,
      pf?.mdm,
      pf?.bar,
      pf?.mfn,
      pf?.clarity,
      pf?.physician_clarity,
      pf?.exam_clarity,
      pf?.eon_connect,
      // epic
      ei?.fhir,
      ei?.outgoing_mdm,
      ei?.parsing_middleware,
      // cohorts
      liveCohorts,
      // letters
      lc?.letters_to_epic,
      lc?.quadient_service,
      lc?.matching_algorithm,
      // db / server
      rdb?.db_name,
      sc?.server_ip,
      sc?.s3_folder,
    ]))
  }

  const csv = lines.join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="facilities-export.csv"',
      'Cache-Control': 'no-store',
    },
  })
}

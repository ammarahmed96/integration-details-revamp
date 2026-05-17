'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { COHORT_LIST, type CohortType } from '@/lib/cohorts'

function facilityPath(siteId: string, fid: string) {
  return `/sites/${siteId}/facilities/${fid}`
}

// Validates that a value is an https:// URL or null.
function safeUrl(v: string | null | undefined): string | null {
  if (!v?.trim()) return null
  try {
    const u = new URL(v.trim())
    if (u.protocol !== 'https:') throw new Error()
    return v.trim()
  } catch {
    throw new Error(`Invalid URL — must start with https://`)
  }
}

// Writes one audit row — uses service role because RLS blocks user writes.
async function logAudit(
  userId: string,
  tableName: string,
  recordId: string,
  action: 'UPDATE',
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown>,
) {
  const admin = createAdminClient()
  const { error } = await admin.from('audit_logs').insert({
    user_id:    userId,
    table_name: tableName,
    record_id:  recordId,
    action,
    old_data:   oldData as never,
    new_data:   newData as never,
  })
  if (error) console.error('Audit log write failed', error)
}

// ── Facility basics ───────────────────────────────────────────────────────────

export async function updateFacility(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const { data: before } = await supabase.from('facilities').select('*').eq('id', fid).single()

  const patch = {
    name:                       formData.get('name') as string,
    campus_id:                  (formData.get('campus_id') as string) || null,
    is_active:                  formData.get('is_active') === 'true',
    has_sso:                    formData.get('has_sso') === 'true',
    ehr_index_pattern:          (formData.get('ehr_index_pattern') as string) || null,
    implementation_package_url: safeUrl(formData.get('implementation_package_url') as string),
  }
  const { error } = await supabase.from('facilities').update(patch).eq('id', fid).eq('site_id', siteId)
  if (error) throw new Error(error.message)

  await logAudit(user.id, 'facilities', fid, 'UPDATE', before, patch)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Receiving feeds ───────────────────────────────────────────────────────────

export async function updateReceivingFeeds(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const { data: before } = await supabase.from('receiving_feeds').select('*').eq('facility_id', fid).single()

  const patch = {
    adt:     formData.get('adt') as 'active' | 'inactive' | 'flat_file',
    oru:     formData.get('oru') as 'active' | 'inactive' | 'flat_file',
    orm:     formData.get('orm') === 'true',
    siu:     formData.get('siu') === 'true',
    mdm:     formData.get('mdm') === 'true',
    bar:     formData.get('bar') === 'true',
    mfn:     formData.get('mfn') === 'true',
    clarity: formData.get('clarity') === 'true',
  }
  const { error } = await supabase.from('receiving_feeds').update(patch).eq('facility_id', fid)
  if (error) throw new Error(error.message)

  await logAudit(user.id, 'receiving_feeds', before?.id ?? fid, 'UPDATE', before, patch)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Parsing feeds ─────────────────────────────────────────────────────────────

export async function updateParsingFeeds(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const { data: before } = await supabase.from('parsing_feeds').select('*').eq('facility_id', fid).single()

  const bool = (key: string) => formData.get(key) === 'true'
  const patch = {
    parsing_files:        bool('parsing_files'),
    adt:                  bool('adt'),
    oru:                  bool('oru'),
    orm:                  bool('orm'),
    siu:                  bool('siu'),
    flat_file_scheduling: bool('flat_file_scheduling'),
    mdm:                  bool('mdm'),
    bar:                  bool('bar'),
    mfn:                  bool('mfn'),
    clarity:              bool('clarity'),
    physician_clarity:    bool('physician_clarity'),
    exam_clarity:         bool('exam_clarity'),
    eon_connect:          bool('eon_connect'),
  }
  const { error } = await supabase.from('parsing_feeds').update(patch).eq('facility_id', fid)
  if (error) throw new Error(error.message)

  await logAudit(user.id, 'parsing_feeds', before?.id ?? fid, 'UPDATE', before, patch)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── EPIC integrations ─────────────────────────────────────────────────────────

export async function updateEpicIntegrations(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const { data: before } = await supabase.from('epic_integrations').select('*').eq('facility_id', fid).single()

  const patch = {
    fhir:               formData.get('fhir') === 'true',
    outgoing_mdm:       formData.get('outgoing_mdm') === 'true',
    parsing_middleware: (formData.get('parsing_middleware') as string) || null,
  }
  const { error } = await supabase.from('epic_integrations').update(patch).eq('facility_id', fid)
  if (error) throw new Error(error.message)

  await logAudit(user.id, 'epic_integrations', before?.id ?? fid, 'UPDATE', before, patch)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Letters config ────────────────────────────────────────────────────────────

export async function updateLetters(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const { data: before } = await supabase.from('letters_config').select('*').eq('facility_id', fid).single()

  const patch = {
    letters_to_epic:    formData.get('letters_to_epic') === 'true',
    quadient_service:   formData.get('quadient_service') === 'true',
    matching_algorithm: (formData.get('matching_algorithm') as string) || null,
  }
  const { error } = await supabase.from('letters_config').update(patch).eq('facility_id', fid)
  if (error) throw new Error(error.message)

  await logAudit(user.id, 'letters_config', before?.id ?? fid, 'UPDATE', before, patch)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Cohorts ───────────────────────────────────────────────────────────────────

export async function updateCohorts(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const updates = COHORT_LIST.map(cohort => ({
    facility_id: fid,
    cohort,
    is_live: formData.get(`cohort_${cohort}`) === 'true',
  }))

  const { error } = await supabase
    .from('facility_cohorts')
    .upsert(updates, { onConflict: 'facility_id,cohort' })
  if (error) throw new Error(error.message)

  await logAudit(user.id, 'facility_cohorts', fid, 'UPDATE', null, { facility_id: fid, updates })
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── EHR Details ───────────────────────────────────────────────────────────────

export async function updateEhrDetails(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const { data: before } = await supabase.from('ehr_details').select('*').eq('facility_id', fid).single()

  const patch = {
    facility_id:      fid,
    ehr_facility_id:  (formData.get('ehr_facility_id') as string) || null,
    ehr_site_id:      (formData.get('ehr_site_id') as string) || null,
    ehr_interface_id: (formData.get('ehr_interface_id') as string) || null,
  }
  const { error } = await supabase.from('ehr_details').upsert(patch, { onConflict: 'facility_id' })
  if (error) throw new Error(error.message)

  await logAudit(user.id, 'ehr_details', before?.id ?? fid, 'UPDATE', before, patch)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Server Config ─────────────────────────────────────────────────────────────

const MAX_PORTS = 50
const VALID_PORT = /^\d{1,5}$/

export async function updateServerConfig(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  // Validate + parse ports BEFORE any DB write to avoid partial updates
  const portsRaw = (formData.get('ports') as string) || ''
  const portLines = portsRaw.split('\n').map(l => l.trim()).filter(Boolean).slice(0, MAX_PORTS)
  const portRows = portLines.map(line => {
    const [num, ...rest] = line.split(':')
    const portNum = num.trim()
    if (!VALID_PORT.test(portNum)) throw new Error(`Invalid port number: "${portNum}"`)
    const n = parseInt(portNum, 10)
    if (n < 1 || n > 65535) throw new Error(`Port out of range: ${n}`)
    return { facility_id: fid, port_number: n, port_name: rest.join(':').trim() || null }
  })

  const { data: before } = await supabase.from('server_configs').select('*').eq('facility_id', fid).single()

  const patch = {
    facility_id:      fid,
    server_ip:        (formData.get('server_ip') as string) || null,
    s3_folder:        (formData.get('s3_folder') as string) || null,
    sftp_folder_link: safeUrl(formData.get('sftp_folder_link') as string),
  }
  const { error: cfgError } = await supabase
    .from('server_configs').upsert(patch, { onConflict: 'facility_id' })
  if (cfgError) throw new Error(cfgError.message)

  // Ports: use admin client since RLS has no DELETE policy on facility_ports
  const admin = createAdminClient()
  const { error: delError } = await admin.from('facility_ports').delete().eq('facility_id', fid)
  if (delError) throw new Error(`Failed to clear ports: ${delError.message}`)
  if (portRows.length > 0) {
    const { error: insError } = await admin.from('facility_ports').insert(portRows)
    if (insError) throw new Error(`Failed to save ports: ${insError.message}`)
  }

  await logAudit(user.id, 'server_configs', before?.id ?? fid, 'UPDATE', before, patch)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Reporting DB ──────────────────────────────────────────────────────────────

export async function updateReportingDb(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const { data: before } = await supabase.from('reporting_db').select('*').eq('facility_id', fid).single()

  const patch = {
    facility_id: fid,
    db_name:     (formData.get('db_name') as string) || null,
  }
  const { error } = await supabase.from('reporting_db').upsert(patch, { onConflict: 'facility_id' })
  if (error) throw new Error(error.message)

  await logAudit(user.id, 'reporting_db', before?.id ?? fid, 'UPDATE', before, patch)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── ICP Go-Live ───────────────────────────────────────────────────────────────

export async function updateIcpGolive(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const updates = COHORT_LIST.map(cohort => ({
    facility_id: fid,
    cohort,
    is_live: formData.get(`icp_${cohort}`) === 'true',
  }))

  const { error } = await supabase
    .from('facility_icp_golive')
    .upsert(updates, { onConflict: 'facility_id,cohort' })
  if (error) throw new Error(error.message)

  await logAudit(user.id, 'facility_icp_golive', fid, 'UPDATE', null, { facility_id: fid, updates })
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── CM Cohorts ────────────────────────────────────────────────────────────────

export async function updateCmCohorts(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const desired: { facility_id: string; cohort: CohortType; cm_type: 'hybrid' | 'full' }[] = []
  for (const cohort of COHORT_LIST) {
    for (const cm_type of ['hybrid', 'full'] as const) {
      if (formData.get(`cm_${cm_type}_${cohort}`) === 'true') {
        desired.push({ facility_id: fid, cohort, cm_type })
      }
    }
  }

  // Use upsert for desired entries (safe — never wipes data)
  if (desired.length > 0) {
    const { error } = await supabase
      .from('facility_cm_cohorts')
      .upsert(desired, { onConflict: 'facility_id,cohort,cm_type' })
    if (error) throw new Error(error.message)
  }

  // Delete removed entries using admin client (RLS has no DELETE policy on this table)
  const desiredSet = new Set(desired.map(r => `${r.cohort}:${r.cm_type}`))
  const { data: existing } = await supabase
    .from('facility_cm_cohorts').select('cohort, cm_type').eq('facility_id', fid)
  const toDelete = (existing ?? []).filter(r => !desiredSet.has(`${r.cohort}:${r.cm_type}`))

  if (toDelete.length > 0) {
    const admin = createAdminClient()
    for (const entry of toDelete) {
      const { error } = await admin.from('facility_cm_cohorts')
        .delete().eq('facility_id', fid).eq('cohort', entry.cohort).eq('cm_type', entry.cm_type)
      if (error) throw new Error(`Failed to remove cohort entry: ${error.message}`)
    }
  }

  await logAudit(user.id, 'facility_cm_cohorts', fid, 'UPDATE', null, { facility_id: fid, desired })
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

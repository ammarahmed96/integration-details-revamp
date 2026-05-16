'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function facilityPath(siteId: string, fid: string) {
  return `/sites/${siteId}/facilities/${fid}`
}

// ── Facility basics ───────────────────────────────────────────────────────────

export async function updateFacility(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('facilities')
    .update({
      name:      formData.get('name') as string,
      campus_id: (formData.get('campus_id') as string) || null,
      is_active: formData.get('is_active') === 'true',
      has_sso:   formData.get('has_sso') === 'true',
    })
    .eq('id', fid)
    .eq('site_id', siteId)

  if (error) throw new Error(error.message)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Receiving feeds ───────────────────────────────────────────────────────────

export async function updateReceivingFeeds(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('receiving_feeds')
    .update({
      adt:     formData.get('adt') as 'active' | 'inactive' | 'flat_file',
      oru:     formData.get('oru') as 'active' | 'inactive' | 'flat_file',
      orm:     formData.get('orm') === 'true',
      siu:     formData.get('siu') === 'true',
      mdm:     formData.get('mdm') === 'true',
      bar:     formData.get('bar') === 'true',
      mfn:     formData.get('mfn') === 'true',
      clarity: formData.get('clarity') === 'true',
    })
    .eq('facility_id', fid)

  if (error) throw new Error(error.message)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Parsing feeds ─────────────────────────────────────────────────────────────

export async function updateParsingFeeds(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const bool = (key: string) => formData.get(key) === 'true'
  const { error } = await supabase
    .from('parsing_feeds')
    .update({
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
    })
    .eq('facility_id', fid)

  if (error) throw new Error(error.message)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── EPIC integrations ─────────────────────────────────────────────────────────

export async function updateEpicIntegrations(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const middleware = formData.get('parsing_middleware') as string
  const { error } = await supabase
    .from('epic_integrations')
    .update({
      fhir:               formData.get('fhir') === 'true',
      outgoing_mdm:       formData.get('outgoing_mdm') === 'true',
      parsing_middleware: middleware || null,
    })
    .eq('facility_id', fid)

  if (error) throw new Error(error.message)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Letters config ────────────────────────────────────────────────────────────

export async function updateLetters(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('letters_config')
    .update({
      letters_to_epic:    formData.get('letters_to_epic') === 'true',
      quadient_service:   formData.get('quadient_service') === 'true',
      matching_algorithm: (formData.get('matching_algorithm') as string) || null,
    })
    .eq('facility_id', fid)

  if (error) throw new Error(error.message)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

// ── Cohorts ───────────────────────────────────────────────────────────────────

export async function updateCohorts(siteId: string, fid: string, formData: FormData) {
  const supabase = await createClient()

  const ALL_COHORTS = [
    'lcs','lung','g_lung','aaa','taa','pancreas',
    'ielcap','thyroid','liver','renal','calcium','af','breast',
  ] as const

  const updates = ALL_COHORTS.map(cohort => ({
    facility_id: fid,
    cohort,
    is_live: formData.get(`cohort_${cohort}`) === 'true',
  }))

  const { error } = await supabase
    .from('facility_cohorts')
    .upsert(updates, { onConflict: 'facility_id,cohort' })

  if (error) throw new Error(error.message)
  revalidatePath(facilityPath(siteId, fid))
  redirect(facilityPath(siteId, fid))
}

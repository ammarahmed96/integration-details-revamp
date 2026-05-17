'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { COHORT_LIST } from '@/lib/cohorts'

// ── Create Site ───────────────────────────────────────────────────────────────

export async function createSite(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: isAdmin } = await supabase.rpc('is_global_editor')
  if (!isAdmin) throw new Error('Editor role required to create sites')

  const name = (formData.get('name') as string).trim()
  // Strip anything that isn't a lowercase letter, digit, or hyphen
  const slug = (formData.get('slug') as string)
    .trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '')
  if (!name) throw new Error('Name is required')
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) throw new Error('Invalid slug format')

  const { data: site, error } = await supabase
    .from('sites')
    .insert({ name, slug })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  revalidatePath('/sites')
  redirect(`/sites/${site.id}`)
}

// ── Create Facility ───────────────────────────────────────────────────────────

export async function createFacility(siteId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: canWrite } = await supabase.rpc('can_edit_site', { p_site_id: siteId })
  if (!canWrite) throw new Error('Forbidden')

  const name      = (formData.get('name') as string).trim()
  const campus_id = (formData.get('campus_id') as string).trim() || null
  const is_active = formData.get('is_active') === 'true'
  const has_sso   = formData.get('has_sso') === 'true'
  if (!name) throw new Error('Facility name is required')

  const { data: fac, error } = await supabase
    .from('facilities')
    .insert({ site_id: siteId, name, campus_id, is_active, has_sso })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const fid = fac.id

  // Create child records with defaults so all sections are editable immediately
  const results = await Promise.allSettled([
    supabase.from('ehr_details').insert({ facility_id: fid }),
    supabase.from('receiving_feeds').insert({ facility_id: fid }),
    supabase.from('parsing_feeds').insert({ facility_id: fid }),
    supabase.from('epic_integrations').insert({ facility_id: fid }),
    supabase.from('letters_config').insert({ facility_id: fid }),
    supabase.from('reporting_db').insert({ facility_id: fid }),
    supabase.from('server_configs').insert({ facility_id: fid }),
    supabase.from('facility_cohorts').insert(
      COHORT_LIST.map(cohort => ({ facility_id: fid, cohort, is_live: false }))
    ),
  ])

  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => String(r.reason))
  if (failed.length > 0) console.error('createFacility child insert errors', failed)

  revalidatePath(`/sites/${siteId}`)
  revalidatePath('/facilities')
  redirect(`/sites/${siteId}/facilities/${fid}`)
}

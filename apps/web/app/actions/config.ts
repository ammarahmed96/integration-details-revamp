'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function checkAuditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: ok } = await supabase.rpc('is_auditor')
  if (!ok) throw new Error('Forbidden')
  return supabase
}

export async function addCohort(formData: FormData) {
  const supabase = await checkAuditor()
  const name = (formData.get('name') as string).trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  const display_name = (formData.get('display_name') as string).trim()
  if (!name || !display_name) throw new Error('Name and display name are required')

  const { data: last } = await supabase
    .from('cohort_definitions').select('sort_order').order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = (last?.sort_order ?? 0) + 1

  const { error } = await supabase.from('cohort_definitions').insert({ name, display_name, sort_order })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/config')
}

export async function toggleCohort(formData: FormData) {
  const supabase = await checkAuditor()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await supabase.from('cohort_definitions').update({ is_active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/config')
}

export async function addConfigItem(formData: FormData) {
  const supabase = await checkAuditor()
  const category = (formData.get('category') as string).trim()
  const value = (formData.get('value') as string).trim()
  const display_name = (formData.get('display_name') as string).trim() || value
  if (!category || !value) throw new Error('Category and value are required')

  const { data: last } = await supabase
    .from('config_list_items').select('sort_order').eq('category', category)
    .order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = (last?.sort_order ?? 0) + 1

  const { error } = await supabase.from('config_list_items').insert({ category, value, display_name, sort_order })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/config')
}

export async function toggleConfigItem(formData: FormData) {
  const supabase = await checkAuditor()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await supabase.from('config_list_items').update({ is_active }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/config')
}

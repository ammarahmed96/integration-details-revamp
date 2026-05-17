'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function checkAuditor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: ok } = await supabase.rpc('is_auditor')
  if (!ok) throw new Error('Forbidden')
}

export async function assignRole(formData: FormData) {
  await checkAuditor()

  const userId = formData.get('user_id') as string
  const roleId = formData.get('role_id') as string
  const scopeType = formData.get('scope_type') as string
  const scopeId = (formData.get('scope_id') as string) || null

  if (!userId || !roleId || !scopeType) {
    throw new Error('Missing required fields')
  }
  const VALID_SCOPE_TYPES = ['global', 'site']
  if (!VALID_SCOPE_TYPES.includes(scopeType)) {
    throw new Error('Invalid scope_type')
  }

  const admin = createAdminClient()
  const { error } = await admin.from('user_roles').insert({
    user_id: userId,
    role_id: roleId,
    scope_type: scopeType,
    scope_id: scopeId,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/roles')
}

export async function revokeRole(formData: FormData) {
  await checkAuditor()

  const userRoleId = formData.get('user_role_id') as string
  if (!userRoleId) throw new Error('Missing user_role_id')

  const admin = createAdminClient()
  const { error } = await admin.from('user_roles').delete().eq('id', userRoleId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/admin/roles')
}

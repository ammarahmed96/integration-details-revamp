import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { assignRole, revokeRole } from '@/app/actions/admin'

const ROLE_NAMES = ['admin', 'editor', 'viewer', 'auditor', 'site_editor', 'org_editor'] as const
const SCOPE_TYPES = ['global', 'site'] as const

export default async function RolesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ok } = await supabase.rpc('is_auditor')
  if (!ok) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-gray-500">Access denied — auditor or admin role required.</p>
      </main>
    )
  }

  const admin = createAdminClient()

  const [
    { data: users },
    { data: roles },
    { data: userRoles },
    { data: sites },
  ] = await Promise.all([
    admin.from('users').select('id, email, full_name').order('email'),
    admin.from('roles').select('id, name').order('name'),
    admin.from('user_roles').select('id, user_id, role_id, scope_type, scope_id'),
    admin.from('sites').select('id, slug, name').order('name'),
  ])

  const roleMap = new Map((roles ?? []).map(r => [r.id, r.name]))
  const siteMap = new Map((sites ?? []).map(s => [s.id, `${s.name} (${s.slug})`]))

  // Group user_roles by user_id
  const userRolesByUser = new Map<string, typeof userRoles>()
  for (const ur of userRoles ?? []) {
    const arr = userRolesByUser.get(ur.user_id) ?? []
    arr.push(ur)
    userRolesByUser.set(ur.user_id, arr)
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Role Management</h1>

      <div className="space-y-6">
        {(users ?? []).map(u => {
          const assignedRoles = userRolesByUser.get(u.id) ?? []

          return (
            <div key={u.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-gray-900">{u.full_name || u.email}</p>
                  {u.full_name && (
                    <p className="text-xs text-gray-500">{u.email}</p>
                  )}
                </div>
              </div>

              {/* Current roles */}
              {assignedRoles.length > 0 ? (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Current Roles
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {assignedRoles.map(ur => {
                      const roleName = roleMap.get(ur.role_id) ?? ur.role_id
                      const scopeLabel =
                        ur.scope_type === 'site' && ur.scope_id
                          ? `site: ${siteMap.get(ur.scope_id) ?? ur.scope_id}`
                          : ur.scope_type

                      return (
                        <form key={ur.id} action={revokeRole} className="inline-flex items-center">
                          <input type="hidden" name="user_role_id" value={ur.id} />
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {roleName}
                            <span className="text-blue-400">·</span>
                            {scopeLabel}
                            <button
                              type="submit"
                              title="Revoke role"
                              className="ml-1 text-blue-400 hover:text-red-600 focus:outline-none"
                            >
                              ×
                            </button>
                          </span>
                        </form>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="mb-4 text-xs text-gray-400">No roles assigned.</p>
              )}

              {/* Add role form */}
              <details className="group">
                <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:underline list-none">
                  + Add role
                </summary>
                <form action={assignRole} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="user_id" value={u.id} />

                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Role</label>
                    <select
                      name="role_id"
                      required
                      className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="">Select…</option>
                      {(roles ?? []).map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-600">Scope</label>
                    <select
                      name="scope_type"
                      required
                      className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                    >
                      {SCOPE_TYPES.map(st => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-600">
                      Site{' '}
                      <span className="text-gray-400">(if scope = site)</span>
                    </label>
                    <select
                      name="scope_id"
                      className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                    >
                      <option value="">— none —</option>
                      {(sites ?? []).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Assign
                  </button>
                </form>
              </details>
            </div>
          )
        })}

        {(!users || users.length === 0) && (
          <p className="text-sm text-gray-500">No users found.</p>
        )}
      </div>
    </main>
  )
}

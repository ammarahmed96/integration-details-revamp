import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { assignRole, revokeRole } from '@/app/actions/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const SCOPE_TYPES = ['global', 'site'] as const

export default async function RolesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ok } = await supabase.rpc('is_auditor')
  if (!ok) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Access denied — auditor or admin role required.</p>
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

  const userRolesByUser = new Map<string, typeof userRoles>()
  for (const ur of userRoles ?? []) {
    const arr = userRolesByUser.get(ur.user_id) ?? []
    arr.push(ur)
    userRolesByUser.set(ur.user_id, arr)
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Role Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Assign and revoke roles for portal users
        </p>
      </div>

      <div className="space-y-4">
        {(users ?? []).map(u => {
          const assignedRoles = userRolesByUser.get(u.id) ?? []

          return (
            <Card key={u.id} className="shadow-none">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{u.full_name || u.email}</p>
                    {u.full_name && (
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {assignedRoles.length} role{assignedRoles.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Current roles */}
                {assignedRoles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignedRoles.map(ur => {
                      const roleName = roleMap.get(ur.role_id) ?? ur.role_id
                      const scopeLabel =
                        ur.scope_type === 'site' && ur.scope_id
                          ? siteMap.get(ur.scope_id) ?? ur.scope_id
                          : ur.scope_type

                      return (
                        <form key={ur.id} action={revokeRole} className="inline-flex">
                          <input type="hidden" name="user_role_id" value={ur.id} />
                          <button
                            type="submit"
                            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive transition-colors"
                          >
                            <span>{roleName}</span>
                            <span className="text-muted-foreground text-[10px]">· {scopeLabel}</span>
                            <span className="ml-0.5 text-muted-foreground group-hover:text-destructive">×</span>
                          </button>
                        </form>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No roles assigned.</p>
                )}

                <Separator />

                {/* Add role */}
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-primary hover:underline list-none select-none">
                    + Add role
                  </summary>
                  <form action={assignRole} className="mt-3 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="user_id" value={u.id} />

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Role</label>
                      <select
                        name="role_id"
                        required
                        className="flex h-8 rounded-md border border-input bg-background px-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select…</option>
                        {(roles ?? []).map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Scope</label>
                      <select
                        name="scope_type"
                        required
                        className="flex h-8 rounded-md border border-input bg-background px-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        {SCOPE_TYPES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        Site <span className="text-muted-foreground/60">(if site scope)</span>
                      </label>
                      <select
                        name="scope_id"
                        className="flex h-8 rounded-md border border-input bg-background px-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">— none —</option>
                        {(sites ?? []).map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
                        ))}
                      </select>
                    </div>

                    <Button type="submit" size="sm" className="h-8">Assign</Button>
                  </form>
                </details>
              </CardContent>
            </Card>
          )
        })}

        {(!users || users.length === 0) && (
          <p className="text-sm text-muted-foreground">No users found.</p>
        )}
      </div>
    </main>
  )
}

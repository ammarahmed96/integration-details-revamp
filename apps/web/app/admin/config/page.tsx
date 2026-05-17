import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addCohort, toggleCohort, addConfigItem, toggleConfigItem } from '@/app/actions/config'

export default async function ConfigPage() {
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

  const [{ data: cohorts }, { data: middlewareItems }] = await Promise.all([
    supabase.from('cohort_definitions').select('*').order('sort_order'),
    supabase.from('config_list_items').select('*').eq('category', 'middleware').order('sort_order'),
  ])

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Config Lists</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage cohorts and middleware options without code changes</p>
      </div>

      <div className="space-y-8">

        {/* ── Cohorts ── */}
        <section>
          <h2 className="text-base font-semibold mb-3">Cohorts</h2>
          <Card className="shadow-none">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Name</th>
                    <th className="px-4 py-2 text-left font-medium">Display Name</th>
                    <th className="px-4 py-2 text-left font-medium">Order</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(cohorts ?? []).map(c => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-xs">{c.name}</td>
                      <td className="px-4 py-2">{c.display_name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.sort_order}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          c.is_active ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                        }`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-4 py-2">
                        <form action={toggleCohort}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="is_active" value={String(!c.is_active)} />
                          <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                            {c.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Add cohort</p>
                <form action={addCohort} className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Name (slug)</label>
                    <Input name="name" placeholder="e.g. prostate" className="h-8 w-36 text-sm" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Display Name</label>
                    <Input name="display_name" placeholder="e.g. Prostate" className="h-8 w-40 text-sm" required />
                  </div>
                  <Button type="submit" size="sm">Add</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── Middleware Options ── */}
        <section>
          <h2 className="text-base font-semibold mb-3">Middleware Options</h2>
          <Card className="shadow-none">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">Value</th>
                    <th className="px-4 py-2 text-left font-medium">Order</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(middlewareItems ?? []).map(m => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-xs">{m.value}</td>
                      <td className="px-4 py-2 text-muted-foreground">{m.sort_order}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                          m.is_active ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                        }`}>{m.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-4 py-2">
                        <form action={toggleConfigItem}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="is_active" value={String(!m.is_active)} />
                          <Button type="submit" variant="ghost" size="sm" className="h-7 text-xs">
                            {m.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-border px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Add middleware option</p>
                <form action={addConfigItem} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="category" value="middleware" />
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Value</label>
                    <Input name="value" placeholder="e.g. eon-new-middleware" className="h-8 w-52 text-sm" required />
                  </div>
                  <Button type="submit" size="sm">Add</Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </main>
  )
}

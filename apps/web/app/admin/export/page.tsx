import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function ExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ok } = await supabase.rpc('is_auditor')
  if (!ok) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Access denied — auditor or admin role required.</p>
      </main>
    )
  }

  const admin = createAdminClient()
  const { data: sites } = await admin
    .from('sites')
    .select('id, slug, name')
    .order('name')

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Export Facilities</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Download a CSV with all facility integration data — one row per facility.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Leave blank to export everything.</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="GET" action="/api/export" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Site</label>
                <select
                  name="site"
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All sites</option>
                  {(sites ?? []).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <select
                  name="status"
                  className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button type="submit">Download CSV</Button>
              <a
                href="/api/export"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Download without filters
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ok } = await supabase.rpc('is_auditor')
  if (!ok) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-gray-500">Access denied — auditor or admin role required.</p>
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
      <h1 className="mb-2 text-xl font-semibold text-gray-900">Export Facilities</h1>
      <p className="mb-8 text-sm text-gray-500">
        Download a CSV file containing all facilities and their related integration data —
        one row per facility. Use the optional filters below to narrow the export.
      </p>

      <ExportForm sites={sites ?? []} />
    </main>
  )
}

function ExportForm({
  sites,
}: {
  sites: { id: string; slug: string; name: string }[]
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <form
        method="GET"
        action="/api/export"
        className="space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Site (optional)
          </label>
          <select
            name="site"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All sites</option>
            {sites.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.slug})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Status (optional)
          </label>
          <select
            name="status"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Download CSV
        </button>
      </form>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400">
          Direct link (no filters):{' '}
          <a
            href="/api/export"
            className="text-blue-600 hover:underline"
          >
            /api/export
          </a>
        </p>
      </div>
    </div>
  )
}

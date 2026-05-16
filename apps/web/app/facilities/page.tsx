import { createClient } from '@/lib/supabase/server'

interface Props {
  searchParams: Promise<{ q?: string; site?: string; status?: string }>
}

export default async function FacilitiesPage({ searchParams }: Props) {
  const { q, site: siteFilter, status } = await searchParams
  const supabase = await createClient()

  // Fetch sites for the filter dropdown
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, slug')
    .order('name')

  // Build facility query
  let query = supabase
    .from('facilities')
    .select('id, name, campus_id, is_active, site_id, sites!inner(id, name, slug)')
    .order('name')

  if (q?.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,campus_id.ilike.%${q.trim()}%`)
  }
  if (siteFilter) {
    query = query.eq('site_id', siteFilter)
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data: facilities, error } = await query.limit(200)
  if (error) throw error

  const hasFilters = !!(q || siteFilter || status)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Facilities</h1>
        <span className="text-sm text-gray-500">
          {facilities?.length ?? 0}{(facilities?.length ?? 0) === 200 ? '+' : ''} result{facilities?.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or campus ID…"
          className="min-w-64 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <select
          name="site"
          defaultValue={siteFilter ?? ''}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All sites</option>
          {sites?.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          type="submit"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Search
        </button>
        {hasFilters && (
          <a
            href="/facilities"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50"
          >
            Clear
          </a>
        )}
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {facilities && facilities.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Facility</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Campus ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Site</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facilities.map(f => {
                const site = Array.isArray(f.sites) ? f.sites[0] : f.sites
                return (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <a
                        href={`/sites/${f.site_id}/facilities/${f.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {f.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {f.campus_id
                        ? <code className="rounded bg-gray-100 px-1 text-xs">{f.campus_id}</code>
                        : <span className="italic text-gray-400">not set</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {site
                        ? <a href={`/sites/${site.id}`} className="hover:underline">{site.name}</a>
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {f.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            {hasFilters ? 'No facilities match your filters.' : 'No facilities found.'}
          </div>
        )}
      </div>
      {(facilities?.length ?? 0) === 200 && (
        <p className="mt-3 text-center text-xs text-gray-400">
          Showing first 200 results — refine your search to narrow down.
        </p>
      )}
    </main>
  )
}

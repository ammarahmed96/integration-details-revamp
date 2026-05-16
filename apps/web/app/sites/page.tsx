import { createClient } from '@/lib/supabase/server'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SitesPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('sites')
    .select('id, slug, name')
    .order('name')

  if (q?.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,slug.ilike.%${q.trim()}%`)
  }

  const { data: sites, error } = await query
  if (error) throw error

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sites</h1>
        <span className="text-sm text-gray-500">{sites?.length ?? 0} result{sites?.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Search */}
      <form method="GET" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or slug…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          Search
        </button>
        {q && (
          <a
            href="/sites"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm hover:bg-gray-50"
          >
            Clear
          </a>
        )}
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {sites && sites.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Slug</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sites.map(site => (
                <tr key={site.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a href={`/sites/${site.id}`} className="font-medium text-blue-600 hover:underline">
                      {site.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{site.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-gray-400">
            {q ? `No sites match "${q}"` : 'No sites found.'}
          </div>
        )}
      </div>
    </main>
  )
}

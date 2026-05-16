import { createClient } from '@/lib/supabase/server'

export default async function SitesPage() {
  const supabase = await createClient()

  const { data: sites, error } = await supabase
    .from('sites')
    .select('id, slug, name')
    .order('name')

  if (error) throw error

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sites</h1>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Slug</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sites?.map(site => (
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
      </div>
    </main>
  )
}

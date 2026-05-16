import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SiteDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: site, error } = await supabase
    .from('sites')
    .select('id, slug, name')
    .eq('id', id)
    .single()

  if (error || !site) notFound()

  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, campus_id, name, is_active, ehr_index_pattern')
    .eq('site_id', id)
    .order('name')

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <a href="/sites" className="hover:underline">Sites</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{site.name}</span>
      </nav>

      <h1 className="mb-1 text-2xl font-semibold">{site.name}</h1>
      <p className="mb-8 text-sm text-gray-500">Slug: {site.slug}</p>

      <section>
        <h2 className="mb-3 text-lg font-medium">Facilities ({facilities?.length ?? 0})</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Facility Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Campus ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">EHR Pattern</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facilities?.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <a href={`/sites/${id}/facilities/${f.id}`} className="text-blue-600 hover:underline">
                      {f.name}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{f.campus_id ?? <span className="italic text-gray-400">not set</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{f.ehr_index_pattern ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      f.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {f.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

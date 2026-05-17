import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { createFacility } from '@/app/actions/site'

interface Props {
  params: Promise<{ id: string }>
}

export default async function NewFacilityPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: site } = await supabase.from('sites').select('id, name').eq('id', id).single()
  if (!site) notFound()

  const action = createFacility.bind(null, id)

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <nav className="mb-6 text-sm text-gray-500">
        <a href="/sites" className="hover:underline">Sites</a>
        <span className="mx-2">/</span>
        <a href={`/sites/${id}`} className="hover:underline">{site.name}</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">New Facility</span>
      </nav>

      <h1 className="mb-6 text-xl font-semibold text-gray-900">Add Facility</h1>

      <form action={action} className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Facility Name</label>
          <input name="name" required placeholder="e.g. Main Campus Hospital"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Campus ID</label>
          <input name="campus_id" placeholder="Leave blank if none"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="mb-4 flex gap-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Active?</label>
            <select name="is_active" defaultValue="true"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">SSO?</label>
            <select name="has_sso" defaultValue="false"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="false">No</option>
              <option value="true">Yes</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Create Facility
          </button>
          <a href={`/sites/${id}`}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </a>
        </div>
      </form>
    </main>
  )
}

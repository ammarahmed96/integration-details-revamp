import { createSite } from '@/app/actions/site'

export default function NewSitePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <nav className="mb-6 text-sm text-gray-500">
        <a href="/sites" className="hover:underline">Sites</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">New Site</span>
      </nav>

      <h1 className="mb-6 text-xl font-semibold text-gray-900">Add Site</h1>

      <form action={createSite} className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Site Name</label>
          <input name="name" required placeholder="e.g. Acme Health System"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">Slug</label>
          <input name="slug" required placeholder="e.g. acme-health"
            pattern="[a-z0-9-]+" title="Lowercase letters, numbers, and hyphens only"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <p className="mt-1 text-xs text-gray-400">Lowercase letters, numbers, and hyphens only.</p>
        </div>
        <div className="flex gap-3">
          <button type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Create Site
          </button>
          <a href="/sites"
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </a>
        </div>
      </form>
    </main>
  )
}

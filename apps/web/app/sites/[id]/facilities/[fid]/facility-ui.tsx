// Shared display and form helper components for the facility detail page.

export function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
      active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
    }`}>{label}</span>
  )
}

export function FeedBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    'bg-green-100 text-green-700',
    inactive:  'bg-gray-100 text-gray-400',
    flat_file: 'bg-yellow-100 text-yellow-700',
  }
  const labels: Record<string, string> = { active: 'Active', inactive: 'Inactive', flat_file: 'Flat File' }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.inactive}`}>
      {labels[status] ?? status}
    </span>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="w-44 shrink-0 text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{children}</span>
    </div>
  )
}

export function BoolSelect({ name, value }: { name: string; value: boolean }) {
  return (
    <select name={name} defaultValue={value ? 'true' : 'false'}
      className="rounded border border-gray-300 px-2 py-1 text-sm">
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  )
}

export function FeedSelect({ name, value }: { name: string; value: string }) {
  return (
    <select name={name} defaultValue={value}
      className="rounded border border-gray-300 px-2 py-1 text-sm">
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
      <option value="flat_file">Flat File</option>
    </select>
  )
}

export function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-44 shrink-0 text-xs text-gray-500">{label}</span>
      {children}
    </div>
  )
}

export function FormActions({ cancelHref }: { cancelHref: string }) {
  return (
    <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
      <button type="submit"
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
        Save
      </button>
      <a href={cancelHref}
        className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
        Cancel
      </a>
    </div>
  )
}

export function Section({
  title, editHref, isEditing, canEdit, children,
}: {
  title: string
  editHref: string
  isEditing: boolean
  canEdit: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {canEdit && !isEditing && (
          <a href={editHref}
            className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50">
            Edit
          </a>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

export function ReadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">{title}</h2>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

export { COHORT_LIST as ALL_COHORTS } from '@/lib/cohorts'

export const MIDDLEWARE_OPTIONS = [
  'eon-middleware','eon-hca-middleware','eon-middleware-bmhcc',
  'eon-lpnt-middleware','eon-ascension-middleware','eon-uch-middleware',
  'eon-geisinger-middleware','eon-middleware-queue',
]

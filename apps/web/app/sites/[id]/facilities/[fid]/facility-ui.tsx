'use client'

// Shared display and form helper components for the facility detail page.

import { useState } from 'react'

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
    flat_file: 'bg-green-100 text-green-700',
  }
  const labels: Record<string, string> = { active: 'Yes', inactive: 'No', flat_file: 'Flat File' }
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

/** Stacked label-above-input layout — use inside feed/parse grid edits */
export function GridField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      {children}
    </div>
  )
}

/** Label-left layout — use for single-column edit sections */
export function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-44 shrink-0 text-xs text-gray-500">{label}</span>
      {children}
    </div>
  )
}

const SELECT_BASE = 'w-full rounded border px-2 py-1.5 text-sm font-medium transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-offset-0'
const SELECT_YES  = 'border-green-300 bg-green-50 text-green-800 focus:ring-green-200'
const SELECT_NO   = 'border-gray-200 bg-white text-gray-700 focus:ring-gray-200'

export function BoolSelect({ name, value }: { name: string; value: boolean }) {
  const [val, setVal] = useState(value ? 'true' : 'false')
  return (
    <select
      name={name}
      value={val}
      onChange={e => setVal(e.target.value)}
      className={`${SELECT_BASE} ${val === 'true' ? SELECT_YES : SELECT_NO}`}
    >
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  )
}

export function FeedSelect({ name, value }: { name: string; value: string }) {
  const [val, setVal] = useState(value)
  const isGreen = val === 'active' || val === 'flat_file'
  return (
    <select
      name={name}
      value={val}
      onChange={e => setVal(e.target.value)}
      className={`${SELECT_BASE} ${isGreen ? SELECT_YES : SELECT_NO}`}
    >
      <option value="active">Yes</option>
      <option value="inactive">No</option>
      <option value="flat_file">Flat File</option>
    </select>
  )
}

export function FormActions({ cancelHref }: { cancelHref: string }) {
  return (
    <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
      <button type="submit"
        className="rounded-lg bg-[#017ecf] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0170b8] transition-colors">
        Save
      </button>
      <a href={cancelHref}
        className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
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


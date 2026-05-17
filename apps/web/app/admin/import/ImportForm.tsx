'use client'

import { useState, useRef } from 'react'

interface ImportResult {
  ok: boolean
  sites: number
  facilities: number
  warnings: string[]
  error?: string
}

export default function ImportForm() {
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)

    const body = new FormData()
    body.append('file', file)

    const res = await fetch('/api/import', { method: 'POST', body })
    const json = await res.json() as ImportResult
    setResult(json)
    setLoading(false)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-xl font-semibold text-gray-900">Import from Excel</h1>
      <p className="mb-8 text-sm text-gray-500">
        Upload the <strong>SitesCampuses</strong> workbook. New rows are inserted; existing
        sites and facilities (matched by slug / campus ID) are updated. Max 10 MB.
      </p>

      <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white px-6 py-5">
        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">Excel file (.xlsx)</label>
          <input ref={fileRef} type="file" accept=".xlsx" required
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50" />
          <p className="mt-1.5 text-xs text-gray-400">
            Sheet must be named <code className="rounded bg-gray-100 px-1">SitesCampuses</code>. Data starts on row 3.
          </p>
        </div>
        <button type="submit" disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? 'Importing…' : 'Import'}
        </button>
      </form>

      {result && (
        <div className={`mt-6 rounded-xl border px-6 py-5 ${result.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          {result.ok ? (
            <>
              <p className="mb-2 font-medium text-green-800">Import complete</p>
              <ul className="text-sm text-green-700">
                <li>{result.sites} site(s) upserted</li>
                <li>{result.facilities} facilit{result.facilities === 1 ? 'y' : 'ies'} upserted</li>
              </ul>
              {result.warnings.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-amber-700">Warnings ({result.warnings.length})</p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-amber-700">
                    {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm font-medium text-red-700">Error: {result.error}</p>
          )}
        </div>
      )}
    </main>
  )
}

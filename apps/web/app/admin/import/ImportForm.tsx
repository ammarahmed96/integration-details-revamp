'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'

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
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Import from Excel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Upload the <strong>SitesCampuses</strong> workbook — existing records are updated, new rows are inserted.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload file</CardTitle>
          <CardDescription>
            Sheet must be named <code className="rounded bg-muted px-1 py-0.5 text-xs">SitesCampuses</code>.
            Data starts on row 3. Max 10 MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                required
                className="block w-full text-sm text-foreground
                  file:mr-3 file:rounded-md file:border file:border-input
                  file:bg-background file:px-3 file:py-1.5
                  file:text-sm file:font-medium file:text-foreground
                  hover:file:bg-muted cursor-pointer"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Importing…' : 'Import'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && (
        <div className="mt-4">
          {result.ok ? (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-4">
                <p className="font-medium text-green-800 mb-2">Import complete</p>
                <ul className="text-sm text-green-700 space-y-0.5">
                  <li>{result.sites} site(s) upserted</li>
                  <li>{result.facilities} facilit{result.facilities === 1 ? 'y' : 'ies'} upserted</li>
                </ul>
                {result.warnings.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <p className="text-sm font-medium text-amber-700 mb-1">
                      Warnings ({result.warnings.length})
                    </p>
                    <ul className="list-disc pl-5 text-xs text-amber-700 space-y-0.5">
                      {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Alert className="border-destructive/40 bg-destructive/5 text-destructive">
              <span className="text-sm font-medium">Error: {result.error}</span>
            </Alert>
          )}
        </div>
      )}
    </main>
  )
}

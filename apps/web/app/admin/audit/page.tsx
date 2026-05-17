import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ table?: string; date?: string }>
}

const TABLE_LABELS: Record<string, string> = {
  facilities:        'Facilities',
  receiving_feeds:   'Receiving Feeds',
  parsing_feeds:     'Parsing Feeds',
  epic_integrations: 'EPIC Integrations',
  letters_config:    'Letters Config',
  facility_cohorts:  'Cohorts',
}

const ALL_TABLES = Object.keys(TABLE_LABELS)

function display(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function DiffRow({ label, oldVal, newVal }: { label: string; oldVal: unknown; newVal: unknown }) {
  const oldStr = display(oldVal)
  const newStr = display(newVal)
  if (oldStr === newStr) return null
  return (
    <tr className="border-t border-gray-100 text-xs">
      <td className="py-1 pr-3 font-mono text-gray-500">{label}</td>
      <td className="py-1 pr-3 text-red-700 line-through">{oldStr}</td>
      <td className="py-1 text-green-700">{newStr}</td>
    </tr>
  )
}

function DataDiff({
  oldData,
  newData,
}: {
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
}) {
  if (!newData) return <span className="text-xs text-gray-400">no data</span>

  const keys = Array.from(
    new Set([
      ...Object.keys(oldData ?? {}),
      ...Object.keys(newData),
    ]),
  ).filter(k => !['id', 'facility_id', 'created_at', 'updated_at'].includes(k))

  const changed = keys.filter(k => {
    const o = display(oldData?.[k])
    const n = display(newData[k])
    return o !== n
  })

  if (changed.length === 0) return <span className="text-xs text-gray-400">no field changes</span>

  return (
    <table className="w-full">
      <thead>
        <tr className="text-xs text-gray-400">
          <th className="pb-1 pr-3 text-left font-normal">field</th>
          <th className="pb-1 pr-3 text-left font-normal">before</th>
          <th className="pb-1 text-left font-normal">after</th>
        </tr>
      </thead>
      <tbody>
        {changed.map(k => (
          <DiffRow key={k} label={k} oldVal={oldData?.[k] ?? null} newVal={newData[k]} />
        ))}
      </tbody>
    </table>
  )
}

export default async function AuditPage({ searchParams }: Props) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ok } = await supabase.rpc('is_auditor')
  if (!ok) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-gray-500">Access denied — auditor or admin role required.</p>
      </main>
    )
  }

  const { table, date } = await searchParams

  let query = supabase
    .from('audit_logs')
    .select('*, users(email)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (table && ALL_TABLES.includes(table)) {
    query = query.eq('table_name', table)
  }
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const start = new Date(date)
    if (!isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      query = query.gte('created_at', start.toISOString()).lte('created_at', end.toISOString())
    }
  }

  const { data: logs, error } = await query

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Audit Log</h1>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Table</label>
          <select
            name="table"
            defaultValue={table ?? ''}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="">All tables</option>
            {ALL_TABLES.map(t => (
              <option key={t} value={t}>{TABLE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Date</label>
          <input
            type="date"
            name="date"
            defaultValue={date ?? ''}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Filter
        </button>
        {(table || date) && (
          <a href="/admin/audit" className="text-sm text-gray-500 hover:underline">
            Clear
          </a>
        )}
      </form>

      {error && (
        <p className="mb-4 text-sm text-red-600">{error.message}</p>
      )}

      {!logs || logs.length === 0 ? (
        <p className="text-sm text-gray-500">No audit entries found.</p>
      ) : (
        <div className="space-y-3">
          {logs.length === 200 && (
            <p className="text-xs text-amber-700">Showing latest 200 entries — use filters to narrow results.</p>
          )}
          {logs.map((log) => {
            const ts = new Date(log.created_at ?? '')
            const userEmail = (log.users as { email?: string } | null)?.email ?? log.user_id ?? '—'
            const tableLabel = TABLE_LABELS[log.table_name] ?? log.table_name

            return (
              <div key={log.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-gray-900">{tableLabel}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">
                      {log.action}
                    </span>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>{userEmail}</div>
                    <div>
                      {ts.toLocaleDateString()}{' '}
                      {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-2 font-mono">{log.record_id}</div>
                <DataDiff
                  oldData={log.old_data as Record<string, unknown> | null}
                  newData={log.new_data as Record<string, unknown> | null}
                />
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

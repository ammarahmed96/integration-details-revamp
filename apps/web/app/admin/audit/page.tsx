import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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

const ACTION_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  INSERT: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
}

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
    <tr className="border-t border-border text-xs">
      <td className="py-1.5 pr-4 font-mono text-muted-foreground w-40">{label}</td>
      <td className="py-1.5 pr-4 text-destructive line-through">{oldStr}</td>
      <td className="py-1.5 text-green-700">{newStr}</td>
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
  if (!newData) return <span className="text-xs text-muted-foreground">no data</span>

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

  if (changed.length === 0) {
    return <span className="text-xs text-muted-foreground">no field changes</span>
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="text-xs text-muted-foreground">
          <th className="pb-1 pr-4 text-left font-normal w-40">field</th>
          <th className="pb-1 pr-4 text-left font-normal">before</th>
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
        <p className="text-muted-foreground">Access denied — auditor or admin role required.</p>
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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track all data changes across the portal</p>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Table</label>
          <select
            name="table"
            defaultValue={table ?? ''}
            className="flex h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All tables</option>
            {ALL_TABLES.map(t => (
              <option key={t} value={t}>{TABLE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input
            type="date"
            name="date"
            defaultValue={date ?? ''}
            className="h-8 w-40 bg-background"
          />
        </div>
        <Button type="submit" size="sm">Filter</Button>
        {(table || date) && (
          <a href="/admin/audit" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Clear
          </a>
        )}
      </form>

      {error && (
        <p className="mb-4 text-sm text-destructive">{error.message}</p>
      )}

      {!logs || logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit entries found.</p>
      ) : (
        <div className="space-y-3">
          {logs.length === 200 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Showing latest 200 entries — use filters to narrow results.
            </p>
          )}
          {logs.map((log) => {
            const ts = new Date(log.created_at ?? '')
            const userEmail = (log.users as { email?: string } | null)?.email ?? log.user_id ?? '—'
            const tableLabel = TABLE_LABELS[log.table_name] ?? log.table_name
            const actionVariant = ACTION_VARIANT[log.action] ?? 'outline'

            return (
              <Card key={log.id} className="shadow-none">
                <CardContent className="p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">{tableLabel}</span>
                      <Badge variant={actionVariant} className="text-xs">
                        {log.action}
                      </Badge>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div className="font-medium">{userEmail}</div>
                      <div>
                        {ts.toLocaleDateString()}{' '}
                        {ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mb-2">{log.record_id}</div>
                  <DataDiff
                    oldData={log.old_data as Record<string, unknown> | null}
                    newData={log.new_data as Record<string, unknown> | null}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}

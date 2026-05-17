import { createClient } from '@/lib/supabase/server'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface Props {
  searchParams: Promise<{ q?: string; site?: string; status?: string }>
}

export default async function FacilitiesPage({ searchParams }: Props) {
  const { q, site: siteFilter, status } = await searchParams
  const supabase = await createClient()

  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, slug')
    .order('name')

  let query = supabase
    .from('facilities')
    .select('id, name, campus_id, is_active, site_id, sites!inner(id, name, slug)')
    .order('name')

  if (q?.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,campus_id.ilike.%${q.trim()}%`)
  }
  if (siteFilter) {
    query = query.eq('site_id', siteFilter)
  }
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'inactive') {
    query = query.eq('is_active', false)
  }

  const { data: facilities, error } = await query.limit(200)
  if (error) throw error

  const hasFilters = !!(q || siteFilter || status)
  const count = facilities?.length ?? 0

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facilities</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All facilities across every site
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {count}{count === 200 ? '+' : ''} result{count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or campus ID…"
          className="min-w-56 max-w-xs bg-background"
        />
        <select
          name="site"
          defaultValue={siteFilter ?? ''}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring transition-colors"
        >
          <option value="">All sites</option>
          {sites?.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring transition-colors"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button type="submit" variant="outline" size="sm">Search</Button>
        {hasFilters && (
          <a href="/facilities" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Clear
          </a>
        )}
      </form>

      <Card>
        <CardContent className="p-0">
          {facilities && facilities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Facility</TableHead>
                  <TableHead>Campus ID</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facilities.map(f => {
                  const site = Array.isArray(f.sites) ? f.sites[0] : f.sites
                  return (
                    <TableRow key={f.id}>
                      <TableCell className="pl-4 font-medium">
                        <a
                          href={`/sites/${f.site_id}/facilities/${f.id}`}
                          className="text-primary hover:underline"
                        >
                          {f.name}
                        </a>
                      </TableCell>
                      <TableCell>
                        {f.campus_id
                          ? <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{f.campus_id}</code>
                          : <span className="text-xs italic text-muted-foreground">not set</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {site
                          ? <a href={`/sites/${site.id}`} className="hover:text-foreground hover:underline transition-colors">{site.name}</a>
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          f.is_active
                            ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {f.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {hasFilters ? 'No facilities match your filters.' : 'No facilities found.'}
              </p>
              {hasFilters && (
                <a href="/facilities" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3')}>
                  Clear filters
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {count === 200 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Showing first 200 results — refine your search to narrow down.
        </p>
      )}
    </main>
  )
}

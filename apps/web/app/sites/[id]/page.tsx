import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

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

  const [{ data: facilities }, { data: canEdit }] = await Promise.all([
    supabase
      .from('facilities')
      .select('id, campus_id, name, is_active, ehr_index_pattern')
      .eq('site_id', id)
      .order('name'),
    supabase.rpc('can_edit_site', { p_site_id: id }),
  ])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <a href="/sites" className="hover:text-foreground transition-colors">Sites</a>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">{site.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{site.name}</h1>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Site ID</span>
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground">
            {site.slug}
          </code>
        </div>
      </div>

      {/* Facilities section */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">
          Facilities
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {facilities?.length ?? 0}
          </span>
        </h2>
        {canEdit && (
          <a
            href={`/sites/${id}/facilities/new`}
            className={cn(buttonVariants({ size: 'sm' }))}
          >
            + Add Facility
          </a>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {facilities && facilities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Facility Name</TableHead>
                  <TableHead>Campus ID</TableHead>
                  <TableHead>EHR Pattern</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facilities.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="pl-4 font-medium">
                      <a
                        href={`/sites/${id}/facilities/${f.id}`}
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
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {f.ehr_index_pattern ?? '—'}
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
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">No facilities yet.</p>
              {canEdit && (
                <a
                  href={`/sites/${id}/facilities/new`}
                  className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'mt-3')}
                >
                  + Add the first facility
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

import { createClient } from '@/lib/supabase/server'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SitesPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('sites')
    .select('id, slug, name')
    .order('name')
    .limit(500)

  if (q?.trim()) {
    query = query.or(`name.ilike.%${q.trim()}%,slug.ilike.%${q.trim()}%`)
  }

  const { data: sites, error } = await query
  if (error) throw error

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sites</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage healthcare site configurations
          </p>
        </div>
        <a href="/sites/new" className={cn(buttonVariants({ size: 'sm' }))}>
          + Add Site
        </a>
      </div>

      {/* Search */}
      <form method="GET" className="mb-4 flex items-center gap-2">
        <Input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by name or slug…"
          className="max-w-sm bg-background"
        />
        <Button type="submit" variant="outline" size="sm">Search</Button>
        {q && (
          <a href="/sites" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            Clear
          </a>
        )}
        {sites && sites.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {sites.length} result{sites.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </form>

      <Card>
        <CardHeader className="py-0 px-0">
          {/* intentionally empty — table provides its own header row */}
        </CardHeader>
        <CardContent className="p-0">
          {sites && sites.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead>Slug</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map(site => (
                  <TableRow key={site.id}>
                    <TableCell className="pl-4">
                      <a
                        href={`/sites/${site.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {site.name}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {site.slug}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              {q ? `No sites match "${q}"` : 'No sites found.'}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

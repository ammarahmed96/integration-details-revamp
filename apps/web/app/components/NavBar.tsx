import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import NavLinks from './NavLinks'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

export default async function NavBar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: isAuditor } = await supabase.rpc('is_auditor')

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 h-14">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
            IP
          </div>
          <span className="text-sm font-semibold text-foreground hidden sm:block">
            Integration Portal
          </span>
        </div>

        <Separator orientation="vertical" className="h-5 mx-1" />

        <NavLinks showAudit={!!isAuditor} />

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:block truncate max-w-[180px]">
            {user.email}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm" className="text-xs h-7">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}

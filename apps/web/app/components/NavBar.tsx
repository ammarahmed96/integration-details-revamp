import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
    <header className="sticky top-0 z-10 bg-[#051c2c] shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 h-14">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#017ecf] text-white text-xs font-bold tracking-tight">
            IP
          </div>
          <span className="text-sm font-semibold text-white hidden sm:block">
            Integration Portal
          </span>
        </div>

        <div className="h-5 w-px bg-white/20 mx-1 shrink-0" />

        <NavLinks showAudit={!!isAuditor} />

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-white/50 sm:block truncate max-w-[180px]">
            {user.email}
          </span>
          <form action={signOut}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="text-xs h-7 border-white/20 text-white/80 bg-transparent hover:bg-white/10 hover:text-white hover:border-white/30"
            >
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}

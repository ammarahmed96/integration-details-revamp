import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <span className="shrink-0 text-sm font-semibold text-gray-900">Integration Portal</span>
        <NavLinks showAudit={!!isAuditor} />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-gray-500 sm:block">{user.email}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}

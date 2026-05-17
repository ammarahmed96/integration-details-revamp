import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ImportForm from './ImportForm'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ok } = await supabase.rpc('is_auditor')
  if (!ok) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-gray-500">Access denied — admin or auditor role required.</p>
      </main>
    )
  }

  return <ImportForm />
}

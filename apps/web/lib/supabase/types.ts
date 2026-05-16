/**
 * Placeholder — replace with the output of:
 *   npx supabase gen types typescript --project-id <your-project-id> > lib/supabase/types.ts
 *
 * Once the Supabase project is provisioned and the schema applied, run the
 * command above and commit the generated file in place of this one.
 */
export type Database = {
  public: {
    Tables: Record<string, unknown>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      cohort_type:
        | 'lcs' | 'lung' | 'g_lung' | 'aaa' | 'taa' | 'pancreas'
        | 'ielcap' | 'thyroid' | 'liver' | 'renal' | 'calcium' | 'af' | 'breast'
      feed_status: 'active' | 'inactive' | 'flat_file'
    }
  }
}

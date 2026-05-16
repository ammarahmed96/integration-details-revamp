import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import {
  updateFacility,
  updateReceivingFeeds,
  updateParsingFeeds,
  updateEpicIntegrations,
  updateLetters,
  updateCohorts,
} from '@/app/actions/facility'

interface Props {
  params: Promise<{ id: string; fid: string }>
  searchParams: Promise<{ edit?: string }>
}

// ── Small display helpers ─────────────────────────────────────────────────────

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
      active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
    }`}>{label}</span>
  )
}

function FeedBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    'bg-green-100 text-green-700',
    inactive:  'bg-gray-100 text-gray-400',
    flat_file: 'bg-yellow-100 text-yellow-700',
  }
  const labels: Record<string, string> = { active: 'Active', inactive: 'Inactive', flat_file: 'Flat File' }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.inactive}`}>
      {labels[status] ?? status}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <span className="w-44 shrink-0 text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-900">{children}</span>
    </div>
  )
}

// ── Form helpers ──────────────────────────────────────────────────────────────

function BoolSelect({ name, value }: { name: string; value: boolean }) {
  return (
    <select name={name} defaultValue={value ? 'true' : 'false'}
      className="rounded border border-gray-300 px-2 py-1 text-sm">
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  )
}

function FeedSelect({ name, value }: { name: string; value: string }) {
  return (
    <select name={name} defaultValue={value}
      className="rounded border border-gray-300 px-2 py-1 text-sm">
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
      <option value="flat_file">Flat File</option>
    </select>
  )
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="w-44 shrink-0 text-xs text-gray-500">{label}</span>
      {children}
    </div>
  )
}

function FormActions({ cancelHref }: { cancelHref: string }) {
  return (
    <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
      <button type="submit"
        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
        Save
      </button>
      <a href={cancelHref}
        className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
        Cancel
      </a>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title, editHref, isEditing, canEdit, children,
}: {
  title: string
  editHref: string
  isEditing: boolean
  canEdit: boolean
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
        {canEdit && !isEditing && (
          <a href={editHref}
            className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-50">
            Edit
          </a>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const ALL_COHORTS = [
  'lcs','lung','g_lung','aaa','taa','pancreas',
  'ielcap','thyroid','liver','renal','calcium','af','breast',
] as const

const MIDDLEWARE_OPTIONS = [
  'eon-middleware','eon-hca-middleware','eon-middleware-bmhcc',
  'eon-lpnt-middleware','eon-ascension-middleware','eon-uch-middleware',
  'eon-geisinger-middleware','eon-middleware-queue',
]

export default async function FacilityDetailPage({ params, searchParams }: Props) {
  const { id: siteId, fid } = await params
  const { edit } = await searchParams
  const supabase = await createClient()

  const { data: site }     = await supabase.from('sites').select('id, name, slug').eq('id', siteId).single()
  const { data: facility } = await supabase.from('facilities').select('*').eq('id', fid).eq('site_id', siteId).single()

  if (!facility || !site) notFound()

  // Role check — can the current user edit this site?
  const { data: canEdit } = await supabase.rpc('can_edit_site', { p_site_id: siteId })

  const { data: rf }        = await supabase.from('receiving_feeds').select('*').eq('facility_id', fid).single()
  const { data: pf }        = await supabase.from('parsing_feeds').select('*').eq('facility_id', fid).single()
  const { data: ei }        = await supabase.from('epic_integrations').select('*').eq('facility_id', fid).single()
  const { data: cohorts }   = await supabase.from('facility_cohorts').select('cohort, is_live').eq('facility_id', fid).order('cohort')
  const { data: cmCohorts } = await supabase.from('facility_cm_cohorts').select('cohort, cm_type').eq('facility_id', fid).order('cohort')
  const { data: icp }       = await supabase.from('facility_icp_golive').select('cohort, is_live').eq('facility_id', fid).order('cohort')
  const { data: ports }     = await supabase.from('facility_ports').select('port_number, port_name').eq('facility_id', fid).order('port_number')
  const { data: sc }        = await supabase.from('server_configs').select('*').eq('facility_id', fid).single()
  const { data: lc }        = await supabase.from('letters_config').select('*').eq('facility_id', fid).single()
  const { data: rd }        = await supabase.from('reporting_db').select('*').eq('facility_id', fid).single()
  const { data: ehr }       = await supabase.from('ehr_details').select('*').eq('facility_id', fid).single()

  const allCohorts  = cohorts ?? []
  const liveCohorts = allCohorts.filter(c => c.is_live).map(c => c.cohort)
  const base = `/sites/${siteId}/facilities/${fid}`

  // Bind server actions to this facility
  const saveFacility  = updateFacility.bind(null, siteId, fid)
  const saveReceiving = updateReceivingFeeds.bind(null, siteId, fid)
  const saveParsing   = updateParsingFeeds.bind(null, siteId, fid)
  const saveEpic      = updateEpicIntegrations.bind(null, siteId, fid)
  const saveLetters   = updateLetters.bind(null, siteId, fid)
  const saveCohorts   = updateCohorts.bind(null, siteId, fid)

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <a href="/sites" className="hover:underline">Sites</a>
        <span className="mx-2">/</span>
        <a href={`/sites/${siteId}`} className="hover:underline">{site.name}</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{facility.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{facility.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            {facility.campus_id
              ? <span>Campus ID: <code className="rounded bg-gray-100 px-1 text-xs">{facility.campus_id}</code></span>
              : <span className="italic">No campus ID</span>}
            <span>·</span>
            <span>{site.name}</span>
          </div>
        </div>
        <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${
          facility.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {facility.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="grid gap-4">

        {/* ── Facility basics ── */}
        <Section title="Facility" editHref={`${base}?edit=facility`}
          isEditing={edit === 'facility'} canEdit={!!canEdit}>
          {edit === 'facility' ? (
            <form action={saveFacility}>
              <EditField label="Name">
                <input name="name" defaultValue={facility.name} required
                  className="w-72 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <EditField label="Campus ID">
                <input name="campus_id" defaultValue={facility.campus_id ?? ''}
                  placeholder="leave blank for null"
                  className="w-48 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <EditField label="Active"><BoolSelect name="is_active" value={facility.is_active} /></EditField>
              <EditField label="SSO"><BoolSelect name="has_sso" value={!!facility.has_sso} /></EditField>
              <FormActions cancelHref={base} />
            </form>
          ) : (
            <>
              <Field label="EHR Index Pattern">{facility.ehr_index_pattern ?? <span className="text-gray-400">—</span>}</Field>
              <Field label="SSO"><Badge active={!!facility.has_sso} label={facility.has_sso ? 'Yes' : 'No'} /></Field>
              {facility.implementation_package_url && (
                <Field label="Implementation Package">
                  <a href={facility.implementation_package_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline">
                    {facility.implementation_package_url}
                  </a>
                </Field>
              )}
            </>
          )}
        </Section>

        {/* ── EHR IDs ── */}
        {ehr && (
          <section className="rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">EHR Identifiers</h2>
            <div className="px-4 py-3">
              <Field label="Facility ID">{ehr.ehr_facility_id ?? '—'}</Field>
              <Field label="Site ID">{ehr.ehr_site_id ?? '—'}</Field>
              <Field label="Interface ID">{ehr.ehr_interface_id ?? '—'}</Field>
            </div>
          </section>
        )}

        {/* ── Receiving feeds ── */}
        {rf && (
          <Section title="Receiving Feeds" editHref={`${base}?edit=receiving`}
            isEditing={edit === 'receiving'} canEdit={!!canEdit}>
            {edit === 'receiving' ? (
              <form action={saveReceiving}>
                <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
                  <EditField label="ADT"><FeedSelect name="adt" value={rf.adt} /></EditField>
                  <EditField label="ORU"><FeedSelect name="oru" value={rf.oru} /></EditField>
                  <EditField label="ORM"><BoolSelect name="orm" value={rf.orm} /></EditField>
                  <EditField label="SIU"><BoolSelect name="siu" value={rf.siu} /></EditField>
                  <EditField label="MDM"><BoolSelect name="mdm" value={rf.mdm} /></EditField>
                  <EditField label="BAR"><BoolSelect name="bar" value={rf.bar} /></EditField>
                  <EditField label="MFN"><BoolSelect name="mfn" value={rf.mfn} /></EditField>
                  <EditField label="Clarity"><BoolSelect name="clarity" value={rf.clarity} /></EditField>
                </div>
                <FormActions cancelHref={base} />
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
                <Field label="ADT"><FeedBadge status={rf.adt} /></Field>
                <Field label="ORU"><FeedBadge status={rf.oru} /></Field>
                <Field label="ORM"><Badge active={rf.orm} label={rf.orm ? 'Yes' : 'No'} /></Field>
                <Field label="SIU"><Badge active={rf.siu} label={rf.siu ? 'Yes' : 'No'} /></Field>
                <Field label="MDM"><Badge active={rf.mdm} label={rf.mdm ? 'Yes' : 'No'} /></Field>
                <Field label="BAR"><Badge active={rf.bar} label={rf.bar ? 'Yes' : 'No'} /></Field>
                <Field label="MFN"><Badge active={rf.mfn} label={rf.mfn ? 'Yes' : 'No'} /></Field>
                <Field label="Clarity"><Badge active={rf.clarity} label={rf.clarity ? 'Yes' : 'No'} /></Field>
              </div>
            )}
          </Section>
        )}

        {/* ── Parsing feeds ── */}
        {pf && (
          <Section title="Parsing Feeds" editHref={`${base}?edit=parsing`}
            isEditing={edit === 'parsing'} canEdit={!!canEdit}>
            {edit === 'parsing' ? (
              <form action={saveParsing}>
                <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
                  {([
                    ['parsing_files','Parsing Files'],['adt','ADT'],['oru','ORU'],['orm','ORM'],
                    ['siu','SIU'],['flat_file_scheduling','Flat File Sched.'],['mdm','MDM'],['bar','BAR'],
                    ['mfn','MFN'],['clarity','Clarity'],['physician_clarity','Physician Clarity'],
                    ['exam_clarity','Exam Clarity'],['eon_connect','Eon Connect'],
                  ] as [keyof typeof pf, string][]).map(([key, label]) => (
                    <EditField key={key} label={label}>
                      <BoolSelect name={key} value={!!pf[key]} />
                    </EditField>
                  ))}
                </div>
                <FormActions cancelHref={base} />
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
                {([
                  ['parsing_files','Parsing Files'],['adt','ADT'],['oru','ORU'],['orm','ORM'],
                  ['siu','SIU'],['flat_file_scheduling','Flat File Sched.'],['mdm','MDM'],['bar','BAR'],
                  ['mfn','MFN'],['clarity','Clarity'],['physician_clarity','Physician Clarity'],
                  ['exam_clarity','Exam Clarity'],['eon_connect','Eon Connect'],
                ] as [keyof typeof pf, string][]).map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Badge active={!!pf[key]} label={pf[key] ? 'Yes' : 'No'} />
                  </Field>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── EPIC integrations ── */}
        {ei && (
          <Section title="EPIC Integrations" editHref={`${base}?edit=epic`}
            isEditing={edit === 'epic'} canEdit={!!canEdit}>
            {edit === 'epic' ? (
              <form action={saveEpic}>
                <EditField label="FHIR"><BoolSelect name="fhir" value={ei.fhir} /></EditField>
                <EditField label="Outgoing MDM"><BoolSelect name="outgoing_mdm" value={ei.outgoing_mdm} /></EditField>
                <EditField label="Parsing Middleware">
                  <select name="parsing_middleware" defaultValue={ei.parsing_middleware ?? ''}
                    className="rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="">None</option>
                    {MIDDLEWARE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </EditField>
                <FormActions cancelHref={base} />
              </form>
            ) : (
              <>
                <Field label="FHIR"><Badge active={ei.fhir} label={ei.fhir ? 'Yes' : 'No'} /></Field>
                <Field label="Outgoing MDM"><Badge active={ei.outgoing_mdm} label={ei.outgoing_mdm ? 'Yes' : 'No'} /></Field>
                <Field label="Parsing Middleware">{ei.parsing_middleware ?? <span className="text-gray-400">—</span>}</Field>
              </>
            )}
          </Section>
        )}

        {/* ── Cohorts ── */}
        {allCohorts.length > 0 && (
          <Section title="Live Cohorts" editHref={`${base}?edit=cohorts`}
            isEditing={edit === 'cohorts'} canEdit={!!canEdit}>
            {edit === 'cohorts' ? (
              <form action={saveCohorts}>
                <div className="flex flex-wrap gap-3">
                  {ALL_COHORTS.map(cohort => {
                    const current = allCohorts.find(c => c.cohort === cohort)
                    const isLive = current?.is_live ?? false
                    return (
                      <label key={cohort} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input type="checkbox" name={`cohort_${cohort}`} value="true"
                          defaultChecked={isLive}
                          className="rounded border-gray-300" />
                        <span className="capitalize">{cohort.replace('_', ' ')}</span>
                      </label>
                    )
                  })}
                </div>
                <FormActions cancelHref={base} />
              </form>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {allCohorts.map(c => (
                    <span key={c.cohort} className={`rounded-full px-3 py-1 text-xs font-medium ${
                      c.is_live ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                    }`}>{c.cohort}</span>
                  ))}
                </div>
                {liveCohorts.length === 0 && <p className="mt-2 text-sm text-gray-400">No live cohorts</p>}
              </>
            )}
          </Section>
        )}

        {/* ── ICP Golive (read-only) ── */}
        {(icp?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">ICP Go-Live</h2>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {icp!.map(c => (
                <span key={c.cohort} className={`rounded-full px-3 py-1 text-xs font-medium ${
                  c.is_live ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
                }`}>{c.cohort}</span>
              ))}
            </div>
          </section>
        )}

        {/* ── CM cohorts (read-only) ── */}
        {(cmCohorts?.length ?? 0) > 0 && (
          <section className="rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">Centralised Management Cohorts</h2>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {cmCohorts!.map(c => (
                <span key={`${c.cohort}-${c.cm_type}`} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                  {c.cohort} ({c.cm_type})
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Letters ── */}
        {lc && (
          <Section title="Letters" editHref={`${base}?edit=letters`}
            isEditing={edit === 'letters'} canEdit={!!canEdit}>
            {edit === 'letters' ? (
              <form action={saveLetters}>
                <EditField label="Letters to EPIC"><BoolSelect name="letters_to_epic" value={lc.letters_to_epic} /></EditField>
                <EditField label="Quadient Service"><BoolSelect name="quadient_service" value={lc.quadient_service} /></EditField>
                <EditField label="Matching Algorithm">
                  <input name="matching_algorithm" defaultValue={lc.matching_algorithm ?? ''}
                    className="w-80 rounded border border-gray-300 px-2 py-1 text-sm" />
                </EditField>
                <FormActions cancelHref={base} />
              </form>
            ) : (
              <>
                <Field label="Letters to EPIC"><Badge active={lc.letters_to_epic} label={lc.letters_to_epic ? 'Yes' : 'No'} /></Field>
                <Field label="Quadient Service"><Badge active={lc.quadient_service} label={lc.quadient_service ? 'Yes' : 'No'} /></Field>
                <Field label="Matching Algorithm">{lc.matching_algorithm ?? <span className="text-gray-400">—</span>}</Field>
              </>
            )}
          </Section>
        )}

        {/* ── Server & Config (read-only) ── */}
        {sc && (
          <section className="rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">Server & Config</h2>
            <div className="px-4 py-3">
              <Field label="Server IP">{sc.server_ip ?? '—'}</Field>
              <Field label="S3 Folder">
                {sc.s3_folder ? <code className="rounded bg-gray-100 px-1 text-xs">{sc.s3_folder}</code> : '—'}
              </Field>
              <Field label="SFTP Folder">
                {sc.sftp_folder_link
                  ? <a href={sc.sftp_folder_link} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline">{sc.sftp_folder_link}</a>
                  : '—'}
              </Field>
              {(ports?.length ?? 0) > 0 && (
                <Field label="Ports">
                  <div className="flex flex-wrap gap-2">
                    {ports!.map(p => (
                      <span key={p.port_number} className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">
                        {p.port_number}{p.port_name ? ` · ${p.port_name}` : ''}
                      </span>
                    ))}
                  </div>
                </Field>
              )}
            </div>
          </section>
        )}

        {/* ── Reporting DB (read-only) ── */}
        {rd?.db_name && (
          <section className="rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">Reporting Database</h2>
            <div className="px-4 py-3">
              <Field label="Database Name"><code className="rounded bg-gray-100 px-1 text-xs">{rd.db_name}</code></Field>
            </div>
          </section>
        )}

      </div>
    </main>
  )
}

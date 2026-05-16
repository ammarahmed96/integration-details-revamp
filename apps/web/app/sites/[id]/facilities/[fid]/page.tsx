import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string; fid: string }>
}

function Badge({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
      active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
    }`}>
      {label}
    </span>
  )
}

function FeedBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    'bg-green-100 text-green-700',
    inactive:  'bg-gray-100 text-gray-400',
    flat_file: 'bg-yellow-100 text-yellow-700',
  }
  const labels: Record<string, string> = {
    active: 'Active', inactive: 'Inactive', flat_file: 'Flat File',
  }
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.inactive}`}>
      {labels[status] ?? status}
    </span>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <h2 className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">{title}</h2>
      <div className="px-4 py-3">{children}</div>
    </section>
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

export default async function FacilityDetailPage({ params }: Props) {
  const { id: siteId, fid } = await params
  const supabase = await createClient()

  const { data: site }     = await supabase.from('sites').select('id, name, slug').eq('id', siteId).single()
  const { data: facility } = await supabase.from('facilities').select('*').eq('id', fid).eq('site_id', siteId).single()

  if (!facility || !site) notFound()

  const { data: rf }       = await supabase.from('receiving_feeds').select('*').eq('facility_id', fid).single()
  const { data: pf }       = await supabase.from('parsing_feeds').select('*').eq('facility_id', fid).single()
  const { data: ei }       = await supabase.from('epic_integrations').select('*').eq('facility_id', fid).single()
  const { data: cohorts }  = await supabase.from('facility_cohorts').select('cohort, is_live').eq('facility_id', fid).order('cohort')
  const { data: cmCohorts }= await supabase.from('facility_cm_cohorts').select('cohort, cm_type').eq('facility_id', fid).order('cohort')
  const { data: icp }      = await supabase.from('facility_icp_golive').select('cohort, is_live').eq('facility_id', fid).order('cohort')
  const { data: ports }    = await supabase.from('facility_ports').select('port_number, port_name').eq('facility_id', fid).order('port_number')
  const { data: sc }       = await supabase.from('server_configs').select('*').eq('facility_id', fid).single()
  const { data: lc }       = await supabase.from('letters_config').select('*').eq('facility_id', fid).single()
  const { data: rd }       = await supabase.from('reporting_db').select('*').eq('facility_id', fid).single()
  const { data: ehr }      = await supabase.from('ehr_details').select('*').eq('facility_id', fid).single()

  const allCohorts  = cohorts  ?? []
  const liveCohorts = allCohorts.filter(c => c.is_live).map(c => c.cohort)

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

        {/* Facility basics */}
        <Section title="Facility">
          <Field label="EHR Index Pattern">{facility.ehr_index_pattern ?? <span className="text-gray-400">—</span>}</Field>
          <Field label="SSO"><Badge active={!!facility.has_sso} label={facility.has_sso ? 'Yes' : 'No'} /></Field>
          {facility.implementation_package_url && (
            <Field label="Implementation Package">
              <a href={facility.implementation_package_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs">
                {facility.implementation_package_url}
              </a>
            </Field>
          )}
        </Section>

        {/* EHR IDs */}
        {ehr && (
          <Section title="EHR Identifiers">
            <Field label="Facility ID">{ehr.ehr_facility_id ?? '—'}</Field>
            <Field label="Site ID">{ehr.ehr_site_id ?? '—'}</Field>
            <Field label="Interface ID">{ehr.ehr_interface_id ?? '—'}</Field>
          </Section>
        )}

        {/* Receiving feeds */}
        {rf && (
          <Section title="Receiving Feeds">
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
          </Section>
        )}

        {/* Parsing feeds */}
        {pf && (
          <Section title="Parsing Feeds">
            <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
              <Field label="Parsing Files"><Badge active={pf.parsing_files} label={pf.parsing_files ? 'Yes' : 'No'} /></Field>
              <Field label="ADT"><Badge active={pf.adt} label={pf.adt ? 'Yes' : 'No'} /></Field>
              <Field label="ORU"><Badge active={pf.oru} label={pf.oru ? 'Yes' : 'No'} /></Field>
              <Field label="ORM"><Badge active={pf.orm} label={pf.orm ? 'Yes' : 'No'} /></Field>
              <Field label="SIU"><Badge active={pf.siu} label={pf.siu ? 'Yes' : 'No'} /></Field>
              <Field label="Flat File Scheduling"><Badge active={pf.flat_file_scheduling} label={pf.flat_file_scheduling ? 'Yes' : 'No'} /></Field>
              <Field label="MDM"><Badge active={pf.mdm} label={pf.mdm ? 'Yes' : 'No'} /></Field>
              <Field label="BAR"><Badge active={pf.bar} label={pf.bar ? 'Yes' : 'No'} /></Field>
              <Field label="MFN"><Badge active={pf.mfn} label={pf.mfn ? 'Yes' : 'No'} /></Field>
              <Field label="Clarity"><Badge active={pf.clarity} label={pf.clarity ? 'Yes' : 'No'} /></Field>
              <Field label="Physician Clarity"><Badge active={pf.physician_clarity} label={pf.physician_clarity ? 'Yes' : 'No'} /></Field>
              <Field label="Exam Clarity"><Badge active={pf.exam_clarity} label={pf.exam_clarity ? 'Yes' : 'No'} /></Field>
              <Field label="Eon Connect"><Badge active={pf.eon_connect} label={pf.eon_connect ? 'Yes' : 'No'} /></Field>
            </div>
          </Section>
        )}

        {/* EPIC integrations */}
        {ei && (
          <Section title="EPIC Integrations">
            <Field label="FHIR"><Badge active={ei.fhir} label={ei.fhir ? 'Yes' : 'No'} /></Field>
            <Field label="Outgoing MDM"><Badge active={ei.outgoing_mdm} label={ei.outgoing_mdm ? 'Yes' : 'No'} /></Field>
            <Field label="Parsing Middleware">{ei.parsing_middleware ?? <span className="text-gray-400">—</span>}</Field>
          </Section>
        )}

        {/* Cohorts */}
        {allCohorts.length > 0 && (
          <Section title="Live Cohorts">
            <div className="flex flex-wrap gap-2">
              {allCohorts.map(c => (
                <span key={c.cohort} className={`rounded-full px-3 py-1 text-xs font-medium ${
                  c.is_live ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  {c.cohort}
                </span>
              ))}
            </div>
            {liveCohorts.length === 0 && <p className="mt-2 text-sm text-gray-400">No live cohorts</p>}
          </Section>
        )}

        {/* ICP Golive */}
        {(icp?.length ?? 0) > 0 && (
          <Section title="ICP Go-Live">
            <div className="flex flex-wrap gap-2">
              {icp!.map(c => (
                <span key={c.cohort} className={`rounded-full px-3 py-1 text-xs font-medium ${
                  c.is_live ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
                }`}>
                  {c.cohort}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* CM cohorts */}
        {(cmCohorts?.length ?? 0) > 0 && (
          <Section title="Centralised Management Cohorts">
            <div className="flex flex-wrap gap-2">
              {cmCohorts!.map(c => (
                <span key={`${c.cohort}-${c.cm_type}`} className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                  {c.cohort} ({c.cm_type})
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Letters */}
        {lc && (
          <Section title="Letters">
            <Field label="Letters to EPIC"><Badge active={lc.letters_to_epic} label={lc.letters_to_epic ? 'Yes' : 'No'} /></Field>
            <Field label="Quadient Service"><Badge active={lc.quadient_service} label={lc.quadient_service ? 'Yes' : 'No'} /></Field>
            <Field label="Matching Algorithm">{lc.matching_algorithm ?? <span className="text-gray-400">—</span>}</Field>
          </Section>
        )}

        {/* Server & config */}
        {sc && (
          <Section title="Server & Config">
            <Field label="Server IP">{sc.server_ip ?? '—'}</Field>
            <Field label="S3 Folder">
              {sc.s3_folder ? <code className="rounded bg-gray-100 px-1 text-xs">{sc.s3_folder}</code> : '—'}
            </Field>
            <Field label="SFTP Folder">
              {sc.sftp_folder_link
                ? <a href={sc.sftp_folder_link} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs">{sc.sftp_folder_link}</a>
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
          </Section>
        )}

        {/* Reporting DB */}
        {rd?.db_name && (
          <Section title="Reporting Database">
            <Field label="Database Name"><code className="rounded bg-gray-100 px-1 text-xs">{rd.db_name}</code></Field>
          </Section>
        )}

      </div>
    </main>
  )
}

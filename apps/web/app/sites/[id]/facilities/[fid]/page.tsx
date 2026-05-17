import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import {
  updateFacility, updateReceivingFeeds, updateParsingFeeds,
  updateEpicIntegrations, updateLetters, updateCohorts,
  updateEhrDetails, updateServerConfig, updateReportingDb,
  updateIcpGolive, updateCmCohorts,
} from '@/app/actions/facility'
import {
  Badge, FeedBadge, Field, BoolSelect, FeedSelect, EditField, GridField,
  FormActions, Section, ReadSection,
} from './facility-ui'
import { COHORT_LIST as ALL_COHORTS } from '@/lib/cohorts'

const MIDDLEWARE_OPTIONS = [
  'eon-middleware','eon-hca-middleware','eon-middleware-bmhcc',
  'eon-lpnt-middleware','eon-ascension-middleware','eon-uch-middleware',
  'eon-geisinger-middleware','eon-middleware-queue',
]

interface Props {
  params: Promise<{ id: string; fid: string }>
  searchParams: Promise<{ edit?: string }>
}

export default async function FacilityDetailPage({ params, searchParams }: Props) {
  const { id: siteId, fid } = await params
  const { edit } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: site }     = await supabase.from('sites').select('id, name, slug').eq('id', siteId).single()
  const { data: facility } = await supabase.from('facilities').select('*').eq('id', fid).eq('site_id', siteId).single()
  if (!facility || !site) notFound()

  const [
    { data: canEdit }, { data: rf }, { data: pf }, { data: ei },
    { data: cohorts }, { data: cmCohorts }, { data: icp },
    { data: ports }, { data: sc }, { data: lc }, { data: rd }, { data: ehr },
  ] = await Promise.all([
    supabase.rpc('can_edit_site', { p_site_id: siteId }),
    supabase.from('receiving_feeds').select('*').eq('facility_id', fid).single(),
    supabase.from('parsing_feeds').select('*').eq('facility_id', fid).single(),
    supabase.from('epic_integrations').select('*').eq('facility_id', fid).single(),
    supabase.from('facility_cohorts').select('cohort, is_live').eq('facility_id', fid).order('cohort'),
    supabase.from('facility_cm_cohorts').select('cohort, cm_type').eq('facility_id', fid).order('cohort'),
    supabase.from('facility_icp_golive').select('cohort, is_live').eq('facility_id', fid).order('cohort'),
    supabase.from('facility_ports').select('port_number, port_name').eq('facility_id', fid).order('port_number'),
    supabase.from('server_configs').select('*').eq('facility_id', fid).single(),
    supabase.from('letters_config').select('*').eq('facility_id', fid).single(),
    supabase.from('reporting_db').select('*').eq('facility_id', fid).single(),
    supabase.from('ehr_details').select('*').eq('facility_id', fid).single(),
  ])

  const allCohorts  = cohorts ?? []
  const liveCohorts = allCohorts.filter(c => c.is_live)
  const base = `/sites/${siteId}/facilities/${fid}`
  const ed = (section: string) => `${base}?edit=${section}`

  const saveFacility    = updateFacility.bind(null, siteId, fid)
  const saveReceiving   = updateReceivingFeeds.bind(null, siteId, fid)
  const saveParsing     = updateParsingFeeds.bind(null, siteId, fid)
  const saveEpic        = updateEpicIntegrations.bind(null, siteId, fid)
  const saveLetters     = updateLetters.bind(null, siteId, fid)
  const saveCohorts     = updateCohorts.bind(null, siteId, fid)
  const saveEhr         = updateEhrDetails.bind(null, siteId, fid)
  const saveServerCfg   = updateServerConfig.bind(null, siteId, fid)
  const saveReportingDb = updateReportingDb.bind(null, siteId, fid)
  const saveIcp         = updateIcpGolive.bind(null, siteId, fid)
  const saveCmCohorts   = updateCmCohorts.bind(null, siteId, fid)

  const portsDefault = (ports ?? []).map(p => p.port_name ? `${p.port_number}: ${p.port_name}` : p.port_number).join('\n')

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <a href="/sites" className="hover:underline">Sites</a>
        <span className="mx-2">/</span>
        <a href={`/sites/${siteId}`} className="hover:underline">{site.name}</a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{facility.name}</span>
      </nav>

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
        }`}>{facility.is_active ? 'Active' : 'Inactive'}</span>
      </div>

      <div className="grid gap-4">

        {/* ── Facility basics ── */}
        <Section title="Facility" editHref={ed('facility')} isEditing={edit === 'facility'} canEdit={!!canEdit}>
          {edit === 'facility' ? (
            <form action={saveFacility}>
              <EditField label="Name">
                <input name="name" defaultValue={facility.name} required
                  className="w-72 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <EditField label="Campus ID">
                <input name="campus_id" defaultValue={facility.campus_id ?? ''} placeholder="leave blank for null"
                  className="w-48 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <EditField label="Active"><BoolSelect name="is_active" value={facility.is_active} /></EditField>
              <EditField label="SSO"><BoolSelect name="has_sso" value={!!facility.has_sso} /></EditField>
              <EditField label="EHR Index Pattern">
                <input name="ehr_index_pattern" defaultValue={facility.ehr_index_pattern ?? ''}
                  className="w-72 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <EditField label="Implementation Package URL">
                <input name="implementation_package_url" defaultValue={facility.implementation_package_url ?? ''}
                  className="w-96 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <FormActions cancelHref={base} />
            </form>
          ) : (
            <>
              <Field label="EHR Index Pattern">{facility.ehr_index_pattern ?? <span className="text-gray-400">—</span>}</Field>
              <Field label="SSO"><Badge active={!!facility.has_sso} label={facility.has_sso ? 'Yes' : 'No'} /></Field>
              {facility.implementation_package_url && (
                <Field label="Implementation Package">
                  {facility.implementation_package_url.startsWith('https://')
                    ? <a href={facility.implementation_package_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline">{facility.implementation_package_url}</a>
                    : <span className="text-xs text-gray-700">{facility.implementation_package_url}</span>
                  }
                </Field>
              )}
            </>
          )}
        </Section>

        {/* ── EHR Identifiers ── */}
        <Section title="EHR Identifiers" editHref={ed('ehr')} isEditing={edit === 'ehr'} canEdit={!!canEdit}>
          {edit === 'ehr' ? (
            <form action={saveEhr}>
              <EditField label="Facility ID">
                <input name="ehr_facility_id" defaultValue={ehr?.ehr_facility_id ?? ''}
                  className="w-48 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <EditField label="Site ID">
                <input name="ehr_site_id" defaultValue={ehr?.ehr_site_id ?? ''}
                  className="w-48 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <EditField label="Interface ID">
                <input name="ehr_interface_id" defaultValue={ehr?.ehr_interface_id ?? ''}
                  className="w-48 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <FormActions cancelHref={base} />
            </form>
          ) : (
            <>
              <Field label="Facility ID">{ehr?.ehr_facility_id ?? '—'}</Field>
              <Field label="Site ID">{ehr?.ehr_site_id ?? '—'}</Field>
              <Field label="Interface ID">{ehr?.ehr_interface_id ?? '—'}</Field>
            </>
          )}
        </Section>

        {/* ── Receiving feeds ── */}
        {rf && (
          <Section title="Receiving Feeds" editHref={ed('receiving')} isEditing={edit === 'receiving'} canEdit={!!canEdit}>
            {edit === 'receiving' ? (
              <form action={saveReceiving}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                  <GridField label="ADT"><FeedSelect name="adt" value={rf.adt} /></GridField>
                  <GridField label="ORU"><FeedSelect name="oru" value={rf.oru} /></GridField>
                  <GridField label="ORM"><BoolSelect name="orm" value={rf.orm} /></GridField>
                  <GridField label="SIU"><BoolSelect name="siu" value={rf.siu} /></GridField>
                  <GridField label="MDM"><BoolSelect name="mdm" value={rf.mdm} /></GridField>
                  <GridField label="BAR"><BoolSelect name="bar" value={rf.bar} /></GridField>
                  <GridField label="MFN"><BoolSelect name="mfn" value={rf.mfn} /></GridField>
                  <GridField label="Clarity"><BoolSelect name="clarity" value={rf.clarity} /></GridField>
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
          <Section title="Parsing Feeds" editHref={ed('parsing')} isEditing={edit === 'parsing'} canEdit={!!canEdit}>
            {edit === 'parsing' ? (
              <form action={saveParsing}>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                  {([
                    ['parsing_files','Parsing Files'],['adt','ADT'],['oru','ORU'],['orm','ORM'],
                    ['siu','SIU'],['flat_file_scheduling','Flat File Sched.'],['mdm','MDM'],['bar','BAR'],
                    ['mfn','MFN'],['clarity','Clarity'],['physician_clarity','Physician Clarity'],
                    ['exam_clarity','Exam Clarity'],['eon_connect','Eon Connect'],
                  ] as [keyof typeof pf, string][]).map(([key, label]) => (
                    <GridField key={key} label={label}><BoolSelect name={key} value={!!pf[key]} /></GridField>
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
                  <Field key={key} label={label}><Badge active={!!pf[key]} label={pf[key] ? 'Yes' : 'No'} /></Field>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── EPIC Integrations ── */}
        {ei && (
          <Section title="EPIC Integrations" editHref={ed('epic')} isEditing={edit === 'epic'} canEdit={!!canEdit}>
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

        {/* ── Live Cohorts ── */}
        {allCohorts.length > 0 && (
          <Section title="Live Cohorts" editHref={ed('cohorts')} isEditing={edit === 'cohorts'} canEdit={!!canEdit}>
            {edit === 'cohorts' ? (
              <form action={saveCohorts}>
                <div className="flex flex-wrap gap-3">
                  {ALL_COHORTS.map(cohort => {
                    const isLive = allCohorts.find(c => c.cohort === cohort)?.is_live ?? false
                    return (
                      <label key={cohort} className="flex cursor-pointer items-center gap-1.5 text-sm">
                        <input type="checkbox" name={`cohort_${cohort}`} value="true" defaultChecked={isLive}
                          className="rounded border-gray-300" />
                        <span className="capitalize">{cohort.replace(/_/g, ' ')}</span>
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

        {/* ── ICP Go-Live ── */}
        <Section title="ICP Go-Live" editHref={ed('icp')} isEditing={edit === 'icp'} canEdit={!!canEdit}>
          {edit === 'icp' ? (
            <form action={saveIcp}>
              <div className="flex flex-wrap gap-3">
                {ALL_COHORTS.map(cohort => {
                  const isLive = icp?.find(c => c.cohort === cohort)?.is_live ?? false
                  return (
                    <label key={cohort} className="flex cursor-pointer items-center gap-1.5 text-sm">
                      <input type="checkbox" name={`icp_${cohort}`} value="true" defaultChecked={isLive}
                        className="rounded border-gray-300" />
                      <span className="capitalize">{cohort.replace(/_/g, ' ')}</span>
                    </label>
                  )
                })}
              </div>
              <FormActions cancelHref={base} />
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(icp ?? []).length === 0
                ? <p className="text-sm text-gray-400">No ICP data</p>
                : icp!.map(c => (
                    <span key={c.cohort} className={`rounded-full px-3 py-1 text-xs font-medium ${
                      c.is_live ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
                    }`}>{c.cohort}</span>
                  ))}
            </div>
          )}
        </Section>

        {/* ── CM Cohorts ── */}
        <Section title="CM Cohorts" editHref={ed('cm')} isEditing={edit === 'cm'} canEdit={!!canEdit}>
          {edit === 'cm' ? (
            <form action={saveCmCohorts}>
              <div className="overflow-x-auto">
                <table className="text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="pb-2 pr-6 text-left font-medium">Cohort</th>
                      <th className="pb-2 pr-4 text-center font-medium">Hybrid</th>
                      <th className="pb-2 text-center font-medium">Full</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_COHORTS.map(cohort => {
                      const hasHybrid = cmCohorts?.some(c => c.cohort === cohort && c.cm_type === 'hybrid')
                      const hasFull   = cmCohorts?.some(c => c.cohort === cohort && c.cm_type === 'full')
                      return (
                        <tr key={cohort} className="border-t border-gray-100">
                          <td className="py-1 pr-6 capitalize">{cohort.replace(/_/g, ' ')}</td>
                          <td className="py-1 pr-4 text-center">
                            <input type="checkbox" name={`cm_hybrid_${cohort}`} value="true" defaultChecked={!!hasHybrid} />
                          </td>
                          <td className="py-1 text-center">
                            <input type="checkbox" name={`cm_full_${cohort}`} value="true" defaultChecked={!!hasFull} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <FormActions cancelHref={base} />
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(cmCohorts ?? []).length === 0
                ? <p className="text-sm text-gray-400">No CM cohorts</p>
                : cmCohorts!.map(c => (
                    <span key={`${c.cohort}-${c.cm_type}`}
                      className="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                      {c.cohort} ({c.cm_type})
                    </span>
                  ))}
            </div>
          )}
        </Section>

        {/* ── Letters ── */}
        {lc && (
          <Section title="Letters" editHref={ed('letters')} isEditing={edit === 'letters'} canEdit={!!canEdit}>
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

        {/* ── Server & Config ── */}
        <Section title="Server & Config" editHref={ed('server')} isEditing={edit === 'server'} canEdit={!!canEdit}>
          {edit === 'server' ? (
            <form action={saveServerCfg}>
              <EditField label="Server IP">
                <input name="server_ip" defaultValue={sc?.server_ip ?? ''}
                  className="w-48 rounded border border-gray-300 px-2 py-1 text-sm font-mono" />
              </EditField>
              <EditField label="S3 Folder">
                <input name="s3_folder" defaultValue={sc?.s3_folder ?? ''}
                  className="w-72 rounded border border-gray-300 px-2 py-1 text-sm font-mono" />
              </EditField>
              <EditField label="SFTP Folder Link">
                <input name="sftp_folder_link" defaultValue={sc?.sftp_folder_link ?? ''}
                  className="w-96 rounded border border-gray-300 px-2 py-1 text-sm" />
              </EditField>
              <div className="py-1.5">
                <div className="mb-1 flex items-center gap-2">
                  <span className="w-44 shrink-0 text-xs text-gray-500">Ports</span>
                  <span className="text-xs text-gray-400">One per line: <code>port_number: label</code></span>
                </div>
                <textarea name="ports" defaultValue={portsDefault} rows={4}
                  className="ml-44 w-72 rounded border border-gray-300 px-2 py-1 text-sm font-mono" />
              </div>
              <FormActions cancelHref={base} />
            </form>
          ) : (
            <>
              <Field label="Server IP">{sc?.server_ip ?? '—'}</Field>
              <Field label="S3 Folder">
                {sc?.s3_folder ? <code className="rounded bg-gray-100 px-1 text-xs">{sc.s3_folder}</code> : '—'}
              </Field>
              <Field label="SFTP Folder">
                {sc?.sftp_folder_link
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
            </>
          )}
        </Section>

        {/* ── Reporting DB ── */}
        <Section title="Reporting Database" editHref={ed('reporting')} isEditing={edit === 'reporting'} canEdit={!!canEdit}>
          {edit === 'reporting' ? (
            <form action={saveReportingDb}>
              <EditField label="Database Name">
                <input name="db_name" defaultValue={rd?.db_name ?? ''}
                  className="w-72 rounded border border-gray-300 px-2 py-1 text-sm font-mono" />
              </EditField>
              <FormActions cancelHref={base} />
            </form>
          ) : (
            <Field label="Database Name">
              {rd?.db_name ? <code className="rounded bg-gray-100 px-1 text-xs">{rd.db_name}</code> : '—'}
            </Field>
          )}
        </Section>

      </div>
    </main>
  )
}

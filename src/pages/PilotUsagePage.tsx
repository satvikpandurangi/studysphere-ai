import { useState } from 'react'
import { Bot, Database, Gauge, HardDrive, RefreshCw, Users } from 'lucide-react'
import { Button, EmptyState, ErrorNotice, Field, Loading } from '../components/Ui'
import { useLoad } from '../hooks/useLoad'
import { useAuth } from '../context/AuthContext'
import { useInstitution } from '../context/InstitutionContext'
import { workerFetch } from '../lib/api'
import { account } from '../lib/account'
import { pdfAssets } from '../lib/pdfAssets'
import '../account.css'

type Usage = {
  zeroCostMode: boolean; aiConfigured: boolean; day: string; measuredAt: string; users: number; students: number;
  databaseBytes: number; databaseLimitBytes: number; storageBytes: number; storageObjects: number; storageLimitBytes: number;
  apiRequestsToday: number; workerDailyLimit: number; aiRequestsToday: number; aiTokensToday: number;
  aiRequestLimit: number; aiTokenPlanningLimit: number; pdfMaxBytes: number; openPrivacyRequests: number; oldestPrivacyRequestAt: string | null;
}
function bytes(value: number) { if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} GB`; if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MB`; return `${Math.round(value / 1000)} KB` }
function Metric({ icon: Icon, label, value, limit, detail, format = (number) => number.toLocaleString() }: { icon: typeof Database; label: string; value: number; limit: number; detail: string; format?: (number: number) => string }) {
  const percent = limit ? value / limit * 100 : 0
  return <article className={`pilot-metric ${percent >= 70 ? 'warning' : ''}`}><div className="pilot-metric-head"><Icon size={21} /><span>{label}</span></div><strong>{format(value)} <small>/ {format(limit)}</small></strong><div className="pilot-bar" role="meter" aria-label={label} aria-valuenow={Math.min(100, percent)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${percent.toFixed(1)}% of configured limit`}><span style={{ width: `${Math.min(100, percent)}%` }} /></div><p>{detail}</p></article>
}
export function PilotUsagePage() {
  const { profile } = useAuth()
  if (profile?.role !== 'platform_admin' && profile?.role !== 'school_admin') return <div className="page"><ErrorNotice message="Institution administrator access required." /></div>
  return <div className="page pilot-page"><div className="page-title"><h1>{profile.role === 'platform_admin' ? 'Pilot usage' : 'Institution usage'}</h1><p>Measured application usage for your funded institutional delivery.</p></div>{profile.role === 'platform_admin' && <><PlatformUsage /><PdfStoragePanel /></>}<InstitutionUsagePanel /></div>
}
function PlatformUsage() {
  const usage = useLoad(() => workerFetch<Usage>('/pilot/usage', undefined, 'GET'), [])
  return <section><div className="section-heading"><h2>Platform overview</h2><Button variant="secondary" disabled={usage.loading} onClick={() => void usage.reload()}><RefreshCw size={17} />Refresh usage</Button></div>
    {usage.loading ? <Loading label="Loading usage snapshot…" /> : usage.error ? <ErrorNotice message={usage.error} /> : usage.data && <>
      <p className="muted">Measured {new Date(usage.data.measuredAt).toLocaleString()} · Daily counters use UTC ({usage.data.day}).</p>
      <div className="pilot-summary"><div><Users size={22} /><strong>{usage.data.students}</strong><span>student accounts</span></div><div><Users size={22} /><strong>{usage.data.users}</strong><span>total accounts</span></div><div><HardDrive size={22} /><strong>{usage.data.storageObjects}</strong><span>tracked PDFs</span></div><div><Bot size={22} /><strong>{usage.data.aiTokensToday.toLocaleString()}</strong><span>recorded AI tokens today</span></div></div>
      <div className="pilot-grid">
        <Metric icon={Database} label="Database size" value={usage.data.databaseBytes} limit={usage.data.databaseLimitBytes} format={bytes} detail="Measured database size against a planning ceiling; writes are not capped by this meter." />
        <Metric icon={HardDrive} label="Tracked PDF storage" value={usage.data.storageBytes} limit={usage.data.storageLimitBytes} format={bytes} detail="Content metadata total, including drafts. Reconcile actual bucket objects and orphaned uploads separately." />
        <Metric icon={Gauge} label="Quota-counted API actions today" value={usage.data.apiRequestsToday} limit={usage.data.workerDailyLimit} detail="Authenticated Worker quota reservations. Excludes direct Supabase, static traffic and platform monitoring reads." />
        <Metric icon={Bot} label="AI reservations today" value={usage.data.aiRequestsToday} limit={usage.data.aiRequestLimit} detail="Reserved requests, including provider failures after reservation. Optional AI availability is separate from these counts." />
      </div>
      <div className="notice"><span>Application limits are not provider allowances or a billing guarantee. PDF maximum: {bytes(usage.data.pdfMaxBytes)}. Optional AI key: {usage.data.aiConfigured ? 'configured; provider health and funded allowance need verification' : 'not configured'}. The legacy zero-cost flag is {usage.data.zeroCostMode ? 'on' : 'off'}; it does not control provider billing. At 70% usage, review capacity and the institution's agreed budget.</span></div>
      <section className="form-panel pilot-checks"><h2>Operator follow-up</h2><p>{usage.data.openPrivacyRequests} open privacy requests{usage.data.oldestPrivacyRequestAt ? ` · Oldest: ${new Date(usage.data.oldestPrivacyRequestAt).toLocaleDateString()}` : ''}.</p><ul><li>Compare database, storage, transfer and hosting totals with provider dashboards.</li><li>Confirm email delivery, backups/restore, support ownership and funded limits.</li><li>Run the pilot acceptance checks and record hosted evidence before inviting learners.</li></ul></section>
    </>}
  </section>
}
function PdfStoragePanel() {
  const usage = useLoad(pdfAssets.storage, [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  return <section className="form-panel pilot-checks"><div className="section-heading"><h2>PDF storage accounting</h2><Button variant="ghost" disabled={busy || usage.loading} aria-label="Refresh PDF storage" onClick={() => void usage.reload()}><RefreshCw size={18} /></Button></div>
    {usage.loading ? <Loading /> : usage.error ? <ErrorNotice message={usage.error} /> : usage.data && <>
      <Metric icon={HardDrive} label="Accounted PDF storage" value={usage.data.accountedBytes} limit={usage.data.storageLimitBytes} format={bytes} detail="Includes active attachments, pending/uncertain uploads, files held for review and queued cleanup." />
      <p>Active: {bytes(usage.data.activeBytes)} · Pending: {bytes(usage.data.pendingBytes)} · Queued cleanup: {usage.data.cleanupObjects} objects.</p>
      <p>{usage.data.reservedUploads} reserved uploads · {usage.data.uncertainUploads} uncertain outcomes · {usage.data.unverifiedObjects} unverified sizes · {usage.data.heldObjects ?? 0} objects held for review. Uploads {usage.data.uploadsPaused ? 'paused' : 'not paused'}.</p>
      <Button variant="secondary" disabled={busy || !usage.data.cleanupObjects} onClick={async () => {
        setBusy(true); setError(null); setMessage('')
        try { const result = await pdfAssets.cleanup(); setMessage(`Objects with confirmed cleanup: ${result.removed}. Objects needing another attempt: ${result.failed}. Uncertain uploads require inventory review.`); await usage.reload() }
        catch (e) { setError(e instanceof Error ? e.message : 'Cleanup failed.') } finally { setBusy(false) }
      }}>Retry queued cleanup</Button>
      <p>Retries up to 20 confirmed, unreferenced objects. Uncertain writes remain charged until the operator verifies storage inventory and settled writes.</p>
    </>}
    <ErrorNotice message={error} />{message && <div className="notice" role="status">{message}</div>}
  </section>
}
function InstitutionUsagePanel() {
  const institutions = useInstitution()
  const [school, setSchool] = useState('')
  const managed = institutions.workspaces.filter(row => row.can_manage)
  const chosen = managed.length === 1 ? managed[0] : managed.find(row => row.id === school)
  const usage = useLoad(() => chosen ? account.institutionUsage(chosen.id) : Promise.resolve(null), [chosen?.id])
  return <section className="form-panel pilot-checks"><div className="section-heading"><h2>Institution totals</h2><Button variant="ghost" disabled={!chosen || usage.loading} aria-label="Refresh institution usage" onClick={() => void usage.reload()}><RefreshCw size={18} /></Button></div>
    <ErrorNotice message={institutions.error} />{managed.length > 1 && <Field label="Institution usage scope"><select value={chosen?.id ?? ''} disabled={institutions.loading} onChange={e => setSchool(e.target.value)}><option value="">Choose institution</option>{managed.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field>}
    {!chosen ? <EmptyState title="Choose an institution" description="Only administrators can view these aggregate totals." /> : usage.loading ? <Loading /> : usage.error ? <ErrorNotice message={usage.error} /> : usage.data && <>
      <p>Measured {new Date(usage.data.measuredAt).toLocaleString()}.</p><div className="pilot-summary"><div><Users size={22} /><strong>{usage.data.activeStudents}</strong><span>active approved enrollments</span></div><div><Users size={22} /><strong>{usage.data.staff}</strong><span>staff memberships</span></div><div><Database size={22} /><strong>{usage.data.publishedMaterials}</strong><span>published material items</span></div><div><HardDrive size={22} /><strong>{bytes(usage.data.trackedPdfBytes)}</strong><span>tracked PDF storage</span></div></div><p>{usage.data.draftMaterials} draft material items · {usage.data.publishedQuizzes} published quizzes · {usage.data.publishedFlashcards} published flashcards.</p>
    </>}
    <p>These are aggregate content/enrollment totals, not invoices or individual learning histories. Shared API/AI traffic is not attributed to institutions here.</p>
  </section>
}

import { useEffect, useState, type FormEvent } from 'react'
import { GraduationCap, RefreshCw, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useInstitution } from '../context/InstitutionContext'
import { Button, EmptyState, ErrorNotice, Field, Loading } from '../components/Ui'
import { branding, brandingStyle, defaultBranding, readBrandLogo, whiteContrast, type BrandingSettings, type InstitutionWorkspace } from '../lib/branding'
import '../branding.css'

export function InstitutionSettingsPage() {
  const { profile } = useAuth()
  const institutions = useInstitution()
  const [school, setSchool] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const allowed = profile?.role === 'school_admin' || profile?.role === 'platform_admin'
  const managed = institutions.workspaces.filter(row => row.can_manage)
  const workspace = managed.length === 1 ? managed[0] : managed.find(row => row.id === school)
  if (!allowed) return <div className="page"><EmptyState title="School administrator access required" description="Your institution administrator manages workspace branding and contact details." /></div>
  return <div className="page">
    <div className="section-heading page-heading"><div><h1>Institution settings</h1><p>Your identity and support details, in the familiar StudySphere workspace.</p></div><Button variant="ghost" onClick={() => void institutions.refresh()} disabled={institutions.loading} aria-label="Refresh institutions"><RefreshCw size={18} /></Button></div>
    <ErrorNotice message={institutions.error} />
    {institutions.loading ? <Loading /> : <>
      {managed.length > 1 && <section className="form-panel branding-picker"><Field label="Institution to configure"><select value={workspace?.id ?? ''} onChange={e => {
        if (!hasChanges || window.confirm('Discard the unsaved branding changes?')) setSchool(e.target.value)
      }}><option value="">Choose institution</option>{managed.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></Field></section>}
      {workspace ? <BrandingEditor key={workspace.id} workspace={workspace} onDirty={setHasChanges} /> : <EmptyState title="Choose your institution" description="Only institutions you administer can be configured here." />}
    </>}
  </div>
}

function BrandingEditor({ workspace, onDirty }: { workspace: InstitutionWorkspace; onDirty: (value: boolean) => void }) {
  const institutions = useInstitution()
  const [settings, setSettings] = useState<BrandingSettings>(workspace.branding ?? { ...defaultBranding })
  const [version, setVersion] = useState(workspace.branding?.version ?? 0)
  const [saved, setSaved] = useState(JSON.stringify(workspace.branding ?? defaultBranding))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  // Compare editable fields only; stored metadata does not make a clean form dirty.
  const editable = (value: BrandingSettings) => JSON.stringify(Object.fromEntries(Object.keys(defaultBranding).map(key => [key, value[key as keyof BrandingSettings]])))
  const dirty = editable(settings) !== editable(JSON.parse(saved) as BrandingSettings)
  useEffect(() => { onDirty(dirty) }, [dirty, onDirty])
  const primaryValid = whiteContrast(settings.primary_color) >= 4.5
  const accentValid = whiteContrast(settings.accent_color) >= 3
  function change<K extends keyof BrandingSettings>(key: K, value: BrandingSettings[K]) { setSettings(current => ({ ...current, [key]: value })); setMessage('') }
  async function reload() {
    if (dirty && !window.confirm('Discard the unsaved changes and load the latest saved settings?')) return
    setBusy(true); setError(null); setMessage('')
    try {
      const rows = await branding.workspaces()
      const current = rows.find(row => row.id === workspace.id && row.can_manage)
      if (!current) { await institutions.refresh(); throw new Error('Administrator access to this institution is no longer available.') }
      const latest = current.branding ?? { ...defaultBranding }
      setSettings(latest); setSaved(JSON.stringify(latest)); setVersion(current.branding?.version ?? 0); setMessage('Saved settings loaded.')
      await institutions.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load saved settings.') } finally { setBusy(false) }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage('')
    try {
      const fields = JSON.parse(editable(settings)) as BrandingSettings
      const result = await branding.save(workspace.id, fields, version)
      setSettings(result); setSaved(JSON.stringify(result)); setVersion(result.version)
      setMessage('Institution settings saved. Branding appears automatically for members of this school.')
      await institutions.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save settings.') } finally { setBusy(false) }
  }
  return <div className="branding-layout">
    <form className="form-panel" data-branding-dirty={dirty} onSubmit={save}>
      <h2>Identity</h2><p>The display name changes presentation. Your school record and enrollment permissions stay the same.</p>
      <fieldset className="branding-fields" disabled={busy}>
        <Field label="Institution display name" hint={`Leave blank to use ${workspace.name}.`}><input maxLength={100} value={settings.display_name ?? ''} onChange={e => change('display_name', e.target.value || null)} /></Field>
        <Field label="Institution logo" hint="PNG, JPEG or WebP, up to 96 KB and 1024 × 1024 pixels. Use an institution-approved image."><input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ''; if (!file) return
          setBusy(true); setError(null)
          try { change('logo_data_url', await readBrandLogo(file)) } catch (e) { setError(e instanceof Error ? e.message : 'Could not load logo.') } finally { setBusy(false) }
        }} /></Field>
        {settings.logo_data_url && <Button type="button" variant="ghost" onClick={() => change('logo_data_url', null)}>Remove logo</Button>}
        <h2>Colors</h2>
        <div className="form-grid">
          <Field label="Primary color" hint="Buttons and links. Minimum 4.5:1 contrast with white."><input type="color" value={settings.primary_color} onChange={e => change('primary_color', e.target.value)} /></Field>
          <Field label="Accent color" hint="Decorative icons. Minimum 3:1 contrast with white."><input type="color" value={settings.accent_color} onChange={e => change('accent_color', e.target.value)} /></Field>
        </div>
        {(!primaryValid || !accentValid) && <ErrorNotice message="Choose darker colors for readable buttons and visible icons." />}
        <h2>Contact details</h2><p>Shown to authorized members in the sidebar.</p>
        <Field label="Support email"><input type="email" maxLength={254} value={settings.support_email ?? ''} onChange={e => change('support_email', e.target.value || null)} /></Field>
        <Field label="Support phone" hint="Include the country code where possible."><input type="tel" maxLength={40} value={settings.support_phone ?? ''} onChange={e => change('support_phone', e.target.value || null)} /></Field>
        <Field label="Institution website" hint="Use a complete https:// address."><input type="url" maxLength={500} pattern="https://.*" value={settings.website ?? ''} onChange={e => change('website', e.target.value || null)} /></Field>
      </fieldset>
      <ErrorNotice message={error} />{message && <div className="notice success" role="status">{message}</div>}
      <div className="button-row"><Button disabled={busy || !dirty || !primaryValid || !accentValid}>{busy ? 'Working…' : 'Save settings'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => void reload()}>Load saved settings</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => { setSettings({ ...defaultBranding }); setMessage('Defaults loaded in the preview. Save settings to apply them.'); setError(null) }}>Reset customization</Button></div>
      <p>{dirty ? 'Unsaved changes' : 'All changes saved'} · Settings version {version}</p>
    </form>
    <section className="form-panel branding-preview institution-theme" style={brandingStyle(settings)} aria-label="Branding preview">
      <h2>Preview</h2><p>Preview changes before saving.</p>
      <div className="brand">{settings.logo_data_url ? <img className="institution-logo" src={settings.logo_data_url} alt="" /> : <div className="brand-icon"><GraduationCap size={27} /></div>}<div><strong>{settings.display_name?.trim() || workspace.name}</strong><small>Powered by StudySphere</small></div></div>
      <div className="button-row"><Button type="button">Primary button</Button></div><div className="sidebar-message"><Sparkles size={19} /><span>Small steps create big futures.</span></div>
      <div className="institution-contact">{settings.support_email && <span>{settings.support_email}</span>}{settings.support_phone && <span>{settings.support_phone}</span>}{settings.website && <span>{settings.website}</span>}</div>
    </section>
  </div>
}

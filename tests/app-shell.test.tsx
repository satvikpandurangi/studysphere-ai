import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import type { Role } from '../src/lib/types'
import { AppShell } from '../src/components/AppShell'

const state = vi.hoisted(() => ({ role: 'student' as Role, active: true, error: null as string | null }))
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => ({ profile: { role: state.role, full_name: 'Synthetic Member' }, user: { email: 'member@example.test' } }) }))
vi.mock('../src/context/InstitutionContext', () => ({ useInstitution: () => ({ active: state.active ? { name: 'Verified School', branding: null } : null, error: state.error, refresh: vi.fn() }) }))
const screen = () => renderToStaticMarkup(<MemoryRouter><AppShell><p>Page content</p></AppShell></MemoryRouter>)

describe('institution member navigation', () => {
  it('never offers members a branding selector and shows their assigned school', () => {
    state.active = true
    for (const role of ['student', 'parent', 'editor', 'school_admin', 'platform_admin'] as const) {
      state.role = role
      const html = screen()
      expect(html).not.toContain('<select')
      expect(html).not.toContain('Workspace branding')
      expect(html).toContain('Verified School')
      expect(html).toContain('Page content')
    }
  })
  it('keeps administrative links away from teachers while keeping authoring available', () => {
    state.role = 'editor'
    const html = screen()
    for (const route of ['enrollments', 'institution-settings', 'privacy-requests', 'pilot-usage', 'schools']) expect(html).not.toContain(`href="/app/${route}"`)
    expect(html).toContain('href="/app/content"')
    expect(html).toContain('href="/app/assessments"')
    expect(html).toContain('Teacher')
    state.role = 'school_admin'
    expect(screen()).toContain('href="/app/enrollments"')
  })
  it('keeps the page available when school branding cannot be loaded', () => {
    state.active = false; state.error = 'Synthetic provider failure'
    expect(screen()).toContain('Retry school details')
    expect(screen()).toContain('Page content')
    state.error = null
  })
})

import { describe, expect, it, vi } from 'vitest'
import { automaticInstitution, branding, defaultBranding, whiteContrast, type InstitutionWorkspace } from '../src/lib/branding'
const mockRpc = vi.hoisted(() => vi.fn())
vi.mock('../src/lib/supabase', () => ({ requireSupabase: () => ({ rpc: mockRpc }) }))

describe('brand color readability', () => {
  it('keeps existing primary and accent defaults within their usage thresholds', () => {
    expect(whiteContrast(defaultBranding.primary_color)).toBeGreaterThanOrEqual(4.5)
    expect(whiteContrast(defaultBranding.accent_color)).toBeGreaterThanOrEqual(3)
  })
  it('rejects malformed colors and identifies unreadable white/yellow choices', () => {
    expect(whiteContrast('red')).toBe(0)
    expect(whiteContrast('#fff')).toBe(0)
    expect(whiteContrast('#ffffff')).toBeCloseTo(1)
    expect(whiteContrast('#ffff00')).toBeLessThan(3)
    expect(whiteContrast('#000000')).toBeCloseTo(21)
  })
})

describe('in-memory logo reuse', () => {
  const saved: InstitutionWorkspace = { id: 'school-a', name: 'A', can_manage: false, branding: { ...defaultBranding, school_id: 'school-a', version: 1, updated_at: '', logo_data_url: 'data:image/png;base64,AAAA' } }
  it('reuses only an authorized matching edition and retrieves changed logos', async () => {
    const { logo_data_url: _logo, ...unchanged } = saved.branding!
    void _logo
    mockRpc.mockResolvedValueOnce({ data: [{ ...saved, branding: unchanged }], error: null })
    expect((await branding.workspaces([saved]))[0].branding?.logo_data_url).toBe(saved.branding?.logo_data_url)
    expect(mockRpc).toHaveBeenLastCalledWith('institution_workspaces', { known_versions: { 'school-a': 1 } })
    mockRpc.mockResolvedValueOnce({ data: [{ ...saved, branding: { ...unchanged, version: 2, logo_data_url: null } }], error: null })
    expect((await branding.workspaces([saved]))[0].branding?.logo_data_url).toBeNull()
  })
  it('drops revoked institutions instead of returning cached branding', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null })
    expect(await branding.workspaces([saved])).toEqual([])
  })
})

describe('automatic institution identity', () => {
  const school: InstitutionWorkspace = { id: 'verified-school', name: 'Verified School', can_manage: false, branding: null }
  it('uses a single authorized school for student, guardian, teacher and school administrator', () => {
    for (const role of ['student', 'parent', 'editor', 'school_admin'] as const) expect(automaticInstitution([school], role)).toBe(school)
  })
  it('keeps unaffiliated, revoked, ambiguous and platform accounts neutral', () => {
    expect(automaticInstitution([], 'student')).toBeNull()
    expect(automaticInstitution([school, { ...school, id: 'another-school' }], 'parent')).toBeNull()
    expect(automaticInstitution([school], 'platform_admin')).toBeNull()
    expect(automaticInstitution([school])).toBeNull()
  })
})

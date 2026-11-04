import { beforeEach, describe, expect, it, vi } from 'vitest'
const fixture = vi.hoisted(() => ({ role: 'student', callerRpc: vi.fn(), reserve: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: (_url: string, key: string) => key === 'secret-test-key' ? {
  from: () => ({ select() { return this }, eq() { return this }, single: async () => ({ data: { id: '80000000-0000-4000-8000-000000000002', role: fixture.role }, error: null }) }),
  rpc: fixture.reserve,
} : { auth: { getUser: async () => ({ data: { user: { id: '80000000-0000-4000-8000-000000000002' } }, error: null }) }, rpc: fixture.callerRpc } }))
import api from './index'
const env = { APP_ORIGIN: 'https://app.example.test', SUPABASE_URL: 'https://db.example.test', SUPABASE_PUBLISHABLE_KEY: 'public-test-key', SUPABASE_SECRET_KEY: 'secret-test-key' } as Parameters<typeof api.fetch>[1]
function request(path: string, body?: object) { return new Request(`https://api.example.test${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }) }
beforeEach(() => { fixture.role = 'student'; fixture.callerRpc.mockReset().mockResolvedValue({ data: { id: 'request', existing: false }, error: null }); fixture.reserve.mockReset().mockResolvedValue({ data: true, error: null }) })
describe('account and operational Worker boundaries', () => {
  it('delegates privacy requests with caller identity and ignores forged requester/status fields', async () => {
    const response = await api.fetch(request('/privacy/request', { kind: 'delete', requestedBy: 'forged', status: 'fulfilled' }), env)
    expect(response.status).toBe(200)
    expect(fixture.callerRpc).toHaveBeenCalledWith('request_account_privacy', { request_kind: 'delete', target_user: null })
  })
  it('rejects malformed requests and returns database guardian/verification errors', async () => {
    expect((await api.fetch(request('/privacy/request', { kind: 'other' }), env)).status).toBe(400)
    expect(fixture.callerRpc).not.toHaveBeenCalled()
    fixture.callerRpc.mockResolvedValue({ data: null, error: { message: 'Verified account holder or linked guardian required' } })
    const response = await api.fetch(request('/privacy/request', { kind: 'export', targetUser: '80000000-0000-4000-8000-000000000004' }), env)
    expect((await response.json() as { error: string }).error).toContain('linked guardian')
  })
  it('requires platform authority to review and delegates atomic confirmation checks', async () => {
    const body = { id: '80000000-0000-4000-8000-000000000004', status: 'fulfilled', processedExternally: true }
    expect((await api.fetch(request('/privacy/review', body), env)).status).toBe(400)
    expect(fixture.callerRpc).not.toHaveBeenCalled()
    fixture.role = 'platform_admin'
    expect((await api.fetch(request('/privacy/review', body), env)).status).toBe(200)
    expect(fixture.callerRpc).toHaveBeenCalledWith('review_account_privacy', { request_id: body.id, new_status: 'fulfilled', export_delivered: true })
  })
  it('keeps authenticated platform monitoring available when the Worker quota is exhausted', async () => {
    fixture.role = 'platform_admin'; fixture.reserve.mockResolvedValue({ data: false, error: null })
    fixture.callerRpc.mockResolvedValue({ data: { users: 1100, aiRequestsToday: 1100, day: '2026-10-22' }, error: null })
    const response = await api.fetch(request('/pilot/usage'), env)
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(fixture.reserve).not.toHaveBeenCalled()
    expect(fixture.callerRpc).toHaveBeenCalledWith('platform_usage_snapshot')
    expect((await response.json() as { aiRequestsToday: number }).aiRequestsToday).toBe(1100)
  })
  it('does not expose platform monitoring to school admins, students or parents', async () => {
    for (const role of ['school_admin', 'student', 'parent']) {
      fixture.role = role
      expect((await api.fetch(request('/pilot/usage'), env)).status).toBe(400)
    }
    expect(fixture.callerRpc).not.toHaveBeenCalled()
  })
})

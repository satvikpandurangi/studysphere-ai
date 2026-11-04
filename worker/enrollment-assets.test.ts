import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixture = vi.hoisted(() => ({ visible: true, download: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, key: string) => key === 'secret-test-key' ? {
    from: () => ({ select() { return this }, eq() { return this }, single: async () => ({ data: { id: 'student', role: 'student', full_name: 'Student' }, error: null }) }),
    rpc: async () => ({ data: true, error: null }),
    storage: { from: () => ({ download: fixture.download }) },
  } : {
    auth: { getUser: async () => ({ data: { user: { id: 'student' } }, error: null }) },
    from: () => ({ select() { return this }, eq() { return this }, single: async () => fixture.visible
      ? { data: { object_key: 'private.pdf', kind: 'pdf', status: 'published' }, error: null }
      : { data: null, error: { message: 'Not visible under RLS' } } }),
  },
}))
import api from './index'

const env = {
  APP_ORIGIN: 'https://app.example.test', SUPABASE_URL: 'https://database.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key', SUPABASE_SECRET_KEY: 'secret-test-key',
} as Parameters<typeof api.fetch>[1]
const request = () => new Request('https://api.example.test/assets/00000000-0000-4000-8000-000000000001', { headers: { Authorization: 'Bearer synthetic-token' } })

beforeEach(() => {
  fixture.visible = true
  fixture.download.mockReset().mockResolvedValue({ data: new Blob(['%PDF-1.7 synthetic test document']), error: null })
})
describe('private PDFs after enrollment changes', () => {
  it('checks caller visibility and returns authorized files without caching', async () => {
    const response = await api.fetch(request(), env)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(fixture.download).toHaveBeenCalledOnce()
  })
  it('does not fetch a private object after caller RLS denies access', async () => {
    fixture.visible = false
    const response = await api.fetch(request(), env)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'PDF unavailable' })
    expect(fixture.download).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
const fixture = vi.hoisted(() => ({ role: 'student', rpc: vi.fn(), adminTables: [] as string[] }))
const userId = '40000000-0000-4000-8000-000000000001'
const quizId = '40000000-0000-4000-8000-000000000002'
vi.mock('@supabase/supabase-js', () => ({ createClient: (_url: string, key: string) => key === 'secret-test-key' ? {
  from: (table: string) => {
    fixture.adminTables.push(table)
    return { select() { return this }, eq() { return this }, single: async () => ({ data: table === 'profiles' ? { id: '40000000-0000-4000-8000-000000000001', role: fixture.role, full_name: 'Synthetic user' } : { school_id: 'school', approval_status: 'approved' }, error: null }) }
  },
  rpc: async () => ({ data: true, error: null }),
} : { auth: { getUser: async () => ({ data: { user: { id: '40000000-0000-4000-8000-000000000001' } }, error: null }) }, rpc: fixture.rpc } }))
import api from './index'
const env = { APP_ORIGIN: 'https://app.example.test', SUPABASE_URL: 'https://db.example.test', SUPABASE_PUBLISHABLE_KEY: 'public-test-key', SUPABASE_SECRET_KEY: 'secret-test-key' } as Parameters<typeof api.fetch>[1]
function request(path: string, body: object) { return new Request(`https://api.example.test${path}`, { method: 'POST', headers: { Authorization: 'Bearer synthetic-token', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) }
beforeEach(() => { fixture.role = 'student'; fixture.adminTables.length = 0; fixture.rpc.mockReset() })

describe('assessment Worker boundary', () => {
  it('grades through the caller-scoped atomic RPC without privileged answer reads', async () => {
    const result = { attemptId: 'saved', score: 1, total: 1, quizVersion: 2, feedback: [] }
    fixture.rpc.mockResolvedValue({ data: result, error: null })
    const response = await api.fetch(request('/quiz/grade', { quizId, studentId: userId, version: 2, answers: [1], score: 999 }), env)
    expect(response.status).toBe(200); expect(await response.json()).toEqual(result)
    expect(fixture.rpc).toHaveBeenCalledWith('submit_quiz', { target_quiz: quizId, expected_version: 2, submitted_answers: [1] })
    expect(fixture.adminTables).not.toContain('quiz_questions')
    expect(fixture.adminTables).not.toContain('quiz_attempts')
  })
  it('rejects another student ID or malformed answers before submitting', async () => {
    for (const body of [{ quizId, studentId: quizId, answers: [1] }, { quizId, studentId: userId, answers: [] }, { quizId, studentId: userId, answers: [0.5] }]) {
      expect((await api.fetch(request('/quiz/grade', body), env)).status).toBe(400)
    }
    expect(fixture.rpc).not.toHaveBeenCalled()
  })
  it('returns a clear unavailable message when access/publication changed', async () => {
    fixture.rpc.mockResolvedValue({ data: null, error: { message: 'Quiz unavailable' } })
    const response = await api.fetch(request('/quiz/grade', { quizId, studentId: userId, answers: [1] }), env)
    expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: 'Quiz unavailable' })
  })
  it('uses the authenticated save/publish transaction for legacy create routes', async () => {
    fixture.role = 'editor'; fixture.rpc.mockResolvedValue({ data: { id: quizId }, error: null })
    const response = await api.fetch(request('/quizzes/create', { topicId: quizId, schoolId: null, title: 'Quiz', questions: [], publish: true }), env)
    expect(response.status).toBe(200)
    expect(fixture.rpc).toHaveBeenCalledWith('save_assessment', expect.objectContaining({ assessment_kind: 'quiz', target_school: null, publish_now: true }))
    expect(fixture.adminTables).toEqual(['profiles'])
  })
})

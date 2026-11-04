import { requireSupabase } from './supabase'

export type AssessmentKind = 'quiz' | 'flashcard'
export type QuizDraftQuestion = { prompt: string; options: string[]; correctIndex: number; explanation: string }
export type AssessmentRow = {
  id: string; topic_id: string; school_id: string | null; title: string; status: 'draft' | 'published'
  series_id: string; version: number; edit_version: number; published_at: string | null; updated_at: string
}
export type AssessmentDetail = AssessmentRow & { front?: string; back?: string; questions?: QuizDraftQuestion[] }
export type AssessmentList = { quizzes: AssessmentRow[]; flashcards: AssessmentRow[] }
export type QuizFeedback = { questionId: string; prompt: string; options: string[]; selectedIndex: number; correctIndex: number; explanation: string }
export type QuizResult = { attemptId: string; score: number; total: number; quizTitle: string; quizVersion: number; feedback: QuizFeedback[] }
export type QuizAttempt = { id: string; quiz_id: string; quiz_title: string; quiz_version: number; score: number; total: number; created_at: string; feedback: QuizFeedback[] | null }

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireSupabase().rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}
export const assessments = {
  list: (topic: string, school: string | null) => rpc<AssessmentList>('assessment_list', { target_topic: topic, target_school: school }),
  detail: (kind: AssessmentKind, id: string) => rpc<AssessmentDetail>('assessment_detail', { assessment_kind: kind, assessment_id: id }),
  save: (kind: AssessmentKind, topic: string, school: string | null, data: object, record: AssessmentDetail | null) => rpc<AssessmentDetail>('save_assessment', {
    assessment_kind: kind, target_topic: topic, target_school: school, assessment_data: data,
    assessment_id: record?.id ?? null, expected_edit: record?.edit_version ?? null,
  }),
  revise: (kind: AssessmentKind, record: AssessmentDetail) => rpc<AssessmentDetail>('copy_assessment_draft', { assessment_kind: kind, assessment_id: record.id, expected_edit: record.edit_version }),
  publish: (kind: AssessmentKind, record: AssessmentDetail, publish: boolean) => rpc<AssessmentDetail>('set_assessment_status', { assessment_kind: kind, assessment_id: record.id, expected_edit: record.edit_version, publish }),
  history: async (studentId: string) => {
    const { data, error } = await requireSupabase().from('quiz_attempts').select('id,quiz_id,quiz_title,quiz_version,score,total,created_at,feedback').eq('student_id', studentId).order('created_at', { ascending: false }).limit(20)
    if (error) throw error
    return data as QuizAttempt[]
  },
}
export const assessmentStatus = (row: Pick<AssessmentRow, 'status' | 'published_at'>) => row.status === 'published' ? 'Published' : row.published_at ? 'Unpublished' : 'Draft'
export const blankQuestion = (): QuizDraftQuestion => ({ prompt: '', options: ['', '', '', ''], correctIndex: 0, explanation: '' })

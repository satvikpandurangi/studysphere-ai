import { requireSupabase } from './supabase'
import type { Board, Chapter, ContentItem, Flashcard, Grade, PlanItem, Profile, Question, Quiz, School, StudentProfile, Subject, Topic } from './types'

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null) throw new Error('No data returned')
  return result.data
}

export const db = {
  profile: async (id: string) => unwrap<Profile>(await requireSupabase().from('profiles').select('*').eq('id', id).single()),
  updateName: async (id: string, full_name: string) => unwrap<Profile>(await requireSupabase().from('profiles').update({ full_name }).eq('id', id).select().single()),
  schools: async () => unwrap<School[]>(await requireSupabase().from('schools').select('id,name,city,state').eq('active', true).order('name')),
  boards: async () => unwrap<Board[]>(await requireSupabase().from('boards').select('*').order('name')),
  grades: async () => unwrap<Grade[]>(await requireSupabase().from('grades').select('*').order('number')),
  subjects: async (boardId: string, gradeId: string) => unwrap<Subject[]>(await requireSupabase().from('subjects').select('*').eq('board_id', boardId).eq('grade_id', gradeId).order('name')),
  assignedSubjects: async (studentId:string,boardId:string,gradeId:string) => {
    const [catalog,links]=await Promise.all([
      requireSupabase().from('subjects').select('*').eq('board_id',boardId).eq('grade_id',gradeId).order('name'),
      requireSupabase().from('student_subjects').select('subject_id').eq('student_id',studentId),
    ])
    if(catalog.error)throw catalog.error
    if(links.error)throw links.error
    const ids=new Set(links.data?.map(x=>x.subject_id)||[])
    return (catalog.data||[]).filter(s=>ids.has(s.id)) as Subject[]
  },
  studentProfile: async (id: string) => unwrap<StudentProfile>(await requireSupabase().from('student_profiles').select('*').eq('user_id', id).single()),
  chapters: async (subjectId: string) => unwrap<Chapter[]>(await requireSupabase().from('chapters').select('*').eq('subject_id', subjectId).order('position')),
  topics: async (chapterId: string) => unwrap<Topic[]>(await requireSupabase().from('topics').select('*').eq('chapter_id', chapterId).order('position')),
  content: async (topicId: string) => unwrap<ContentItem[]>(await requireSupabase().from('content_items').select('*').eq('topic_id', topicId).eq('status', 'published').order('position')),
  staffContent: async (topicId: string) => unwrap<ContentItem[]>(await requireSupabase().from('content_items').select('*').eq('topic_id', topicId).order('position')),
  revisions: async (contentId:string) => unwrap<{id:number;snapshot:ContentItem;changed_at:string}[]>(await requireSupabase().from('content_revisions').select('id,snapshot,changed_at').eq('content_id',contentId).order('changed_at',{ascending:false}).limit(15)),
  saveContent: async (item: Partial<ContentItem> & Pick<ContentItem,'topic_id'|'kind'|'title'>, expectedVersion?: number) => {
    const client=requireSupabase(); const {data:{user}}=await client.auth.getUser(); if(!user)throw new Error('Sign in again.')
    const {id,...fields}=item
    if(id){
      let update=client.from('content_items').update({...fields,author_id:user.id}).eq('id',id)
      if(expectedVersion!==undefined)update=update.eq('version',expectedVersion)
      const result=await update.select().maybeSingle()
      if(result.error)throw new Error(result.error.message)
      if(!result.data)throw new Error('Content changed or access was removed. Reload the saved item before publishing.')
      return result.data as ContentItem
    }
    return unwrap<ContentItem>(await client.from('content_items').insert({...fields,author_id:user.id}).select().single())
  },
  flashcards: async (topicId: string) => unwrap<Flashcard[]>(await requireSupabase().from('flashcards').select('*').eq('topic_id', topicId)),
  quiz: async (topicId: string) => unwrap<Quiz>(await requireSupabase().from('quizzes').select('*').eq('topic_id', topicId).eq('status', 'published').limit(1).single()),
  questions: async (quizId: string) => unwrap<Question[]>(await requireSupabase().from('quiz_questions').select('id,quiz_id,prompt,options,position').eq('quiz_id', quizId).order('position')),
  plan: async (studentId: string) => unwrap<PlanItem[]>(await requireSupabase().from('plan_items').select('*').eq('student_id',studentId).order('due_date')),
  savePlanItem: async (item: Partial<PlanItem> & Pick<PlanItem,'student_id'|'title'|'due_date'>) => unwrap<PlanItem>(await requireSupabase().from('plan_items').upsert(item).select().single()),
  createPlanItems: async (items: Pick<PlanItem,'student_id'|'title'|'due_date'|'subject_id'>[]) => unwrap<PlanItem[]>(await requireSupabase().from('plan_items').insert(items).select()),
  updatePlanItem: async (id:string,title:string,due_date:string) => unwrap<PlanItem>(await requireSupabase().from('plan_items').update({title,due_date}).eq('id',id).select().single()),
  deletePlanItem: async (id:string) => { const {error}=await requireSupabase().from('plan_items').delete().eq('id',id); if(error)throw error },
  completePlanItem: async (id: string, completed: boolean) => unwrap<PlanItem>(await requireSupabase().from('plan_items').update({completed_at:completed ? new Date().toISOString() : null}).eq('id',id).select().single()),
  saveMindMap: async (student_id: string, topic_id: string | null, graph: object) => unwrap(await requireSupabase().from('mind_maps').upsert({student_id,topic_id,graph},{onConflict:'student_id,topic_id'}).select().single()),
  mindMap: async (studentId: string, topicId: string | null) => unwrap(await requireSupabase().from('mind_maps').select('*').eq('student_id',studentId).is('topic_id',topicId).maybeSingle()),
  reviewCard: async (student_id:string, flashcard_id:string, rating:number, due_at:string) => unwrap(await requireSupabase().from('flashcard_reviews').upsert({student_id,flashcard_id,rating,due_at,reviewed_at:new Date().toISOString()},{onConflict:'student_id,flashcard_id'}).select().single()),
  saveProgress: async (student_id:string, topic_id:string) => unwrap(await requireSupabase().from('topic_progress').upsert({student_id,topic_id,completed_at:new Date().toISOString()},{onConflict:'student_id,topic_id'}).select().single()),
}

export async function workerFetch<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const base = import.meta.env.VITE_API_BASE_URL
  if (!base) throw new Error('The secure API is not configured.')
  const { data: { session } } = await requireSupabase().auth.getSession()
  if (!session) throw new Error('Please sign in again.')
  const response = await fetch(`${base.replace(/\/$/,'')}${path}`, {
    method, headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? {'Content-Type':'application/json'} : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await response.json() as T & {error?:string}
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`)
  return data
}

import { useState, type FormEvent } from 'react'
import { FilePlus2, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { db } from '../lib/api'
import { requireSupabase } from '../lib/supabase'
import { assessments, assessmentStatus, blankQuestion, type AssessmentDetail, type AssessmentKind, type QuizDraftQuestion } from '../lib/assessments'
import { CurriculumSelector } from '../components/CurriculumSelector'
import { Button, EmptyState, ErrorNotice, Field, Loading } from '../components/Ui'
import '../assessment.css'

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Please try again.'
export function AssessmentsPage() {
  const { profile } = useAuth()
  const [topic, setTopic] = useState('')
  const [school, setSchool] = useState('')
  const [dirty, setDirty] = useState(false)
  const schools = useLoad(async () => {
    const list = await db.schools()
    if (profile?.role === 'platform_admin') return list
    const { data, error } = await requireSupabase().from('memberships').select('school_id').eq('user_id', profile!.id)
    if (error) throw error
    return list.filter(s => data?.some(m => m.school_id === s.id))
  }, [profile?.id, profile?.role])
  function changeScope(next: () => void) {
    if (dirty && !window.confirm('Discard unsaved assessment changes?')) return
    setDirty(false); next()
  }
  const selectedSchool = profile?.role !== 'platform_admin' && schools.data?.length === 1 ? schools.data[0].id : school
  const validSchool = profile?.role === 'platform_admin' || schools.data?.some(s => s.id === selectedSchool)
  return <div className="page">
    <h1>Assessments</h1><p className="page-subtitle">Write teacher-approved flashcards and quizzes for each topic.</p>
    <CurriculumSelector onSelect={selection => changeScope(() => setTopic(selection.topic))} />
    {schools.loading ? <Loading /> : schools.error ? <ErrorNotice message={schools.error} /> : <>
      {(profile?.role === 'platform_admin' || (schools.data?.length ?? 0) > 1) && <div className="form-panel assessment-scope"><Field label="School visibility"><select value={selectedSchool} onChange={e => changeScope(() => setSchool(e.target.value))}><option value="">{profile?.role === 'platform_admin' ? 'All schools (global)' : 'Choose your school'}</option>{schools.data?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field></div>}
      {topic && validSchool ? <AssessmentWorkspace key={`${topic}:${selectedSchool}`} topic={topic} school={selectedSchool || null} onDirty={setDirty} /> : <EmptyState title={!validSchool && !schools.data?.length ? "No school assigned" : validSchool ? "Choose a topic" : "Choose your school"} description={!validSchool && !schools.data?.length ? "Ask your administrator to assign your school before creating assessments." : "Choose the curriculum topic and, when needed, the school where assessments belong."} />}
    </>}
  </div>
}

function AssessmentWorkspace({ topic, school, onDirty }: { topic: string; school: string | null; onDirty: (value: boolean) => void }) {
  const list = useLoad(() => assessments.list(topic, school), [topic, school])
  const [kind, setKind] = useState<AssessmentKind>('flashcard')
  const [record, setRecord] = useState<AssessmentDetail | null>(null)
  const [title, setTitle] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [questions, setQuestions] = useState<QuizDraftQuestion[]>([blankQuestion()])
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const immutable = !!record?.published_at
  function markDirty() { setDirty(true); onDirty(true); setMessage('') }
  function apply(nextKind: AssessmentKind, next: AssessmentDetail | null) {
    setKind(nextKind); setRecord(next); setTitle(next?.title || ''); setFront(next?.front || ''); setBack(next?.back || '')
    setQuestions(next?.questions?.length ? next.questions : [blankQuestion()]); setDirty(false); onDirty(false)
  }
  function mayDiscard() { return !dirty || window.confirm('Discard unsaved assessment changes?') }
  function newItem(nextKind: AssessmentKind) {
    if (!mayDiscard()) return
    apply(nextKind, null); setError(null); setMessage('New draft. Save it before publishing.')
  }
  async function open(nextKind: AssessmentKind, id: string) {
    if (!mayDiscard()) return
    setBusy(true); setError(null); setMessage('')
    try { apply(nextKind, await assessments.detail(nextKind, id)) } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setMessage('')
    try {
      const next = await assessments.save(kind, topic, school, kind === 'quiz' ? { title, questions } : { front, back }, record)
      apply(kind, next); setMessage(`Draft v${next.version} saved.`); await list.reload()
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  async function status(publish: boolean) {
    if (!record || dirty) return
    setBusy(true); setError(null); setMessage('')
    try {
      const next = await assessments.publish(kind, record, publish)
      apply(kind, next); setMessage(publish ? `Version ${next.version} published. Other editions of this assessment are unpublished.` : 'Unpublished. Previous results and review records are preserved.')
      await list.reload()
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  async function revise() {
    if (!record) return
    setBusy(true); setError(null); setMessage('')
    try {
      const next = await assessments.revise(kind, record)
      apply(kind, next); setMessage(`Draft v${next.version} created. The published edition stays available until you publish this revision.`); await list.reload()
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  function updateQuestion(index: number, update: Partial<QuizDraftQuestion>) {
    setQuestions(items => items.map((q, i) => i === index ? { ...q, ...update } : q)); markDirty()
  }
  function removeOption(question: QuizDraftQuestion, i: number, j: number) {
    updateQuestion(i, { options: question.options.filter((_, k) => k !== j), correctIndex: question.correctIndex === j ? 0 : question.correctIndex > j ? question.correctIndex - 1 : question.correctIndex })
  }
  return <>
    <div className="section-heading page-heading"><div><h2>Topic assessments</h2><p>Latest 200 quizzes and 200 cards, including drafts and previous editions.</p></div><div className="button-row"><Button variant="secondary" disabled={busy} onClick={() => newItem('flashcard')}><FilePlus2 size={17} /> New card</Button><Button variant="secondary" disabled={busy} onClick={() => newItem('quiz')}><FilePlus2 size={17} /> New quiz</Button></div></div>
    <div className="studio-layout assessment-layout">
      <aside className="studio-list"><div className="section-heading"><h2>Saved assessments</h2><Button variant="ghost" disabled={busy || list.loading} aria-label="Refresh assessments" onClick={() => void list.reload()}><RefreshCw size={17} /></Button></div>
        {list.loading ? <Loading /> : list.error ? <ErrorNotice message={list.error} /> : !list.data?.quizzes.length && !list.data?.flashcards.length ? <EmptyState title="Start this topic" description="Create its first quiz or flashcard." /> : (['quiz', 'flashcard'] as AssessmentKind[]).map(type => <div key={type}><h3>{type === 'quiz' ? 'Quizzes' : 'Flashcards'}</h3>{(type === 'quiz' ? list.data?.quizzes : list.data?.flashcards)?.map(row => <button type="button" disabled={busy} key={row.id} className={record?.id === row.id ? 'selected' : ''} onClick={() => void open(type, row.id)}><strong>{row.title || 'Flashcard'}</strong><small>{assessmentStatus(row)} · v{row.version}</small></button>)}</div>)}
      </aside>
      <section className="studio-editor">
        <div className="editor-header"><h2>{record ? `${kind === 'quiz' ? 'Quiz' : 'Flashcard'} · v${record.version}` : `New ${kind}`}</h2>{record && <span className="status-tag">{assessmentStatus(record)}</span>}</div>
        {immutable && <div className="notice">This edition is read-only to protect learning records. Create a revised draft to change its content.</div>}
        {dirty && <p className="muted" role="status">Unsaved changes. Save the draft before publishing.</p>}
        <form className="assessment-editor-form" onSubmit={save}>
          <fieldset disabled={busy || immutable} className="assessment-fields">
            {kind === 'flashcard' ? <><Field label="Front of card"><textarea required rows={3} maxLength={1000} value={front} onChange={e => { setFront(e.target.value); markDirty() }} /></Field><Field label="Back of card" hint="Required before publishing."><textarea rows={4} maxLength={2000} value={back} onChange={e => { setBack(e.target.value); markDirty() }} /></Field></> : <>
              <Field label="Quiz title"><input required maxLength={180} value={title} onChange={e => { setTitle(e.target.value); markDirty() }} /></Field>
              {questions.map((q, i) => <div className="question-editor" key={i}>
                <div className="section-heading"><h3>Question {i + 1}</h3><div className="button-row"><Button type="button" variant="ghost" disabled={i === 0} onClick={() => { setQuestions(items => { const next = [...items]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; return next }); markDirty() }}>Move up</Button><Button type="button" variant="ghost" disabled={questions.length === 1} onClick={() => { setQuestions(items => items.filter((_, index) => index !== i)); markDirty() }}>Remove question</Button></div></div>
                <Field label={`Question ${i + 1} prompt`} hint="Incomplete question text can be saved as a draft."><textarea maxLength={1000} rows={2} value={q.prompt} onChange={e => updateQuestion(i, { prompt: e.target.value })} /></Field>
                <div className="assessment-options">{q.options.map((option, j) => <div className="assessment-option" key={j}><Field label={`Question ${i + 1}, option ${j + 1}`}><input maxLength={300} value={option} onChange={e => updateQuestion(i, { options: q.options.map((text, k) => j === k ? e.target.value : text) })} /></Field><Button type="button" variant="ghost" aria-label={`Remove question ${i + 1} option ${j + 1}`} disabled={q.options.length <= 2} onClick={() => removeOption(q, i, j)}>Remove</Button></div>)}</div>
                <Button type="button" variant="secondary" disabled={q.options.length >= 10} onClick={() => updateQuestion(i, { options: [...q.options, ''] })}>Add option</Button>
                <Field label={`Question ${i + 1} correct option`}><select value={q.correctIndex} onChange={e => updateQuestion(i, { correctIndex: Number(e.target.value) })}>{q.options.map((_, j) => <option key={j} value={j}>Option {j + 1}</option>)}</select></Field>
                <Field label={`Question ${i + 1} explanation`}><textarea maxLength={1500} rows={3} value={q.explanation} onChange={e => updateQuestion(i, { explanation: e.target.value })} /></Field>
              </div>)}
              <Button type="button" variant="secondary" disabled={questions.length >= 20} onClick={() => { setQuestions(items => [...items, blankQuestion()]); markDirty() }}>Add question</Button>
            </>}
          </fieldset>
          {!immutable && <Button disabled={busy || list.loading || !!list.error}>{busy ? 'Working…' : 'Save draft'}</Button>}
        </form>
        {record && <div className="button-row">{immutable && <Button variant="secondary" disabled={busy} onClick={() => void revise()}>Create revised draft</Button>}<Button variant={record.status === 'published' ? 'secondary' : 'primary'} disabled={busy || dirty} onClick={() => void status(record.status !== 'published')}>{record.status === 'published' ? 'Unpublish' : 'Publish this edition'}</Button></div>}
        {record?.status !== 'published' && <p className="muted">Publishing makes this edition available to permitted learners and unpublishes any other published edition of this assessment.</p>}
        <ErrorNotice message={error} />{message && <div className="notice success" role="status">{message}</div>}
      </section>
    </div>
  </>
}

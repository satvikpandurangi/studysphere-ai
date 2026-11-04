import { useState } from 'react'
import { BookOpen, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { db, workerFetch } from '../lib/api'
import { requireSupabase } from '../lib/supabase'
import { assessments, type QuizFeedback, type QuizResult } from '../lib/assessments'
import { StudentGate } from '../components/StudentGate'
import { Button, EmptyState, ErrorNotice, Loading } from '../components/Ui'
import { Markdown } from '../components/Markdown'
import '../assessment.css'

type LearnerQuiz = { id: string; title: string; version: number; topic_id: string }
type LearnerQuestion = { id: string; prompt: string; options: string[]; position: number }
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Please try again.'

export function PracticePage() { return <StudentGate>{() => <PracticeWorkspace />}</StudentGate> }
function PracticeWorkspace() {
  const { user } = useAuth()
  const list = useLoad(async () => {
    const { data, error } = await requireSupabase().from('quizzes').select('id,title,topic_id,version').eq('status', 'published').order('updated_at', { ascending: false }).limit(100)
    if (error) throw error
    return data as LearnerQuiz[]
  }, [user?.id])
  const [selected, setSelected] = useState<LearnerQuiz | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  return <div className="page"><div className="section-heading page-heading"><div><h1>Practice &amp; quizzes</h1><p>Try what you know, then learn from each explanation.</p></div><Button variant="secondary" disabled={list.loading} onClick={() => { setSelected(null); void list.reload() }}>Refresh quizzes</Button></div>
    {list.loading ? <Loading /> : list.error ? <ErrorNotice message={list.error} /> : !list.data?.length ? <EmptyState title="No quizzes yet" description="Published quizzes for your subjects and verified schools will appear here." /> : <div className="practice-layout">
      <aside className="quiz-list">{list.data.map(quiz => <button className={selected?.id === quiz.id ? 'selected' : ''} key={quiz.id} onClick={() => setSelected(quiz)}><BookOpen size={17} /><span>{quiz.title} · v{quiz.version}</span><ChevronRight size={17} /></button>)}</aside>
      <div className="quiz-content">{selected ? <QuizSession key={selected.id} quiz={selected} onResult={() => setHistoryVersion(value => value + 1)} /> : <EmptyState title="Choose a quiz" description="Select a topic quiz to begin." />}</div>
    </div>}
    <AttemptHistory studentId={user!.id} refresh={historyVersion} />
  </div>
}

function QuizSession({ quiz, onResult }: { quiz: LearnerQuiz; onResult: () => void }) {
  const { user } = useAuth()
  const questions = useLoad(async () => {
    const { data, error } = await requireSupabase().from('quiz_questions').select('id,prompt,options,position').eq('quiz_id', quiz.id).order('position').order('id')
    if (error) throw error
    return data as LearnerQuestion[]
  }, [quiz.id])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  async function submit() {
    if (busy || result || !questions.data?.length) return
    setBusy(true); setError(null)
    try {
      const saved = await workerFetch<QuizResult>('/quiz/grade', { quizId: quiz.id, version: quiz.version, studentId: user!.id, answers: questions.data.map(q => answers[q.id] ?? -1) })
      setResult(saved); onResult()
    } catch (error) { setError(messageOf(error)) } finally { setBusy(false) }
  }
  if (questions.loading) return <Loading label="Opening quiz…" />
  if (questions.error) return <ErrorNotice message={questions.error} />
  if (!questions.data?.length) return <EmptyState title="Quiz unavailable" description="It may have been unpublished or your access changed. Use Refresh quizzes to see available assessments." />
  return <><h2>{quiz.title}</h2><p className="muted">Edition {quiz.version}</p>
    {questions.data.map((q, i) => <section className="question" key={q.id}><h3>{i + 1}. {q.prompt}</h3>{q.options.map((option, index) => <label key={index} className={`option ${answers[q.id] === index ? 'selected' : ''}`}><input type="radio" name={`${quiz.id}-${retry}-${q.id}`} checked={answers[q.id] === index} disabled={busy || !!result} onChange={() => setAnswers(values => ({ ...values, [q.id]: index }))} />{option}</label>)}{result && <Feedback item={result.feedback.find(item => item.questionId === q.id)!} />}</section>)}
    <ErrorNotice message={error} />{result ? <><div className="notice success" role="status">You scored {result.score} out of {result.total}. Saved for edition {result.quizVersion}.</div><Button variant="secondary" onClick={() => { setAnswers({}); setResult(null); setError(null); setRetry(value => value + 1) }}>Try again</Button></> : <Button disabled={busy || questions.data.some(q => answers[q.id] === undefined)} onClick={() => void submit()}>{busy ? 'Checking…' : 'Submit answers'}</Button>}
  </>
}

function Feedback({ item }: { item: QuizFeedback | undefined }) {
  if (!item) return null
  return <div className="answer"><strong>Correct answer: {item.options[item.correctIndex]}</strong>{item.explanation && <Markdown text={item.explanation} />}</div>
}
function AttemptHistory({ studentId, refresh }: { studentId: string; refresh: number }) {
  const history = useLoad(() => assessments.history(studentId), [studentId, refresh])
  return <section className="form-panel attempt-history"><h2>Your recent results</h2><p>Latest 20 attempts. Earlier editions keep their original results.</p>
    {history.loading ? <Loading /> : history.error ? <ErrorNotice message={history.error} /> : !history.data?.length ? <p className="muted">Your results will appear after you submit a quiz.</p> : history.data.map(attempt => <details key={attempt.id}><summary>{attempt.quiz_title} · v{attempt.quiz_version} — {attempt.score} out of {attempt.total}<small>{new Date(attempt.created_at).toLocaleString()}</small></summary>{attempt.feedback?.length ? attempt.feedback.map((item, index) => <div className="assessment-results" key={item.questionId}><h3>{index + 1}. {item.prompt}</h3><p>Your answer: {item.options[item.selectedIndex]}</p><Feedback item={item} /></div>) : <p className="muted">Detailed feedback was not recorded for this older attempt.</p>}</details>)}
  </section>
}

type ReviewCard = { id: string; topic_id: string; front: string; back: string; school_id: string | null; version: number }
function nextReviewDate(rating: number) { const date = new Date(); date.setDate(date.getDate() + ([0, 1, 3, 7, 14][rating] ?? 1)); return date.toISOString() }
export function FlashcardsPage() { return <StudentGate>{() => <FlashcardWorkspace />}</StudentGate> }
function FlashcardWorkspace() {
  const { user } = useAuth()
  const cards = useLoad(async () => {
    const [published, reviews] = await Promise.all([
      requireSupabase().from('flashcards').select('id,topic_id,front,back,school_id,version').eq('status', 'published').order('updated_at', { ascending: false }).limit(100),
      requireSupabase().from('flashcard_reviews').select('flashcard_id,due_at').eq('student_id', user!.id),
    ])
    if (published.error) throw published.error
    if (reviews.error) throw reviews.error
    const due = new Map((reviews.data || []).map(row => [row.flashcard_id, new Date(row.due_at)]))
    return (published.data || []).filter(card => !due.has(card.id) || due.get(card.id)! <= new Date()) as ReviewCard[]
  }, [user?.id])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const card = cards.data?.[index]
  async function rate(rating: number) {
    if (!card || busy) return
    setBusy(true); setError(null)
    try { await db.reviewCard(user!.id, card.id, rating, nextReviewDate(rating)); setFlipped(false); setIndex(value => value + 1) }
    catch (error) { setError(messageOf(error)) } finally { setBusy(false) }
  }
  return <div className="page narrow"><div className="page-title"><h1>Flashcards</h1><p>A few minutes of review can make an idea stick.</p></div>
    {cards.loading ? <Loading /> : cards.error ? <ErrorNotice message={cards.error} /> : !cards.data?.length ? <EmptyState title="No cards due" description="Published cards for your subjects appear when they are due for review. A revised edition starts fresh." /> : !card ? <EmptyState title="Review complete" description="Your ratings and next review dates have been saved." action={<Button variant="secondary" onClick={() => void cards.reload().then(() => { setIndex(0); setFlipped(false); setError(null) })}>Check for due cards</Button>} /> : <>
      <div className="flashcard-count">Card {index + 1} of {cards.data.length} · v{card.version}</div><button className="flashcard" disabled={busy} onClick={() => setFlipped(value => !value)} aria-label="Flip flashcard"><span>{flipped ? 'Answer' : 'Question'}</span><div><Markdown text={flipped ? card.back : card.front} /></div><small>Click to flip</small></button>
      {flipped && <div className="rating-row"><span>How well did you know it?</span>{(['Again', 'Hard', 'Good', 'Easy'] as const).map((label, i) => <Button key={label} variant={i === 3 ? 'primary' : 'secondary'} disabled={busy} onClick={() => void rate(i + 1)}>{label}</Button>)}</div>}
    </>}<ErrorNotice message={error} />
  </div>
}

import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { originalTopics } from '../sample-assets/content-library/original-topics.mjs'

export function buildLibrary(topics = originalTopics) {
  const seen = new Set()
  if (topics.length !== 40) throw new Error('Expected forty independently authored subject/grade fixtures')
  const units = []
  for (const topic of topics) {
    const key = `${topic.grade}:${topic.subject}`
    if (seen.has(key) || !Number.isInteger(topic.grade) || topic.grade < 1 || topic.grade > 10 || !['Mathematics','Science','English','Social Studies'].includes(topic.subject)) throw new Error('Invalid or duplicate curriculum fixture')
    seen.add(key)
    if (topic.facts.length !== 3) throw new Error('Each fixture needs three original questions')
    for (const fact of topic.facts) {
      if (!fact.question || !fact.explanation || new Set([fact.answer, ...fact.distractors]).size !== 3) throw new Error('Invalid question or ambiguous duplicate options')
    }
    for (const board of ['CBSE','KSEAB']) {
      const warning = '**Product-testing material. Independently authored; teacher review and board alignment are pending.**'
      const questions = topic.facts.map((fact, index) => {
        const correctIndex = (topic.grade + index) % 3, options = [...fact.distractors]
        options.splice(correctIndex, 0, fact.answer)
        return { prompt: fact.question, options, correctIndex, explanation: fact.explanation }
      })
      const first = topic.facts[0]
      units.push({
        key: `${board}:${key}`, board, grade: topic.grade, subject: topic.subject,
        chapter: '[Test library] Core concept', title: topic.title, scope: 'one_selected_school_only', status: 'draft',
        provenance: { kind: 'original_project_fixture', creator: 'StudySphere test-fixture authoring', copiedFromTextbook: false, teacherApproved: false },
        contentItems: [
          { kind: 'lesson', title: topic.title, language: 'en', body_md: `${warning}\n\n${topic.introduction}\n\n## Key ideas\n\n${topic.facts.map(f => `- **${f.answer}** — ${f.explanation}`).join('\n')}\n\n## Explain your reasoning\n\nRead each question, choose an answer, then explain why it fits the facts. Check units, wording and the context before deciding.` },
          { kind: 'note', title: `${topic.title}: revision notes`, language: 'en', body_md: `${warning}\n\n| Check | Remember |\n| --- | --- |\n${topic.facts.map(f => `| ${f.question} | ${f.answer} |`).join('\n')}` },
          { kind: 'example', title: `${topic.title}: worked example`, language: 'en', body_md: `${warning}\n\n**Question:** ${first.question}\n\n**Answer:** ${first.answer}\n\n**Reasoning:** ${first.explanation}` },
          { kind: 'problem', title: `${topic.title}: explain it yourself`, language: 'en', body_md: `${warning}\n\n${topic.facts[1].question}\n\nWrite an answer and explain your reasoning.`, hints: ['Identify exactly what the question asks.', topic.facts[1].explanation], answer_md: `**${topic.facts[1].answer}**\n\n${topic.facts[1].explanation}` },
        ],
        quiz: { title: `[Test] ${topic.title}`, questions },
        flashcards: topic.facts.slice(0,2).map(f => ({ front: f.question, back: `${f.answer}\n\n${f.explanation}` })),
      })
    }
  }
  return { version: '2026-10-29-v1', use: 'Local functional simulation; not a complete syllabus or approved school material', providerWrites: 0, uploadsPaused: true, containsCopiedNCERTOrKTBSText: false, units }
}

export function summarizeLibrary(library) {
  return { units: library.units.length, boards: [...new Set(library.units.map(u => u.board))], standards: [...new Set(library.units.map(u => u.grade))].sort((a,b) => a-b), contentItems: library.units.reduce((n,u) => n+u.contentItems.length,0), quizzes: library.units.length, questions: library.units.reduce((n,u) => n+u.quiz.questions.length,0), flashcards: library.units.reduce((n,u) => n+u.flashcards.length,0), providerWrites: library.providerWrites }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const library = buildLibrary(), directory = path.resolve('.local/content-library')
  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory,'original-test-library.json'), JSON.stringify(library,null,2)+'\n')
  await writeFile(path.join(directory,'coverage.json'), JSON.stringify(summarizeLibrary(library),null,2)+'\n')
  console.log(JSON.stringify(summarizeLibrary(library)))
  console.log('Local fixture package generated. No database writes, textbook imports or PDF uploads.')
}

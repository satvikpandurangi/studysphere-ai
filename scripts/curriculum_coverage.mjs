import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function auditCoverage(scope, evidence = { records: [] }) {
  const cells = []
  for (const board of scope.boards) for (const grade of scope.standards) {
    const record = evidence.records?.find(row => row.board === board && row.grade === grade && row.academicYear === scope.academicYear && row.medium === scope.medium)
    const reasons = []
    if (!record?.officialSubjectSetVerified || !record.subjects?.length) reasons.push('official_subject_inventory_missing')
    if (scope.schoolLanguageSelection.status !== 'confirmed') reasons.push('prescribed_languages_unconfirmed')
    let expected = 0, covered = 0
    for (const subject of record?.subjects ?? []) {
      if (!subject.chapterInventoryVerified || !subject.chapters?.length) reasons.push(`chapter_inventory_missing:${subject.key}`)
      if (!subject.requiredActivitiesVerified) reasons.push(`required_activities_unverified:${subject.key}`)
      const seen = new Set()
      for (const chapter of subject.chapters ?? []) {
        expected++
        if (!chapter.key || seen.has(chapter.key)) { reasons.push(`duplicate_or_missing_chapter:${subject.key}`); continue }
        seen.add(chapter.key)
        const ready = chapter.sourceVerified === true && chapter.rightsApproved === true && chapter.teacherApproved === true && chapter.contentVerified === true && chapter.assessmentVerified === true && chapter.fixtureOnly !== true && chapter.topicInventoryVerified === true && chapter.topics?.length > 0 && chapter.topics.every(topic => topic.contentVerified === true && topic.assessmentVerified === true && topic.rightsApproved === true && topic.teacherApproved === true)
        if (ready) covered++
        else reasons.push(`chapter_not_accepted:${subject.key}:${chapter.key}`)
      }
    }
    cells.push({ board, grade, academicYear: scope.academicYear, medium: scope.medium, complete: reasons.length === 0 && expected > 0 && covered === expected, expectedChapters: record?.officialSubjectSetVerified ? expected : null, acceptedChapters: covered, reasons: [...new Set(reasons)] })
  }
  return { complete: cells.length > 0 && cells.every(cell => cell.complete), completeCells: cells.filter(cell => cell.complete).length, totalCells: cells.length, fixtureRowsDoNotEstablishCoverage: true, cells }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const scope = JSON.parse(await readFile('sample-assets/content-library/curriculum-scope.json','utf8'))
  let evidence = { records: [] }
  try { evidence = JSON.parse(await readFile('.local/content-library/curriculum-evidence.json','utf8')) } catch (e) { if (e.code !== 'ENOENT') throw e }
  const result = auditCoverage(scope, evidence)
  await mkdir('.local/content-library',{recursive:true})
  await writeFile('.local/content-library/curriculum-coverage.json',JSON.stringify(result,null,2)+'\n')
  console.log(`Accepted full curriculum cells: ${result.completeCells}/${result.totalCells}. Test fixtures are excluded.`)
  if (!result.complete) process.exitCode = 2
}

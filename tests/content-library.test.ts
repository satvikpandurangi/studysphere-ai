import { describe, expect, it } from 'vitest'
// @ts-expect-error Shared operator script has no separate declaration.
import { buildLibrary, summarizeLibrary } from '../scripts/build_test_library.mjs'
// @ts-expect-error Shared operator script has no separate declaration.
import { auditCoverage } from '../scripts/curriculum_coverage.mjs'
// @ts-expect-error Authored fixture data is shared with the Node tool.
import { originalTopics } from '../sample-assets/content-library/original-topics.mjs'

describe('content fixtures and genuine syllabus coverage',()=>{
  it('builds deterministic drafts for every current generic subject/grade in both board tracks',()=>{
    const pack=buildLibrary()
    expect(summarizeLibrary(pack)).toMatchObject({units:80,contentItems:320,quizzes:80,questions:240,flashcards:160,providerWrites:0})
    expect(new Set(pack.units.map((u:{key:string})=>u.key)).size).toBe(80)
    for(const unit of pack.units){expect(unit.status).toBe('draft');expect(unit.scope).toBe('one_selected_school_only');for(const [i,q] of unit.quiz.questions.entries())expect(q.options[q.correctIndex]).toBe(originalTopics.find((t:{grade:number;subject:string})=>t.grade===unit.grade&&t.subject===unit.subject).facts[i].answer)}
  })
  it('rejects duplicated subject/grade slots instead of silently dropping another subject',()=>{
    const modified=[...originalTopics];modified[1]=modified[0]
    expect(()=>buildLibrary(modified)).toThrow('duplicate')
  })
  it('does not infer real syllabus completion from a large fixture library',()=>{
    const scope={boards:['CBSE','KSEAB'],standards:[1,2,3,4,5,6,7,8,9,10],academicYear:'2026-27',medium:'English',schoolLanguageSelection:{status:'pending'}}
    expect(auditCoverage(scope,{records:[],fixtures:buildLibrary()})).toMatchObject({complete:false,completeCells:0,totalCells:20})
    expect(auditCoverage(scope).cells[0].expectedChapters).toBeNull()
  })
  it('requires source, rights, teacher, topic, assessment and activity acceptance for completion',()=>{
    const scope={boards:['CBSE'],standards:[6],academicYear:'2026-27',medium:'English',schoolLanguageSelection:{status:'confirmed'}}
    const chapter={key:'a',sourceVerified:true,rightsApproved:true,teacherApproved:true,contentVerified:true,assessmentVerified:true,topicInventoryVerified:true,topics:[{contentVerified:true,assessmentVerified:true,rightsApproved:true,teacherApproved:true}]}
    const record={board:'CBSE',grade:6,academicYear:'2026-27',medium:'English',officialSubjectSetVerified:true,subjects:[{key:'math',chapterInventoryVerified:true,requiredActivitiesVerified:true,chapters:[chapter]}]}
    expect(auditCoverage(scope,{records:[record]}).complete).toBe(true)
    expect(auditCoverage(scope,{records:[{...record,subjects:[{...record.subjects[0],chapters:[{...chapter,fixtureOnly:true}]}]}]}).complete).toBe(false)
    expect(auditCoverage(scope,{records:[{...record,academicYear:'2025-26'}]}).complete).toBe(false)
    expect(auditCoverage(scope,{records:[{...record,subjects:[{...record.subjects[0],requiredActivitiesVerified:false}]}]}).complete).toBe(false)
  })
})

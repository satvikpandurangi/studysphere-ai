import { describe, expect, it } from 'vitest'
import { generateStudyTasks } from './studyPlan'

const subjects=[{id:'math',name:'Mathematics'},{id:'science',name:'Science'}]
describe('deterministic study plan',()=>{
  it('uses only selected weekdays and rotates subjects',()=>{
    const plan=generateStudyTasks('2026-09-21','2026-09-27',[1,3,5],subjects)
    expect(plan.map(x=>x.due_date)).toEqual(['2026-09-21','2026-09-23','2026-09-25'])
    expect(plan.map(x=>x.subject_id)).toEqual(['math','science','math'])
  })
  it('rejects a target before the start',()=>expect(()=>generateStudyTasks('2026-09-27','2026-09-21',[1],subjects)).toThrow())
  it('limits the amount of generated work',()=>expect(generateStudyTasks('2026-01-01','2026-03-01',[0,1,2,3,4,5,6],subjects,10)).toHaveLength(10))
})

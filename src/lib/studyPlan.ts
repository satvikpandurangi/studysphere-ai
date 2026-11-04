export type PlannedSubject={id:string;name:string}
export type GeneratedTask={subject_id:string;title:string;due_date:string}

function parseDay(value:string){
  const date=new Date(`${value}T12:00:00Z`)
  if(Number.isNaN(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('Choose valid study dates.')
  return date
}

export function generateStudyTasks(start:string,target:string,weekdays:number[],subjects:PlannedSubject[],maxTasks=60):GeneratedTask[]{
  const from=parseDay(start),to=parseDay(target)
  if(to<from)throw new Error('The target date must be after the start date.')
  if((to.getTime()-from.getTime())/86400000>180)throw new Error('Choose a target within six months.')
  if(!subjects.length||!weekdays.length)throw new Error('Choose subjects and study days.')
  const days=new Set(weekdays)
  if([...days].some(d=>!Number.isInteger(d)||d<0||d>6))throw new Error('Choose valid study days.')
  const tasks:GeneratedTask[]=[]
  for(let day=from;day<=to;day=new Date(day.getTime()+86400000)){
    if(!days.has(day.getUTCDay()))continue
    const subject=subjects[tasks.length%subjects.length]
    tasks.push({subject_id:subject.id,title:`Study ${subject.name}`,due_date:day.toISOString().slice(0,10)})
    if(tasks.length>=maxTasks)break
  }
  if(!tasks.length)throw new Error('No selected study days fall before the target date.')
  return tasks
}

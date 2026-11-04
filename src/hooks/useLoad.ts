import { useEffect, useState } from 'react'
export function useLoad<T>(loader:()=>Promise<T>, deps:unknown[]=[]){
  const [data,setData]=useState<T|null>(null); const [error,setError]=useState<string|null>(null); const [loading,setLoading]=useState(true)
  useEffect(()=>{let live=true;setLoading(true);loader().then(value=>{if(live){setData(value);setError(null)}}).catch(e=>{if(live)setError(e instanceof Error?e.message:String(e))}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},deps)
  return {data,error,loading,reload:async()=>{setLoading(true);try{setData(await loader());setError(null)}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}}}
}

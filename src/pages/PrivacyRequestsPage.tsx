import { useState } from 'react'

import { useAuth } from '../context/AuthContext'

import { useLoad } from '../hooks/useLoad'

import { workerFetch } from '../lib/api'

import { Button, EmptyState, ErrorNotice, Loading } from '../components/Ui'

import { account, type DeletionPreflight } from '../lib/account'

import '../account.css'



type RequestItem={id:string;user_id:string;requested_by:string|null;kind:'export'|'delete';status:'pending'|'in_review';created_at:string}

export function PrivacyRequestsPage(){const {profile}=useAuth();const [error,setError]=useState<string|null>(null);const [busy,setBusy]=useState<string|null>(null)

  const requests=useLoad(async()=>{if(profile?.role!=='platform_admin')return [] as RequestItem[];const result=await workerFetch<{requests:RequestItem[]}>('/privacy/requests',undefined,'GET');return result.requests},[profile?.role])

  if(profile?.role!=='platform_admin')return <div className="page"><ErrorNotice message="Platform administrator access required."/></div>

  async function update(item:RequestItem,status:'in_review'|'fulfilled'){

    if(status==='fulfilled'&&!window.confirm('Have you securely delivered the complete export to the account holder?'))return

    setBusy(item.id);setError(null)

    try{await workerFetch('/privacy/review',{id:item.id,status,processedExternally:status==='fulfilled'});await requests.reload()}

    catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(null)}

  }

  return <div className="page"><h1>Privacy requests</h1><p className="page-subtitle">Review export and deletion requests. Check the account holder's identity and process the request in the service dashboards before closing it.</p><div className="notice">A deletion request stays in review until the account and linked data are deleted under the approved retention policy. The request record is removed when the account is deleted.</div>

    {requests.loading?<Loading/>:requests.error?<ErrorNotice message={requests.error}/>:requests.data?.length?<div className="approval-list">{requests.data.map(item=><div className="approval-row" key={item.id}><div><strong>{item.kind==='export'?'Data export':'Account deletion'}</strong><p>Account: {item.user_id}</p>{item.requested_by&&item.requested_by!==item.user_id&&<p>Requested by guardian: {item.requested_by}</p>}<small>Requested {new Date(item.created_at).toLocaleString()} · {item.status.replace('_',' ')}</small>{item.kind==='delete'&&<DeletionCheck userId={item.user_id}/>}</div><div className="button-row">{item.status==='pending'&&<Button variant="secondary" disabled={!!busy} onClick={()=>update(item,'in_review')}>Mark in review</Button>}{item.kind==='export'&&item.status==='in_review'&&<Button disabled={!!busy} onClick={()=>update(item,'fulfilled')}>Mark export delivered</Button>}</div></div>)}</div>:<EmptyState title="No open requests" description="Privacy requests will appear here for review."/>}<ErrorNotice message={error}/>

  </div>

}



function DeletionCheck({userId}:{userId:string}){

  const [data,setData]=useState<DeletionPreflight|null>(null)

  const [error,setError]=useState<string|null>(null)

  const [busy,setBusy]=useState(false)

  return <div className="deletion-preflight"><Button variant="ghost" disabled={busy} onClick={async()=>{setBusy(true);setError(null);try{setData(await account.deletionPreflight(userId))}catch(e){setData(null);setError(e instanceof Error?e.message:'Preflight failed')}finally{setBusy(false)}}}>{busy?'Checking…':'Check deletion dependencies'}</Button><ErrorNotice message={error}/>{data&&<><dl>{Object.entries(data).map(([key,count])=><div key={key} style={{display:'contents'}}><dt>{key.replace(/([A-Z])/g,' $1')}</dt><dd>{count}</dd></div>)}</dl><p>Preflight is a count snapshot, not approval to delete. Resolve linked children and staff handover; review invitations, retained material/snapshots and audit records under the approved policy. No account is deleted here.</p></>}</div>

}


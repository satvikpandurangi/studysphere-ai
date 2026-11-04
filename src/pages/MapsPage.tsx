import { useEffect, useState } from 'react'
import { Plus, Download } from 'lucide-react'
import { ReactFlow, Background, Controls, addEdge, applyNodeChanges, applyEdgeChanges, type Node, type Edge, type Connection, type NodeChange, type EdgeChange } from '@xyflow/react'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/api'
import { requireSupabase } from '../lib/supabase'
import { Button, ErrorNotice, Loading } from '../components/Ui'
import { StudentGate } from '../components/StudentGate'

const startingNodes:Node[]=[{id:'center',position:{x:200,y:120},data:{label:'My big idea'}}]
export function MapsPage(){const {user}=useAuth();const [nodes,setNodes]=useState<Node[]>(startingNodes);const [edges,setEdges]=useState<Edge[]>([]);const [selected,setSelected]=useState('center');const [loaded,setLoaded]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState<string|null>(null)
  useEffect(()=>{let live=true;(async()=>{const {data,error}=await requireSupabase().from('mind_maps').select('graph').eq('student_id',user!.id).is('topic_id',null).maybeSingle();if(error)throw error;if(live){if(data?.graph){const graph=data.graph as {nodes:Node[];edges:Edge[]};setNodes(graph.nodes);setEdges(graph.edges)}setLoaded(true)}})().catch(e=>{if(live)setError(e instanceof Error?e.message:String(e))});return()=>{live=false}},[user?.id])
  useEffect(()=>{if(!loaded)return;setMessage('Saving…');const timer=setTimeout(()=>{db.saveMindMap(user!.id,null,{nodes,edges}).then(()=>setMessage('Saved across your devices')).catch(e=>setError(e instanceof Error?e.message:String(e)))},900);return()=>clearTimeout(timer)},[nodes,edges,loaded,user?.id])
  function addIdea(){const id=crypto.randomUUID();setNodes(current=>[...current,{id,position:{x:130+(current.length%4)*190,y:80+Math.floor(current.length/4)*140},data:{label:'New idea'}}]);setSelected(id)}
  function changeLabel(value:string){setNodes(current=>current.map(n=>n.id===selected?{...n,data:{...n.data,label:value.slice(0,80)}}:n))}
  function exportMap(){const data=JSON.stringify({nodes,edges},null,2);const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='studysphere-mind-map.json';link.click();URL.revokeObjectURL(url)}
  const active=nodes.find(n=>n.id===selected)
  return <StudentGate>{()=> <div className="page maps-page"><div className="section-heading page-heading"><div><h1>Mind maps</h1><p>Connect ideas and make them your own.</p></div><Button variant="secondary" onClick={exportMap}><Download size={16}/> Export</Button></div><div className="map-toolbar"><Button onClick={addIdea}><Plus size={17}/> Add idea</Button><label className="map-label">Selected idea <input value={String(active?.data.label||'')} onChange={e=>changeLabel(e.target.value)} disabled={!active} maxLength={80}/></label><span role="status">{message}</span></div><ErrorNotice message={error}/>{!loaded?<Loading label="Opening your map…"/>:<div className="map-canvas"><ReactFlow nodes={nodes} edges={edges} onNodeClick={(_,node)=>setSelected(node.id)} onNodesChange={(changes:NodeChange[])=>setNodes(current=>applyNodeChanges(changes,current))} onEdgesChange={(changes:EdgeChange[])=>setEdges(current=>applyEdgeChanges(changes,current))} onConnect={(connection:Connection)=>setEdges(current=>addEdge(connection,current))} fitView><Background/><Controls/></ReactFlow></div>}</div>}</StudentGate>
}

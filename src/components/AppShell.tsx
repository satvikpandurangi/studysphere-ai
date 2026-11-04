import { BookOpen, BrainCircuit, CalendarDays, Gauge, GraduationCap, Home, Layers3, LockKeyhole, LogOut, Map, Menu, School, Settings2, Sparkles, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { requireSupabase } from '../lib/supabase'
import { useInstitution } from '../context/InstitutionContext'
import { brandingStyle } from '../lib/branding'
import '../branding.css'

const studentNav = [
  {to:'/app',label:'Dashboard',icon:Home}, {to:'/app/learn',label:'Learn',icon:BookOpen},
  {to:'/app/practice',label:'Practice',icon:GraduationCap}, {to:'/app/flashcards',label:'Flashcards',icon:Layers3},
  {to:'/app/plan',label:'Study Plan',icon:CalendarDays}, {to:'/app/maps',label:'Mind Maps',icon:Map},
  {to:'/app/tutor',label:'AI Tutor',icon:BrainCircuit}, {to:'/app/schools',label:'My schools',icon:School}, {to:'/app/settings',label:'Settings',icon:Settings2},
]
const parentNav = [{to:'/app',label:'Overview',icon:Home},{to:'/app/children',label:'My children',icon:Users},{to:'/app/schools',label:'My schools',icon:School},{to:'/app/settings',label:'Settings',icon:Settings2}]
const staffNav = [{to:'/app',label:'Overview',icon:Home},{to:'/app/content',label:'Content studio',icon:BookOpen},{to:'/app/assessments',label:'Assessments',icon:GraduationCap},{to:'/app/curriculum',label:'Curriculum',icon:Layers3},{to:'/app/schools',label:'Schools & people',icon:School},{to:'/app/enrollments',label:'Student enrollment',icon:Users},{to:'/app/settings',label:'Settings',icon:Settings2}]
const platformNav = [...staffNav.slice(0,-1),{to:'/app/privacy-requests',label:'Privacy requests',icon:LockKeyhole},{to:'/app/pilot-usage',label:'Pilot usage',icon:Gauge},staffNav.at(-1)!]

export function AppShell({children}:{children:ReactNode}) {
  const {profile,user}=useAuth(); const navigate=useNavigate(); const [menu,setMenu]=useState(false)
  const [mobile,setMobile]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width:760px)').matches)
  const menuButton=useRef<HTMLButtonElement>(null), sidebar=useRef<HTMLElement>(null)
  useEffect(()=>{
    const media=window.matchMedia('(max-width:760px)')
    const changed=()=>{setMobile(media.matches);if(!media.matches)setMenu(false)}
    media.addEventListener('change',changed)
    return()=>media.removeEventListener('change',changed)
  },[])
  useEffect(()=>{
    if(!menu)return
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const controls=()=>Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')??[]).filter(node=>node.getClientRects().length>0)
    controls()[0]?.focus()
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setMenu(false)}
      if(event.key==='Tab'){const nodes=controls(),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
    }
    document.addEventListener('keydown',onKey)
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKey);menuButton.current?.focus()}
  },[menu])
  const institution=useInstitution(); const active=institution.active; const identity=active?.branding
  const baseNav=profile?.role==='student'?studentNav:profile?.role==='parent'?parentNav:profile?.role==='platform_admin'?platformNav:staffNav
  const nav=(profile?.role==='school_admin'||profile?.role==='platform_admin'?[...baseNav,{to:'/app/institution-settings',label:'Institution settings',icon:School},...(profile?.role==='school_admin'?[{to:'/app/pilot-usage',label:'Institution usage',icon:Gauge}]:[])]:baseNav).filter(item=>!['/app/enrollments','/app/schools'].includes(item.to)||profile?.role!=='editor')
  const [logoutError,setLogoutError]=useState(''); const [signingOut,setSigningOut]=useState(false)
  async function logout(){setSigningOut(true);setLogoutError('');try{const {error}=await requireSupabase().auth.signOut();if(error)throw error;navigate('/login',{replace:true})}catch{setLogoutError('Could not sign out. Please try again.')}finally{setSigningOut(false)}}
  return <div className={`app-layout ${identity?'institution-theme':''}`} style={brandingStyle(identity)}>
    <button ref={menuButton} className="mobile-menu" aria-label="Open menu" aria-expanded={menu} aria-controls="app-sidebar" onClick={()=>setMenu(true)}><Menu size={22}/></button>
    {menu&&<button className="sidebar-scrim" aria-label="Close menu" onClick={()=>setMenu(false)}/>}
    <aside ref={sidebar} id="app-sidebar" inert={mobile&&!menu} aria-hidden={mobile&&!menu?true:undefined} className={`sidebar ${menu?'open':''}`}>
      <div className="brand">{identity?.logo_data_url?<img className="institution-logo" src={identity.logo_data_url} alt=""/>:<div className="brand-icon"><GraduationCap size={27}/></div>}<div><strong>{identity?.display_name||active?.name||'StudySphere'}</strong><small>{active?'Powered by StudySphere':<>Learn today.<br/>Build tomorrow.</>}</small></div><button className="close-menu" aria-label="Close menu" onClick={()=>setMenu(false)}><X size={18}/></button></div>
      {(institution.error||active&&(identity?.support_email||identity?.support_phone||identity?.website))&&<div className="institution-support">{institution.error&&<><small role="status">School details are temporarily unavailable.</small><button className="text-button" onClick={()=>void institution.refresh()}>Retry school details</button></>}{active&&(identity?.support_email||identity?.support_phone||identity?.website)&&<div className="institution-contact" aria-label="Institution contact details">{identity?.support_email&&<a href={`mailto:${encodeURIComponent(identity.support_email)}`}>{identity.support_email}</a>}{identity?.support_phone&&<a href={`tel:${identity.support_phone.replace(/[^+0-9]/g,'')}`}>{identity.support_phone}</a>}{identity?.website&&<a href={identity.website} target="_blank" rel="noopener noreferrer">School website</a>}</div>}</div>}
      <nav aria-label="Primary navigation">{nav.filter(item=>item.to!=='/app/enrollments'||profile?.role==='school_admin'||profile?.role==='platform_admin').map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/app'} className={({isActive})=>`nav-item ${isActive?'active':''}`} onClick={()=>setMenu(false)}><Icon size={20}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-message"><Sparkles size={19}/><span>Small steps create big futures.</span></div>{logoutError&&<p className="sidebar-error" role="alert">{logoutError}</p>}<button className="nav-item logout" disabled={signingOut} onClick={logout}><LogOut size={19}/>{signingOut?'Signing out…':'Sign out'}</button></div>
    </aside>
    <main className="main" inert={mobile&&menu}><header className="topbar"><div className="topbar-spacer"/><div className="user-chip"><div className="avatar">{profile?.full_name?.slice(0,1).toUpperCase()||'S'}</div><div><strong>{profile?.full_name||user?.email}</strong><small>{profile?.role==='editor'?'Teacher':profile?.role==='school_admin'?'School administrator':profile?.role==='platform_admin'?'Platform administrator':profile?.role}</small></div></div></header>{children}</main>
  </div>
}

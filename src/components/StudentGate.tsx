import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { db } from '../lib/api'
import { ErrorNotice, Loading } from './Ui'

export function StudentGate({children}:{children:(p:{school_id:string;board_id:string;grade_id:string})=>React.ReactNode}){const {user}=useAuth();const profile=useLoad(()=>db.studentProfile(user!.id),[user?.id]);if(profile.loading)return <Loading/>;if(profile.error)return <div className="page"><ErrorNotice message={profile.error}/></div>;if(!profile.data)return <div className="page"><div className="page-title"><h1>Account setup pending</h1><p>Contact support to finish your student account.</p></div></div>;if(profile.data.approval_status!=='approved')return <div className="page"><div className="page-title"><h1>Learning access paused</h1><p>A parent, guardian, or platform administrator must restore this account.</p></div></div>;return <>{children(profile.data)}</>}

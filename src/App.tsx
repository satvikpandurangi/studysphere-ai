import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppShell } from './components/AppShell'
import { InstitutionProvider } from './context/InstitutionContext'
import { Loading } from './components/Ui'
import { configured } from './lib/supabase'
import { AuthPage } from './pages/AuthPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
const StudentDashboard=lazy(()=>import('./pages/StudentPages').then(m=>({default:m.StudentDashboard})))
const LearnPage=lazy(()=>import('./pages/StudentPages').then(m=>({default:m.LearnPage})))
const LessonPage=lazy(()=>import('./pages/StudentPages').then(m=>({default:m.LessonPage})))
const PracticePage=lazy(()=>import('./pages/LearnerAssessmentPages').then(m=>({default:m.PracticePage})))
const FlashcardsPage=lazy(()=>import('./pages/LearnerAssessmentPages').then(m=>({default:m.FlashcardsPage})))
const PlanPage=lazy(()=>import('./pages/PlanPage').then(m=>({default:m.PlanPage})))
const TutorPage=lazy(()=>import('./pages/TutorPage').then(m=>({default:m.TutorPage})))
const ParentDashboard=lazy(()=>import('./pages/ParentPages').then(m=>({default:m.ParentDashboard})))
const ChildrenPage=lazy(()=>import('./pages/ParentPages').then(m=>({default:m.ChildrenPage})))
const ChildProgressPage=lazy(()=>import('./pages/ChildProgressPage').then(m=>({default:m.ChildProgressPage})))
const SettingsPage=lazy(()=>import('./pages/SettingsPage').then(m=>({default:m.SettingsPage})))
const StaffDashboard=lazy(()=>import('./pages/StaffPages').then(m=>({default:m.StaffDashboard})))
const ContentStudio=lazy(()=>import('./pages/StaffPages').then(m=>({default:m.ContentStudio})))
const SchoolsPage=lazy(()=>import('./pages/StaffPages').then(m=>({default:m.SchoolsPage})))
const AssessmentsPage=lazy(()=>import('./pages/AssessmentStudioPage').then(m=>({default:m.AssessmentsPage})))
const CurriculumPage=lazy(()=>import('./pages/AuthoringPages').then(m=>({default:m.CurriculumPage})))
const PrivacyRequestsPage=lazy(()=>import('./pages/PrivacyRequestsPage').then(m=>({default:m.PrivacyRequestsPage})))
const MapsPage=lazy(()=>import('./pages/MapsPage').then(module=>({default:module.MapsPage})))
const PilotUsagePage=lazy(()=>import('./pages/PilotUsagePage').then(module=>({default:module.PilotUsagePage})))

const EnrollmentAdminPage=lazy(()=>import('./pages/EnrollmentPages').then(m=>({default:m.EnrollmentAdminPage})))
const MySchoolsPage=lazy(()=>import('./pages/EnrollmentPages').then(m=>({default:m.MySchoolsPage})))
const InstitutionSettingsPage=lazy(()=>import('./pages/InstitutionSettingsPage').then(m=>({default:m.InstitutionSettingsPage})))

function Setup(){return <div className="setup"><div className="setup-mark">✦</div><h1>StudySphere is ready to connect</h1><p>Add the Supabase and API settings in <code>.env.local</code>, run the database migration, and restart the app. The setup guide in README.md has each step.</p></div>}
function Protected(){const {user,profile,loading}=useAuth();if(loading)return <Loading/>;if(!user)return <Navigate to="/login" replace/>;if(!user.email_confirmed_at)return <Navigate to="/verify-email" replace state={{email:user.email}}/>;if(!profile)return <div className="setup"><h1>Finishing your account</h1><p>Your profile is still being prepared. Refresh shortly or contact support if this continues.</p></div>;return <InstitutionProvider key={user.id}><AppShell><Suspense fallback={<Loading/>}><RoleRoutes/></Suspense></AppShell></InstitutionProvider>}
function RoleRoutes(){const {profile}=useAuth();if(profile?.role==='student')return <Routes><Route index element={<StudentDashboard/>}/><Route path="schools" element={<MySchoolsPage/>}/><Route path="learn" element={<LearnPage/>}/><Route path="learn/:subjectId/:chapterId/:topicId" element={<LessonPage/>}/><Route path="practice" element={<PracticePage/>}/><Route path="flashcards" element={<FlashcardsPage/>}/><Route path="plan" element={<PlanPage/>}/><Route path="maps" element={<Suspense fallback={<Loading/>}><MapsPage/></Suspense>}/><Route path="tutor" element={<TutorPage/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="*" element={<Navigate to="/app" replace/>}/></Routes>
  if(profile?.role==='parent')return <Routes><Route index element={<ParentDashboard/>}/><Route path="schools" element={<MySchoolsPage/>}/><Route path="children" element={<ChildrenPage/>}/><Route path="children/:studentId" element={<ChildProgressPage/>}/><Route path="settings" element={<SettingsPage/>}/><Route path="*" element={<Navigate to="/app" replace/>}/></Routes>
  return <Routes><Route index element={<StaffDashboard/>}/><Route path="content" element={<ContentStudio/>}/><Route path="assessments" element={<AssessmentsPage/>}/><Route path="curriculum" element={<CurriculumPage/>}/>{(profile?.role==='school_admin'||profile?.role==='platform_admin')&&<><Route path="schools" element={<SchoolsPage/>}/><Route path="enrollments" element={<EnrollmentAdminPage/>}/><Route path="institution-settings" element={<InstitutionSettingsPage/>}/></>}{profile?.role==='platform_admin'&&<Route path="privacy-requests" element={<PrivacyRequestsPage/>}/>}{(profile?.role==='platform_admin'||profile?.role==='school_admin')&&<Route path="pilot-usage" element={<PilotUsagePage/>}/>}<Route path="settings" element={<SettingsPage/>}/><Route path="*" element={<Navigate to="/app" replace/>}/></Routes>
}
export default function App(){if(!configured)return <Setup/>;return <AuthProvider><Routes><Route path="/" element={<Navigate to="/app" replace/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/verify-email" element={<VerifyEmailPage/>}/><Route path="/reset-password" element={<ResetPasswordPage/>}/><Route path="/privacy" element={<PrivacyPage/>}/><Route path="/app/*" element={<Protected/>}/><Route path="*" element={<Navigate to="/app" replace/>}/></Routes></AuthProvider>}

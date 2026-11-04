import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, GraduationCap, ShieldCheck, Sparkles } from 'lucide-react'

export function AuthLayout({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`auth-page ${className}`.trim()}>
    <section className="auth-intro">
      <Link className="auth-brand" to="/"><GraduationCap size={30}/> StudySphere</Link>
      <div className="auth-intro-copy">
        <h1>Learning grows here.</h1>
        <p>One thoughtful space for lessons, practice, and the guidance every learner deserves.</p>
        <div className="auth-benefits">
          <span><BookOpen size={18}/> Curriculum that fits your school</span>
          <span><Sparkles size={18}/> Helpful AI grounded in lessons</span>
          <span><ShieldCheck size={18}/> A private space for every child</span>
        </div>
      </div>
      <small>StudySphere AI · Built for curious minds</small>
    </section>
    <section className="auth-form-wrap"><div className="auth-form">{children}</div></section>
  </div>
}

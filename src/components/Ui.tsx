import type { ReactNode } from 'react'
import { AlertCircle, LoaderCircle } from 'lucide-react'

export function Button({children,variant='primary',...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'ghost'}) {
  return <button className={`button button-${variant}`} {...props}>{children}</button>
}
export function Field({label,children,hint}: {label:string;children:ReactNode;hint?:string}) {
  return <label className="field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>
}
export function ErrorNotice({message}:{message:string|null}) { return message ? <div className="notice error" role="alert"><AlertCircle size={18}/>{message}</div> : null }
export function EmptyState({title,description,action}:{title:string;description:string;action?:ReactNode}) { return <div className="empty"><div className="empty-symbol">✦</div><h3>{title}</h3><p>{description}</p>{action}</div> }
export function Loading({label='Loading your workspace…'}:{label?:string}) { return <div className="loading"><LoaderCircle className="spin" size={24}/>{label}</div> }

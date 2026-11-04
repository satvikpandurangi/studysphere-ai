export type Role = 'parent' | 'student' | 'editor' | 'school_admin' | 'platform_admin'
export type Profile = { id: string; full_name: string; role: Role; created_at: string }
export type School = { id: string; name: string; city: string | null; state: string | null }
export type Board = { id: string; name: string; code: string }
export type Grade = { id: string; number: number }
export type Subject = { id: string; name: string; board_id: string; grade_id: string }
export type StudentProfile = { user_id: string; school_id: string; board_id: string; grade_id: string; approval_status: 'pending' | 'approved' | 'withdrawn' }
export type Chapter = { id: string; subject_id: string; title: string; position: number }
export type Topic = { id: string; chapter_id: string; title: string; position: number }
export type ContentKind = 'lesson' | 'note' | 'example' | 'problem' | 'pdf' | 'video'
export type ContentItem = {
  id: string; topic_id: string; school_id: string | null; kind: ContentKind; title: string;
  body_md: string | null; answer_md: string | null; hints: string[] | null;
  video_id: string | null; attribution: string | null; language: string; object_key: string | null; pdf_text: string | null;
  status: 'draft' | 'published'; position: number; version: number; updated_at: string
}
export type Flashcard = { id: string; topic_id: string; front: string; back: string; school_id: string | null }
export type Quiz = { id: string; topic_id: string; title: string; school_id: string | null; status: 'draft' | 'published' }
export type Question = { id: string; quiz_id: string; prompt: string; options: string[]; position: number }
export type PlanItem = { id: string; student_id: string; title: string; due_date: string; completed_at: string | null; subject_id: string | null }

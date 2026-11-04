import { requireSupabase } from './supabase'

export type RosterStudent = {
  id: string; student_id: string; full_name: string; status: 'active' | 'revoked'
  accepted_at: string; revoked_at: string | null; grade_number: number; board_name: string
}
export type EnrollmentInvite = { id: string; email: string; created_at: string; expires_at: string }
export type Roster = { enrollments: RosterStudent[]; invitations: EnrollmentInvite[]; staff: { id: string; user_id: string; role: 'editor' | 'school_admin'; full_name: string }[] }
export type MyEnrollment = { student_id: string; school_name: string; status: 'active' | 'revoked'; accepted_at: string }

async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireSupabase().rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const enrollment = {
  roster: (schoolId: string) => rpc<Roster>('school_enrollment_roster', { target_school: schoolId }),
  invite: (schoolId: string, email: string) => rpc<{ id: string; code: string; expiresAt: string }>('create_enrollment_invite', { target_school: schoolId, student_email: email }),
  cancel: (schoolId: string, inviteId: string) => rpc<void>('cancel_enrollment_invite', { target_school: schoolId, invite_id: inviteId }),
  revoke: (schoolId: string, studentId: string) => rpc<void>('revoke_school_enrollment', { target_school: schoolId, target_student: studentId }),
  revokeStaff: (schoolId: string, userId: string) => rpc<void>('revoke_school_staff', { target_school: schoolId, target_user: userId }),
  addStaff: (schoolId: string, email: string, role: 'editor' | 'school_admin') => rpc<void>('add_existing_school_staff', { target_school: schoolId, staff_email: email, staff_role: role }),
  accept: (code: string, studentId: string) => rpc<{ schoolId: string; schoolName: string }>('accept_enrollment_invite', { invite_code: code.trim(), target_student: studentId }),
  mine: () => rpc<MyEnrollment[]>('my_school_enrollments'),
}

import { requireSupabase } from './supabase'

export type PrivacyRequest = { id: string; user_id: string; subject_name: string; kind: 'export' | 'delete'; status: 'pending' | 'in_review' | 'fulfilled'; created_at: string; reviewed_at: string | null }
export type AccountOverview = { can_request_self: boolean; children: { id: string; name: string; grade: number }[]; requests: PrivacyRequest[] }
export type DeletionPreflight = { linkedChildren: number; staffMemberships: number; authoredItems: number; revisionAttributions: number; auditAttributions: number; matchingInvitations: number; personalAttempts: number }
export type InstitutionUsage = { schoolId: string; measuredAt: string; activeStudents: number; staff: number; publishedMaterials: number; draftMaterials: number; publishedQuizzes: number; publishedFlashcards: number; trackedPdfBytes: number }
async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireSupabase().rpc(name, args)
  if (error) throw new Error(error.message)
  return data
}
export const account = {
  overview: () => rpc<AccountOverview>('account_privacy_overview'),
  request: (kind: 'export' | 'delete', userId: string) => rpc<{ existing: boolean }>('request_account_privacy', { request_kind: kind, target_user: userId }),
  deletionPreflight: (userId: string) => rpc<DeletionPreflight>('account_deletion_preflight', { target_user: userId }),
  institutionUsage: (schoolId: string) => rpc<InstitutionUsage>('institution_usage', { target_school: schoolId }),
}

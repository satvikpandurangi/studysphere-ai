import { workerFetch } from './api'
import { requireSupabase } from './supabase'
export type PdfLimits = { maxPdfBytes: number; uploadsPaused: boolean; needsInventory: boolean }
export type PdfStorage = Omit<PdfLimits, 'needsInventory'> & { storageLimitBytes: number; accountedBytes: number; activeBytes: number; pendingBytes: number; reservedUploads: number; uncertainUploads: number; cleanupObjects: number; heldObjects: number; unverifiedObjects: number; measuredAt: string }
export function validatePdfFile(file: Pick<File, 'type' | 'size'>, limits: PdfLimits) {
  if (limits.uploadsPaused) throw new Error('PDF uploads are paused for maintenance.')
  if (limits.needsInventory) throw new Error('The operator must reconcile PDF storage before new uploads.')
  if (file.type !== 'application/pdf') throw new Error('Only PDF files are supported.')
  if (file.size < 5 || file.size > limits.maxPdfBytes) throw new Error(`PDF must be ${limits.maxPdfBytes.toLocaleString('en-IN')} bytes or smaller.`)
}
export const pdfAssets = {
  limits: () => workerFetch<PdfLimits>('/assets/limits', undefined, 'GET'),
  storage: () => workerFetch<PdfStorage>('/assets/storage', undefined, 'GET'),
  cleanup: () => workerFetch<{ removed: number; failed: number }>('/assets/cleanup', {}),
  detach: (id: string) => workerFetch<{ cleanupPending: boolean }>(`/assets/${id}`, undefined, 'DELETE'),
  async upload(id: string, file: File): Promise<{ cleanupPending: boolean; contentVersion: number }> {
    const { data: { session } } = await requireSupabase().auth.getSession()
    if (!session) throw new Error('Sign in again.')
    const base = import.meta.env.VITE_API_BASE_URL
    if (!base) throw new Error('Secure API is not configured.')
    const response = await fetch(`${base.replace(/\/$/, '')}/assets/upload/${id}`, { method: 'PUT', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/pdf' }, body: file })
    const data = await response.json() as { error?: string; cleanupPending: boolean; contentVersion: number }
    if (!response.ok) throw new Error(data.error || 'Upload was not confirmed. Reload the saved item before retrying.')
    return data
  },
}

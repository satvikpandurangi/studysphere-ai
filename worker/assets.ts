import type { SupabaseClient } from '@supabase/supabase-js'
type Actor = { user: { id: string }; profile: { role: string }; admin: SupabaseClient }
type Env = { PDF_MAX_BYTES?: string; STORAGE_LIMIT_BYTES?: string; STORAGE_BUCKET?: string }
export type PdfStorageState = { maxPdfBytes: number; storageLimitBytes: number; bucket: string; uploadsPaused: boolean; inventoryReviewed: boolean; unverifiedObjects: number; accountedBytes: number; activeBytes: number; pendingBytes: number; reservedUploads: number; uncertainUploads: number; cleanupObjects: number; measuredAt: string; revision: number }
const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
function staffRole(a: Actor) { if (!['editor', 'school_admin', 'platform_admin'].includes(a.profile.role)) throw new Error('Staff account required') }
function platform(a: Actor) { if (a.profile.role !== 'platform_admin') throw new Error('Platform administrator access required') }
async function rpc<T>(a: Actor, name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await a.admin.rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}
function cap(value: string | undefined, fallback: number) { const parsed = Number(value); return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, fallback) : fallback }
async function policy(a: Actor, env: Env) {
  const data = await rpc<PdfStorageState>(a, 'pdf_storage_state')
  if (!data || typeof data !== 'object' || !Number.isSafeInteger(data.maxPdfBytes) || data.maxPdfBytes < 5) throw new Error('PDF storage policy is unavailable; contact the operator')
  if (data.bucket !== (env.STORAGE_BUCKET || 'lesson-assets')) throw new Error('PDF storage bucket configuration needs operator review')
  return { ...data, maxPdfBytes: Math.min(15_000_000, cap(env.PDF_MAX_BYTES, data.maxPdfBytes)), storageLimitBytes: cap(env.STORAGE_LIMIT_BYTES, data.storageLimitBytes) }
}
export async function assetLimits(a: Actor, env: Env) {
  staffRole(a); const p = await policy(a, env)
  return json({ maxPdfBytes: p.maxPdfBytes, uploadsPaused: p.uploadsPaused, needsInventory: p.unverifiedObjects > 0 || !p.inventoryReviewed })
}
export async function assetStorage(a: Actor, env: Env) { platform(a); return json(await policy(a, env)) }

export async function readBoundedPdf(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/pdf') throw new Error('Only PDF files are supported')
  const declared = request.headers.get('content-length')
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new Error(`PDF must be ${maxBytes.toLocaleString('en-IN')} bytes or smaller`)
  if (!request.body) throw new Error('Choose a valid PDF')
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break
      total += value.byteLength
      if (total > maxBytes) { await reader.cancel(); throw new Error(`PDF must be ${maxBytes.toLocaleString('en-IN')} bytes or smaller`) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(total); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== '%PDF-') throw new Error('This file does not have a valid PDF header')
  return bytes
}
async function cleanup(a: Actor, contentId?: string) {
  let removed = 0, failed = 0
  try {
    const rows = await rpc<{ id: string; object_key: string; bucket: string }[]>(a, 'pdf_cleanup_candidates', { target_content: contentId ?? null })
    for (const row of rows) {
      try {
        const { error } = await a.admin.storage.from(row.bucket).remove([row.object_key])
        if (error) throw error
        await rpc(a, 'confirm_pdf_cleanup', { object_id: row.id }); removed++
      } catch { failed++ }
    }
  } catch { failed++ }
  return { removed, failed }
}
export async function retryAssetCleanup(a: Actor) { platform(a); return json(await cleanup(a)) }
export async function uploadAsset(request: Request, a: Actor, env: Env, contentId: string) {
  staffRole(a); const p = await policy(a, env)
  if (p.uploadsPaused) throw new Error('PDF uploads are paused for maintenance')
  await rpc(a, 'check_pdf_upload_access', { target_content: contentId, acting_user: a.user.id })
  const bytes = await readBoundedPdf(request, p.maxPdfBytes)
  const reserved = await rpc<{ id: string; key: string; bucket: string }>(a, 'reserve_pdf_upload', { target_content: contentId, acting_user: a.user.id, incoming_bytes: bytes.byteLength, pdf_cap: p.maxPdfBytes, storage_cap: p.storageLimitBytes })
  let confirmed = false
  let contentVersion: number
  try {
    const { error } = await a.admin.storage.from(reserved.bucket).upload(reserved.key, bytes, { contentType: 'application/pdf', cacheControl: '0', upsert: false })
    if (error) throw error
    confirmed = true
    const finalized = await rpc<{ contentVersion: number }>(a, 'finalize_pdf_upload', { upload_id: reserved.id, acting_user: a.user.id })
    contentVersion = finalized.contentVersion
  } catch {
    try { await rpc(a, 'settle_pdf_upload', { upload_id: reserved.id, acting_user: a.user.id, upload_confirmed: confirmed }) } catch { /* Reservation remains charged for operator review. */ }
    if (confirmed) await cleanup(a, contentId)
    throw new Error(confirmed ? 'PDF attachment could not be confirmed. Reload the item before retrying; the operator can inspect pending storage.' : 'PDF upload outcome is uncertain. The previous attachment is unchanged; contact the operator before retrying.')
  }
  const result = await cleanup(a, contentId)
  return json({ ok: true, cleanupPending: result.failed > 0, contentVersion })
}
export async function detachAsset(a: Actor, contentId: string) {
  staffRole(a); await rpc(a, 'detach_pdf_asset', { target_content: contentId, acting_user: a.user.id })
  const result = await cleanup(a, contentId)
  return json({ ok: true, cleanupPending: result.failed > 0 })
}

import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Read-only and paginated, including nested folders. No uploads/deletes/ledger writes.
export async function listStorageObjects(bucket) {
  const objects = []; const folders = ['']; const visited = new Set()
  for (let next = 0; next < folders.length; next++) {
    const prefix = folders[next]; if (visited.has(prefix)) continue; visited.add(prefix)
    if (prefix.split('/').length > 64 || folders.length > 100000) throw new Error('Inventory exceeds the supported scan bounds')
    let priorPage = ''
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } }, { signal: AbortSignal.timeout(30000) })
      if (error || !data) throw new Error('Storage listing failed; no complete inventory was produced')
      if (!data.length) break
      const fingerprint = JSON.stringify(data.map(row => [row.name, row.id]))
      if (fingerprint === priorPage) throw new Error('Storage pagination did not advance')
      priorPage = fingerprint
      for (const row of data) {
        if (typeof row.name !== 'string' || !row.name) throw new Error('Unexpected storage entry')
        const key = prefix ? `${prefix}/${row.name}` : row.name
        if (row.id === null) folders.push(key)
        else if (typeof row.id === 'string') {
          const observed = row.metadata?.size
          const bytes = observed !== null && observed !== undefined && Number.isSafeInteger(Number(observed)) && Number(observed) >= 0 ? Number(observed) : null
          objects.push({ key, bytes })
        } else throw new Error('Storage entry has no object/folder identity')
      }
      if (objects.length > 100000 || offset > 1000000) throw new Error('Inventory exceeds the supported scan bounds')
      if (data.length < 1000) break
    }
  }
  if (new Set(objects.map(row => row.key)).size !== objects.length) throw new Error('Duplicate storage entries; retry with writes paused')
  return objects
}
export function compareInventory(snapshot, objects, endingPolicy) {
  const ledger = new Map(snapshot.objects.map(row => [row.object_key, row]))
  const observed = new Map(objects.map(row => [row.key, row]))
  const references = new Set(snapshot.references.map(row => row.key))
  return {
    stableLedger: snapshot.policy.revision === endingPolicy.revision,
    uploadsPaused: snapshot.policy.uploadsPaused && endingPolicy.uploadsPaused,
    reservedUploads: endingPolicy.reservedUploads,
    unknownSizes: objects.filter(row => row.bytes === null).map(row => row.key),
    missingReferenced: [...references].filter(key => !observed.has(key)),
    untracked: objects.filter(row => !ledger.has(row.key)).map(row => row.key),
    unreferenced: objects.filter(row => !references.has(row.key)).map(row => row.key),
    sizeMismatches: objects.filter(row => ledger.has(row.key) && row.bytes !== ledger.get(row.key).bytes).map(row => row.key),
    absentLedgerObjects: snapshot.objects.filter(row => !observed.has(row.object_key)).map(row => row.object_key),
  }
}
async function main() {
  const url = process.env.SUPABASE_URL, secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in the operator process environment; do not put secrets in command arguments.')
  const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const initial = await client.rpc('pdf_asset_inventory')
  if (initial.error || !initial.data) throw new Error('PDF ledger inventory is unavailable; verify the migration and service credentials.')
  const snapshot = initial.data
  if (process.env.STORAGE_BUCKET && process.env.STORAGE_BUCKET !== snapshot.policy.bucket) throw new Error('Configured storage bucket does not match the ledger policy.')
  const objects = await listStorageObjects(client.storage.from(snapshot.policy.bucket))
  const ending = await client.rpc('pdf_storage_state')
  if (ending.error || !ending.data) throw new Error('Could not verify inventory consistency.')
  const differences = compareInventory(snapshot, objects, ending.data)
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.local', 'storage-inventory')
  await mkdir(directory, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  await writeFile(path.join(directory, `${stamp}.json`), JSON.stringify({ measuredAt: new Date().toISOString(), readOnly: true, requiresOperatorReview: true, bucket: snapshot.policy.bucket, snapshot, objects, differences }, null, 2) + '\n')
  process.stdout.write(`Read-only inventory: ${objects.length} objects. Private report saved in .local/storage-inventory/.\nNo object or ledger record was changed. Operator review and settled-write confirmation are required.\n`)
  if (!differences.stableLedger || !differences.uploadsPaused || differences.reservedUploads || differences.unknownSizes.length) process.exitCode = 2
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main() } catch (e) { process.stderr.write((e instanceof Error ? e.message : 'Inventory failed') + '\n'); process.exitCode = 1 }
}

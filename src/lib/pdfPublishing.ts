import type { ContentItem } from './types'
type Draft = Partial<ContentItem> & Pick<ContentItem, 'topic_id' | 'kind' | 'title'>
export async function savePdfContent(input: { id: string | null; metadata: Draft; file: File }, actions: {
  save: (draft: Draft, expectedVersion?: number) => Promise<ContentItem>; upload: (id: string, file: File) => Promise<{ cleanupPending: boolean; contentVersion: number }>;
  onDraft: (id: string) => void; onAttached: () => void; onReloadRequired: () => void;
}) {
  let id = input.id
  if (!id) { id = (await actions.save({ ...input.metadata, kind: 'pdf', pdf_text: null, status: 'draft' })).id; actions.onDraft(id) }
  let result: { cleanupPending: boolean; contentVersion: number }
  try { result = await actions.upload(id, input.file) } catch (e) { actions.onReloadRequired(); throw e }
  actions.onAttached()
  // Finalization clears old searchable text and returns the attachment to draft.
  // Only apply the reviewed new text/publication after the upload is confirmed.
  let item: ContentItem
  try {
    if (!Number.isInteger(result.contentVersion) || result.contentVersion < 1) throw new Error('Attachment saved; reload the saved item before publishing.')
    item = await actions.save({ ...input.metadata, id, kind: 'pdf' }, result.contentVersion)
  } catch (e) { actions.onReloadRequired(); throw e }
  return { item, cleanupPending: result.cleanupPending }
}

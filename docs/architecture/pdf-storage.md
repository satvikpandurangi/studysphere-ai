# PDF limits, reservations and storage reconciliation

Current rollout, 29 October 2026: private hosted upload/read, anonymous/direct-Storage denial, failed replacement and enrollment revocation passed eight synthetic checks after reviewed settled inventory. One 2,810-byte synthetic PDF remains, and uploads are paused again. The [forward singleton fix](../../supabase/migrations/20261028232250_pdf_singleton_safe_updates.sql) is required because hosted Authenticator sessions enforce `safeupdate`; it keeps the safeguard and service-only grants. Full concurrency, provider failures and cleanup acceptance remain open. See [dated evidence](../history/2026-10-29-authenticated-pilot.md).

The original implementation below dates from 22 October 2026; its hosted status is the dated update above. No paid service was enabled.

## One effective file limit

The database policy defaults to **15,000,000 bytes per PDF** and **800,000,000 accounted bytes** in the private `lesson-assets` bucket. The existing asset-size constraint remains unchanged. Database policy cannot permit files above 15,000,000 bytes. Worker `PDF_MAX_BYTES`/`STORAGE_LIMIT_BYTES` settings may lower the effective limits; they cannot raise them above database policy. `STORAGE_BUCKET` must match the policy bucket. Provider limits must also be configured/verified separately.

Content studio retrieves the effective file limit from authenticated `GET /assets/limits`, validates before text extraction, and displays bytes accurately. The Worker validates MIME/header, rejects an excessive declared size, and streams with a hard byte bound even without `Content-Length`. The database checks actual byte count and capacity again when reserving. PDF header checks are not antivirus scanning or full document validation; the normal browser extraction/viewer and teacher content review remain necessary.

## Ledger and upload transaction

[202610220005_pdf_storage_ledger.sql](../../supabase/migrations/202610220005_pdf_storage_ledger.sql) adds `pdf_storage_policy` and `pdf_asset_objects`. They have RLS enabled and no anonymous/authenticated table grants. Storage RPCs are service-role-only; the Worker supplies the verified actor ID, and SQL checks actual stored platform role/school membership. A typed school label or selected branding grants no authoring access. Limits can be inspected by staff; global storage accounting/cleanup is platform-admin-only.

**Uploads start paused and require initial inventory review.** Existing content pointers, publication, searchable text and learner access remain intact. Shared legacy keys are counted once. Zero/conflicting legacy sizes require review. An initial provider scan is necessary even when metadata sizes look valid: old orphan files are absent from content rows.

Accounted capacity includes every ledger row except `removed`:

| State | Meaning | Eligible for automatic cleanup? |
| --- | --- | --- |
| `reserved` | Capacity allocated before the Storage write; outcome not settled | No |
| `active` | Current attachment, including shared legacy references | No |
| `cleanup` | Confirmed completed write retired/detached, or explicitly approved reviewed orphan | Yes, only while no content pointer references it |
| `uncertain` | Provider write outcome unknown | No |
| `retained` | Observed unreferenced object held for operator review | No |
| `removed` | Provider deletion/absence confirmed and no current reference | Already released |

Reservation locks the singleton policy row before the content row. It counts the full incoming file **in addition to** all old/reserved/uncertain/held/queued bytes. Replacement therefore needs temporary headroom for both files. One reserved/uncertain upload per content item is permitted. No capacity is freed solely by age or an HTTP failure.

The Worker checks school/global authoring access before reading the upload body. After bounded validation it reserves, writes a unique object without overwrite, then finalizes. Finalization rechecks staff authority and the content version captured at reservation. Attachment/text/publication changes happen together: the new pointer and byte size are attached, old searchable text is cleared, and the item becomes a draft. The browser then conditionally saves reviewed text/metadata/publication against the returned content version, rejecting another editor's intervening change. A failed replacement leaves the old pointer/text/publication unchanged; an ambiguous result or failed metadata save requires **Reload saved item** before further saves. A newly created failed upload keeps its draft ID. Confirmed attachments can be reviewed/saved again without reuploading the file.

An old object is queued only after no current content item references it. Shared references prevent deletion. Failed finalization after confirmed Storage upload settles through SQL; a lost finalize response cannot detach/delete an already committed attachment. Failed/ambiguous Storage writes remain charged as uncertain. Cleanup removes only SQL-authorized queued objects and releases capacity only after Storage success and a second no-reference check. Cleanup/ack failures leave rows counted for retry. The platform panel retries at most 20 queued files per action. It never sweeps uncertain or merely unrecognized files automatically.

Raw service-role pointer/size changes are blocked by a content trigger; attachments go through definer-owned transactions. Attached items cannot change type before detachment, and an unattached PDF cannot newly publish. Privileged SQL owners can still bypass operating conventions: do not treat a service key/owner console as an untrusted client. Existing content revision behavior remains; snapshots may retain obsolete object keys but the normal asset route serves only the current authorized pointer.

## Worker and browser contracts

| Method/path | Access | Behavior |
| --- | --- | --- |
| `GET /assets/limits` | Authenticated staff role | `{maxPdfBytes,uploadsPaused,needsInventory}`; effective database/environment limits |
| `PUT /assets/upload/:contentId` | Actual school/global author | Raw PDF; reserve/write/finalize; `{ok:true,cleanupPending,contentVersion}` |
| `DELETE /assets/:contentId` | Actual school/global author | Detach, clear text and return to draft; attempt queued cleanup; `{ok:true,cleanupPending}` |
| `GET /assets/:contentId` | Existing caller-visible content | Unchanged private/no-store PDF read |
| `GET /assets/storage` | Platform admin | Effective policy and ledger totals, pending/held/unknown counts and timestamp |
| `POST /assets/cleanup` | Platform admin | Retry up to 20 queued objects; `{removed,failed}` |

Global storage inspection, like `GET /pilot/usage`, bypasses Worker quota reservation only for the authenticated platform-admin monitoring read. Uploads/detachment/cleanup remain quota-counted. The existing content-metadata PDF total remains a separate metric from the new full ledger total. Neither is a provider invoice or an egress measurement.

## Read-only provider inventory

`npm run storage:inventory` requires `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the operator process environment, plus optional `STORAGE_BUCKET` which must match policy. Do not put secrets in arguments or commit environment files. It reads the ledger, recursively lists provider folders with pagination, then rechecks ledger revision. Folder/file handling and offset pagination follow the [Supabase list reference](https://supabase.com/docs/reference/javascript/storage-from-list) and the installed SDK.

The command writes a **private** JSON report under ignored `.local/storage-inventory/`: observed keys/sizes, references, unknown sizes, missing references, untracked/unreferenced files, size discrepancies and ledger stability. It never downloads, uploads, deletes or updates records. Exit 2 means paused/stable/settled prerequisites need attention; exit 1 means no complete report could be produced. A stable report alone does not approve deletion or prove that out-of-band writes have stopped. Scans are bounded (100,000 objects/folders, depth 64) and fail rather than silently truncate. Missing/invalid size metadata is unknown, never guessed as zero.

## Service RPC reference

These functions are restricted to service-role execution; ordinary browser/platform JWTs cannot bypass the Worker with them. Operator maintenance functions additionally require a stored platform-admin actor and explicit confirmation.

| Function | Purpose |
| --- | --- |
| `pdf_storage_state()` | Policy, ledger bytes/counts, revision and measurement time |
| `check_pdf_upload_access(target_content,acting_user)` | Authoring precheck before body consumption |
| `reserve_pdf_upload(target_content,acting_user,incoming_bytes,pdf_cap,storage_cap)` | Locked capacity allocation; returns `{id,key,bucket}` |
| `finalize_pdf_upload(upload_id,acting_user)` | Version/permission recheck and atomic draft attachment; returns content version for conditional metadata save |
| `settle_pdf_upload(upload_id,acting_user,upload_confirmed)` | Failed upload to uncertain, or unattached confirmed write to cleanup; never detaches an active attachment |
| `detach_pdf_asset(target_content,acting_user)` | Authorized detach/draft/text clearing and retirement |
| `pdf_cleanup_candidates(target_content default null)` | Up to 20 queued, currently unreferenced objects |
| `confirm_pdf_cleanup(object_id)` | Release only a queued, still-unreferenced row after provider deletion |
| `pdf_asset_inventory()` | Private ledger/reference snapshot for inventory tooling |
| `mark_abandoned_pdf_upload(upload_id,acting_user,confirmed_settled)` | While paused, move a reservation older than one hour to uncertain after verified settled writes; no capacity release |
| `reconcile_pdf_asset(acting_user,asset_key,actual_bytes,expected_revision,confirmed_settled)` | While paused with no reservations and current revision, record observed size/presence; null size means verified absent |
| `approve_pdf_object_cleanup(acting_user,asset_key,expected_revision,confirmed_delete)` | Explicitly queue an inspected, retained, unreferenced object for deletion during maintenance |
| `complete_pdf_storage_review(acting_user,expected_revision,confirmed_settled)` | Confirm completed inventory and resume uploads only after pending writes/unknown sizes are resolved |

Reconciliation never silently removes a missing referenced PDF: restore it or deliberately detach through the normal authorized path. Present unreferenced files become retained and counted. Existing queued files stay queued. Unknown/orphan cleanup requires a **separate explicit deletion approval** after ownership/purpose review. Above-limit legacy objects are charged at their observed full size; metadata remains under its original 15,000,000-byte constraint and needs operator replacement/detachment review.

## Migration, maintenance and recovery

1. Back up database/private objects, inspect applied migrations, validate the actual private bucket and stop the old uploader and all other service-key writers **before** applying this migration. Old Workers can create untracked objects before their now-blocked pointer update fails. Arrange an authorized upload maintenance window; do not mix old/new upload protocols.
2. Apply after prior migrations and deploy compatible Worker/frontend. Configure a non-default bucket in policy only after verifying it against the real legacy bucket/environment. Keep the bucket private and prevent direct client uploads. Existing reads retain their caller checks; uploads remain paused.
3. Scan provider inventory. Confirm all writes have settled. Lost reservations are not automatically expired: during later maintenance, pause via an owner-console policy update (including `revision=revision+1`), resolve live work, and use abandoned-write review only after actual settled-write verification and the one-hour minimum. This minimum is not proof by itself.
4. Use the inspected report to reconcile each discrepant object with the current revision. Confirm actual presence/size before declaring absence. Missing referenced resources need restore/detach. Newly discovered files stay retained/charged until purpose/ownership and deletion approval are explicit. Do not bulk-delete everything absent from content metadata.
5. Refresh inventory between changes; ledger mutations advance its revision. Run `complete_pdf_storage_review` with the current revision only after full review, no unresolved reserved/uncertain writes and no unknown sizes. Retained/queued files remain charged. This explicit confirmation is an operator attestation, not an automatic provider consistency proof.
6. Exercise exact-limit/oversized/chunked uploads, two simultaneous uploads near capacity, simultaneous same-item replacement, mid-upload edits/revocation, ambiguous provider/finalize responses, shared legacy references and cleanup retries in hosted staging. Confirm ordinary learning/private reads during upload maintenance and restored metadata/publication after failures.

Fix forward and preserve the ledger on failure. Do not roll back to the old uploader against this schema or manually drop reservations to make room. Physical capacity is protected for the managed protocol after reviewed inventory; out-of-band service writes/provider behavior still require reconciliation and monitoring. Retention/pruning of removed ledger rows, provider billing/egress and large-scale performance remain operational work. No scheduled cleanup or automatic orphan deletion was added.

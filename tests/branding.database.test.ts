import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

let pg: PGlite
const admin = '60000000-0000-4000-8000-000000000001'
const otherAdmin = '60000000-0000-4000-8000-000000000002'
const editor = '60000000-0000-4000-8000-000000000003'
const student = '60000000-0000-4000-8000-000000000004'
const typedOnly = '60000000-0000-4000-8000-000000000005'
const parent = '60000000-0000-4000-8000-000000000006'
const platform = '60000000-0000-4000-8000-000000000007'
const school = '70000000-0000-4000-8000-000000000001'
const otherSchool = '70000000-0000-4000-8000-000000000002'
const logo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZsAAAAASUVORK5CYII='
type Workspace = { id: string; name: string; can_manage: boolean; branding: { display_name: string | null; version: number; logo_data_url: string | null } | null }
async function as<T>(actor: string, sql: string, args: unknown[] = []) {
  await pg.exec('savepoint branding_case')
  try {
    await pg.query("select set_config('request.jwt.claim.sub',$1,true)", [actor]); await pg.exec('set local role authenticated')
    const result = await pg.query<T>(sql, args)
    await pg.exec('reset role; release savepoint branding_case'); return result.rows
  } catch (error) { await pg.exec('rollback to savepoint branding_case; release savepoint branding_case'); throw error }
}
async function workspaces(actor = student) { return (await as<{ value: Workspace[] }>(actor, 'select public.institution_workspaces() as value'))[0].value }
async function save(actor = admin, settings: object = { display_name: 'New Academy', logo_data_url: logo }, version: number | null = 0, id = school) {
  return (await as<{ value: { version: number; display_name: string | null } }>(actor, 'select public.save_institution_branding($1,$2,$3) as value', [id, JSON.stringify(settings), version]))[0].value
}
beforeAll(async () => {
  pg = new PGlite()
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;`)
  for (const file of ['202609220001_initial.sql', '20260925005545_move_lesson_assets_to_supabase_storage.sql', '20260925013000_typed_school_signup.sql', '202610220001_verified_enrollment.sql', '202610220002_assessment_lifecycle.sql']) {
    await pg.exec((await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')).replace('create extension if not exists pgcrypto;', ''))
  }
  for (const id of [admin, otherAdmin, editor, student, typedOnly, parent, platform]) await pg.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())', [id, `${id}@example.test`])
  await pg.query("update public.profiles set role='school_admin' where id in ($1,$2)", [admin, otherAdmin])
  await pg.query("update public.profiles set role='editor' where id=$1", [editor])
  await pg.query("update public.profiles set role='student' where id in ($1,$2)", [student, typedOnly])
  await pg.query("update public.profiles set role='platform_admin' where id=$1", [platform])
  await pg.query("insert into public.schools(id,name) values($1,'Original School A'),($2,'School B')", [school, otherSchool])
  await pg.query("insert into public.memberships(user_id,school_id,role) values($1,$2,'school_admin'),($3,$4,'school_admin'),($5,$2,'editor')", [admin, school, otherAdmin, otherSchool, editor])
  const subject = (await pg.query<{ id: string; board_id: string; grade_id: string }>('select s.* from public.subjects s join public.grades g on g.id=s.grade_id where g.number=6 limit 1')).rows[0]
  for (const id of [student, typedOnly]) {
    await pg.query("insert into public.student_profiles(user_id,school_id,board_id,grade_id,approval_status) values($1,$2,$3,$4,'approved')", [id, school, subject.board_id, subject.grade_id])
    await pg.query('insert into public.student_subjects values($1,$2)', [id, subject.id])
  }
  await pg.query('insert into public.school_enrollments(school_id,student_id) values($1,$2)', [school, student])
  await pg.query("insert into public.guardian_links(parent_id,student_id,status) values($1,$2,'approved')", [parent, student])
  await pg.exec(await readFile(new URL('../supabase/migrations/202610220003_institution_branding.sql', import.meta.url), 'utf8'))
}, 60000)
beforeEach(async () => { await pg.exec('begin') })
afterEach(async () => { await pg.exec('rollback') })
afterAll(async () => { await pg?.close() })

describe('institution branding authorization and migration', () => {
  it('keeps canonical school and academic/enrollment records unchanged', async () => {
    expect((await workspaces())[0]).toMatchObject({ id: school, name: 'Original School A', can_manage: false, branding: null })
    await save()
    expect((await pg.query('select name from public.schools where id=$1', [school])).rows[0].name).toBe('Original School A')
    expect((await pg.query('select school_id,approval_status from public.student_profiles where user_id=$1', [student])).rows[0]).toEqual({ school_id: school, approval_status: 'approved' })
    expect((await pg.query('select status from public.school_enrollments where student_id=$1', [student])).rows[0].status).toBe('active')
  })
  it('exposes branding only to members, enrolled learners and approved guardians', async () => {
    await save()
    for (const actor of [student, parent, editor, admin]) expect(await workspaces(actor)).toEqual([expect.objectContaining({ id: school, branding: expect.objectContaining({ display_name: 'New Academy', logo_data_url: logo }) })])
    expect(await workspaces(typedOnly)).toEqual([])
    expect((await workspaces(otherAdmin)).map(row => row.id)).toEqual([otherSchool])
    expect((await workspaces(platform)).map(row => row.id)).toEqual([school, otherSchool])
    expect((await workspaces(admin))[0].can_manage).toBe(true)
    expect((await workspaces(editor))[0].can_manage).toBe(false)
    const cached = (await as<{ value: Workspace[] }>(student, 'select public.institution_workspaces($1) as value', [JSON.stringify({ [school]: 1 })]))[0].value
    expect(cached[0].branding).not.toHaveProperty('logo_data_url')
    expect(cached[0].branding?.display_name).toBe('New Academy')
    const stale = (await as<{ value: Workspace[] }>(student, 'select public.institution_workspaces($1) as value', [JSON.stringify({ [school]: 99 })]))[0].value
    expect(stale[0].branding?.logo_data_url).toBe(logo)
  })
  it('denies cross-school admins, editors, students, parents and role-only admins on writes', async () => {
    for (const actor of [otherAdmin, editor, student, parent, typedOnly]) await expect(save(actor)).rejects.toThrow('administrator access required')
    await pg.query('delete from public.memberships where user_id=$1', [admin])
    await expect(save()).rejects.toThrow('administrator access required')
    expect((await save(platform)).version).toBe(1)
  })
  it('blocks direct table reads/writes and anonymous RPCs', async () => {
    await save()
    for (const actor of [admin, student, platform]) {
      await expect(as(actor, 'select * from public.institution_branding')).rejects.toThrow('permission denied')
      await expect(as(actor, "update public.institution_branding set display_name='Bypass'")).rejects.toThrow('permission denied')
    }
    await pg.exec('savepoint anon_case;set local role anon')
    await expect(pg.query('select public.institution_workspaces()')).rejects.toThrow('permission denied')
    await pg.exec('rollback to savepoint anon_case;release savepoint anon_case')
    await pg.exec('savepoint anon_case;set local role anon')
    await expect(pg.query("select public.save_institution_branding($1,'{}',0)", [school])).rejects.toThrow('permission denied')
    await pg.exec('rollback to savepoint anon_case;release savepoint anon_case')
  })
  it('rejects stale first/updated saves and keeps reset versions monotonic', async () => {
    await save()
    await expect(save()).rejects.toThrow('Branding changed')
    await expect(save(admin, {}, null)).rejects.toThrow('Branding changed')
    expect(await save(admin, {}, 1)).toMatchObject({ version: 2, display_name: null })
    await expect(save(admin, { display_name: 'Stale' }, 1)).rejects.toThrow('Branding changed')
    expect((await workspaces())[0].branding?.display_name).toBeNull()
    expect((await pg.query("select count(*)::int as count from public.audit_events where action='institution.branding_saved'")).rows[0].count).toBe(2)
  })
  it('validates colors/contrast and rolls invalid saves back', async () => {
    for (const data of [{ primary_color: 'red' }, { primary_color: '#ffffff' }, { accent_color: '#ffff00' }, { primary_color: '#000000;display:none' }]) await expect(save(admin, data)).rejects.toThrow('contrast')
    expect((await workspaces())[0].branding).toBeNull()
    await save(admin, { primary_color: '#123456', accent_color: '#008080' })
    expect((await pg.query('select primary_color from public.institution_branding')).rows[0].primary_color).toBe('#123456')
  })
  it('bounds logos and rejects remote/SVG images, unsafe contacts, types and unknown fields', async () => {
    for (const data of [
      { logo_data_url: 'https://tracker.example/logo.png' }, { logo_data_url: 'data:image/svg+xml;base64,PHN2Zz4=' },
      { logo_data_url: 'data:image/png;base64,' + 'A'.repeat(131100) }, { website: 'javascript:alert(1)' },
      { website: 'https://example.test/\nscript' }, { website: 'https://user:password@example.test/' },
      { support_email: 'hello@example.test\nBcc: a@example.test' }, { support_phone: '<script>' },
      { display_name: 'A'.repeat(101) }, { version: '100' }, { display_name: { html: 'x' } },
    ]) await expect(save(admin, data)).rejects.toThrow()
    await save(admin, { support_email: 'help@school.test', support_phone: '+91 (080) 1234-5678', website: 'https://school.test/help?from=workspace' })
  })
  it('supports multiple verified schools and removes revoked branding on subsequent reads', async () => {
    await pg.query('insert into public.school_enrollments(school_id,student_id) values($1,$2)', [otherSchool, student])
    expect(await workspaces()).toHaveLength(2)
    await pg.query("update public.school_enrollments set status='revoked' where school_id=$1", [school])
    expect((await workspaces()).map(row => row.id)).toEqual([otherSchool])
    expect((await workspaces(parent)).map(row => row.id)).toEqual([otherSchool])
    await pg.query('update public.schools set active=false where id=$1', [otherSchool])
    expect(await workspaces()).toEqual([])
  })
  it('removes guardian/paused-account access without changing staff authority', async () => {
    await pg.query("update public.guardian_links set status='withdrawn'")
    expect(await workspaces(parent)).toEqual([])
    await pg.query("update public.student_profiles set approval_status='withdrawn' where user_id=$1", [student])
    expect(await workspaces()).toEqual([])
    expect(await workspaces(editor)).toHaveLength(1)
    await pg.query('delete from public.memberships where user_id=$1', [editor])
    expect(await workspaces(editor)).toEqual([])
  })
})

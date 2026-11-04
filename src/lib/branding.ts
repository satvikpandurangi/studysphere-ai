import type { CSSProperties } from 'react'
import { requireSupabase } from './supabase'
import type { Role } from './types'

export type BrandingSettings = {
  display_name: string | null; logo_data_url: string | null; primary_color: string; accent_color: string;
  support_email: string | null; support_phone: string | null; website: string | null;
}
export type InstitutionBranding = BrandingSettings & { school_id: string; version: number; updated_at: string }
export type InstitutionWorkspace = { id: string; name: string; can_manage: boolean; branding: InstitutionBranding | null }
// Presentation must come from verified membership, never a typed school label
// or an arbitrary first result. Ambiguous/multi-school accounts stay neutral.
export function automaticInstitution(rows: InstitutionWorkspace[], role?: Role) {
  return role && role !== 'platform_admin' && rows.length === 1 ? rows[0] : null
}
export const defaultBranding: BrandingSettings = {
  display_name: null, logo_data_url: null, primary_color: '#2167e9', accent_color: '#15977e',
  support_email: null, support_phone: null, website: null,
}
export function whiteContrast(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return 0
  const rgb = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 1.05 / (rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 + 0.05)
}
export function brandingStyle(settings?: BrandingSettings | null) {
  return settings ? { '--institution-primary': settings.primary_color, '--institution-accent': settings.accent_color } as CSSProperties : undefined
}
export const branding = {
  async workspaces(cached: InstitutionWorkspace[] = []): Promise<InstitutionWorkspace[]> {
    const known_versions = Object.fromEntries(cached.filter(row => row.branding).map(row => [row.id, row.branding!.version]))
    const { data, error } = await requireSupabase().rpc('institution_workspaces', { known_versions })
    if (error) throw new Error(error.message)
    return (data ?? []).map((row: InstitutionWorkspace) => {
      if (row.branding && row.branding.logo_data_url === undefined) {
        const previous = cached.find(item => item.id === row.id && item.branding?.version === row.branding?.version)
        return { ...row, branding: { ...row.branding, logo_data_url: previous?.branding?.logo_data_url ?? null } }
      }
      return row
    })
  },
  async save(schoolId: string, settings: BrandingSettings, version: number): Promise<InstitutionBranding> {
    const { data, error } = await requireSupabase().rpc('save_institution_branding', { target_school: schoolId, settings, expected_version: version })
    if (error) throw new Error(error.message)
    return data
  },
}

export async function readBrandLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 96 * 1024) {
    throw new Error('Choose a PNG, JPEG or WebP image up to 96 KB.')
  }
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read this image.'))
    reader.readAsDataURL(file)
  })
  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => img.width > 0 && img.height > 0 && img.width <= 1024 && img.height <= 1024
      ? resolve() : reject(new Error('Use an image no larger than 1024 × 1024 pixels.'))
    img.onerror = () => reject(new Error('This file could not be opened as an image.'))
    img.src = url
  })
  return url
}

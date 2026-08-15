// One entry per Tailwind hue (excluding the grayscale families), so that as long as the number
// of categories in use doesn't exceed the palette size, every category gets its own color.
// Ordered by a stride-6 permutation of the rainbow order (order[k] = (k * 6) % 17, stride
// coprime with the 17-entry length) so adjacent indices land on maximally distinct hues instead
// of neighboring hue families like amber/yellow/lime or teal/cyan/sky.
const PALETTE = [
  'bg-red-100 text-black dark:bg-red-900 dark:text-white',
  'bg-emerald-100 text-black dark:bg-emerald-900 dark:text-white',
  'bg-violet-100 text-black dark:bg-violet-900 dark:text-white',
  'bg-orange-100 text-black dark:bg-orange-900 dark:text-white',
  'bg-teal-100 text-black dark:bg-teal-900 dark:text-white',
  'bg-purple-100 text-black dark:bg-purple-900 dark:text-white',
  'bg-amber-100 text-black dark:bg-amber-900 dark:text-white',
  'bg-cyan-100 text-black dark:bg-cyan-900 dark:text-white',
  'bg-fuchsia-100 text-black dark:bg-fuchsia-900 dark:text-white',
  'bg-yellow-100 text-black dark:bg-yellow-900 dark:text-white',
  'bg-sky-100 text-black dark:bg-sky-900 dark:text-white',
  'bg-pink-100 text-black dark:bg-pink-900 dark:text-white',
  'bg-lime-100 text-black dark:bg-lime-900 dark:text-white',
  'bg-blue-100 text-black dark:bg-blue-900 dark:text-white',
  'bg-rose-100 text-black dark:bg-rose-900 dark:text-white',
  'bg-green-100 text-black dark:bg-green-900 dark:text-white',
  'bg-indigo-100 text-black dark:bg-indigo-900 dark:text-white',
]

/**
 * Picks the palette entry for the given round-robin index (e.g. the count of categories that
 * existed before this one, including archived ones). Called once at category creation time
 * (and at migration backfill time); the result is stored on the category row and never
 * recomputed, so it's independent of any other category being archived/deleted/created.
 */
export function colorForIndex(index: number): string {
  return PALETTE[index % PALETTE.length]!
}

/** Fallback for categories that predate stored colors or lack one for any other reason. */
export const FALLBACK_CATEGORY_COLOR =
  'border border-neutral-300 text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'

export interface CategoryColorRoles {
  /** Saturated color for the 8px identity dot / proportional bar fill. */
  dot: string
  /** Very light tint background for chips, pills, and highlighted rows. */
  tint: string
  /** Text color, readable (AA) on top of `tint`. */
  text: string
}

/**
 * dot/tint/text roles per hue family, in the same order as PALETTE, so a category's role triple
 * is derived from the same hue family that colorForIndex already assigned it — same hue in, same
 * three roles out, everywhere.
 */
const ROLE_BY_FAMILY: Record<string, CategoryColorRoles> = {
  red: { dot: '#ef4444', tint: '#fee2e2', text: '#b91c1c' },
  emerald: { dot: '#10b981', tint: '#d1fae5', text: '#047857' },
  violet: { dot: '#8b5cf6', tint: '#ede9fe', text: '#6d28d9' },
  orange: { dot: '#f97316', tint: '#ffedd5', text: '#c2410c' },
  teal: { dot: '#14b8a6', tint: '#ccfbf1', text: '#0f766e' },
  purple: { dot: '#a855f7', tint: '#f3e8ff', text: '#7e22ce' },
  amber: { dot: '#f59e0b', tint: '#fef3c7', text: '#b45309' },
  cyan: { dot: '#06b6d4', tint: '#cffafe', text: '#0e7490' },
  fuchsia: { dot: '#d946ef', tint: '#fae8ff', text: '#a21caf' },
  yellow: { dot: '#eab308', tint: '#fef9c3', text: '#a16207' },
  sky: { dot: '#0ea5e9', tint: '#e0f2fe', text: '#0369a1' },
  pink: { dot: '#ec4899', tint: '#fce7f3', text: '#be185d' },
  lime: { dot: '#84cc16', tint: '#ecfccb', text: '#4d7c0f' },
  blue: { dot: '#3b82f6', tint: '#dbeafe', text: '#1d4ed8' },
  rose: { dot: '#f43f5e', tint: '#ffe4e6', text: '#be123c' },
  green: { dot: '#22c55e', tint: '#dcfce7', text: '#15803d' },
  indigo: { dot: '#6366f1', tint: '#e0e7ff', text: '#4338ca' },
}

const FALLBACK_ROLES: CategoryColorRoles = { dot: '#8b9096', tint: '#f4f4f2', text: '#5c6166' }

/** Extracts the hue family (e.g. "red") from a stored `bg-{family}-100 ...` color class string. */
function hueFamilyOf(colorClass: string | undefined): string | undefined {
  return colorClass?.match(/bg-(\w+)-100/)?.[1]
}

/**
 * Derives the dot/tint/text presentation roles for a category from its existing deterministic
 * hue assignment (`category.color`, set once at creation by `colorForIndex`). Same category ->
 * same hue -> same three roles, every time, everywhere it's called.
 */
export function getCategoryColorRoles(category: { color?: string } | undefined): CategoryColorRoles {
  const family = hueFamilyOf(category?.color)
  if (family && family in ROLE_BY_FAMILY) {
    return ROLE_BY_FAMILY[family]!
  }
  return FALLBACK_ROLES
}

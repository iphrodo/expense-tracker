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

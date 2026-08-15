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
 * Assigns each category id a color, guaranteeing distinct colors across all ids as long as
 * their count doesn't exceed the palette size (ids beyond that wrap and repeat). Order is by
 * id ascending, which is stable across renders/sessions since ids don't change.
 */
export function assignCategoryColors(categoryIds: Iterable<number>): Map<number, string> {
  const sortedIds = [...new Set(categoryIds)].sort((a, b) => a - b)
  return new Map(sortedIds.map((id, index) => [id, PALETTE[index % PALETTE.length]!]))
}

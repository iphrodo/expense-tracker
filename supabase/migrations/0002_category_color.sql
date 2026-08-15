-- Adds a stored display color per category (see openspec/changes/delete-categories/design.md).
-- Color is assigned once at creation time and never recomputed, so archiving/deleting a
-- category can never change another category's color.
--
-- Also relaxes the `categories.name` uniqueness to only apply among non-archived rows, since
-- deleting (archiving) a category and re-creating one with the same name must be possible.

alter table categories add column color text;

with palette(idx, color) as (
  values
    (0, 'bg-red-100 text-black dark:bg-red-900 dark:text-white'),
    (1, 'bg-emerald-100 text-black dark:bg-emerald-900 dark:text-white'),
    (2, 'bg-violet-100 text-black dark:bg-violet-900 dark:text-white'),
    (3, 'bg-orange-100 text-black dark:bg-orange-900 dark:text-white'),
    (4, 'bg-teal-100 text-black dark:bg-teal-900 dark:text-white'),
    (5, 'bg-purple-100 text-black dark:bg-purple-900 dark:text-white'),
    (6, 'bg-amber-100 text-black dark:bg-amber-900 dark:text-white'),
    (7, 'bg-cyan-100 text-black dark:bg-cyan-900 dark:text-white'),
    (8, 'bg-fuchsia-100 text-black dark:bg-fuchsia-900 dark:text-white'),
    (9, 'bg-yellow-100 text-black dark:bg-yellow-900 dark:text-white'),
    (10, 'bg-sky-100 text-black dark:bg-sky-900 dark:text-white'),
    (11, 'bg-pink-100 text-black dark:bg-pink-900 dark:text-white'),
    (12, 'bg-lime-100 text-black dark:bg-lime-900 dark:text-white'),
    (13, 'bg-blue-100 text-black dark:bg-blue-900 dark:text-white'),
    (14, 'bg-rose-100 text-black dark:bg-rose-900 dark:text-white'),
    (15, 'bg-green-100 text-black dark:bg-green-900 dark:text-white'),
    (16, 'bg-indigo-100 text-black dark:bg-indigo-900 dark:text-white')
),
ranked as (
  select id, (row_number() over (order by id) - 1) % 17 as idx
  from categories
)
update categories c
set color = p.color
from ranked r
join palette p on p.idx = r.idx
where c.id = r.id;

alter table categories alter column color set not null;

alter table categories drop constraint categories_name_key;
create unique index categories_name_active_unique on categories (name) where not is_archived;

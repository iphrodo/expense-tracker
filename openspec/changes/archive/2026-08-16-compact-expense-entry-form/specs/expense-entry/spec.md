## MODIFIED Requirements

### Requirement: Category selection supports keyboard type-ahead and mouse chips
The entry screen SHALL present categories as chips that are visible without opening a dropdown or
other overlay, ordered by a recency-weighted frequency score, most-likely-next first, laid out on a
single horizontally-scrolling line that never wraps onto a second row — this remains a
mouse/pointer affordance. Independently, `Tab` from the amount field SHALL move focus to a category
field that supports keyboard-only selection: typing a prefix filters the category list, and arrow
keys or continued typing select a match, without requiring a dropdown to be opened with a pointer.
The keyboard path SHALL be sufficient on its own — a user SHALL be able to select any category
using only the keyboard. When a category is chosen through the full category picker (see below) and
it is not already visible among the chips, it SHALL be promoted into the visible chip line so it is
immediately available for reselection.

#### Scenario: Category chips never wrap and scroll horizontally
- **WHEN** the entry screen renders its quick-access category chips and there are more chips than
  fit within the available width
- **THEN** the chips remain on a single line and the row scrolls horizontally instead of wrapping
  onto a second row

#### Scenario: Usual categories fit above the fold on desktop
- **WHEN** the entry screen is rendered on a desktop-sized viewport with the user's category
  history available
- **THEN** the user's most recently-and-frequently used categories are rendered as chips on the
  scrolling chip row, with no vertical scrolling of the page required to see the row itself

#### Scenario: Full category list requires an extra tap on the chip path
- **WHEN** the desired category is not among the visible chips
- **THEN** the user must tap the "All" (or, on wider viewports, "All categories") pill to open the
  full searchable category picker before finding it via the mouse path

#### Scenario: Picking a category from the full picker promotes it into the chip row
- **WHEN** the user selects a category from the full category picker that was not already shown
  among the visible chips
- **THEN** that category appears among the visible chips immediately afterward, without requiring a
  reload or a new transaction to be saved first

#### Scenario: Category is selectable by keyboard alone
- **WHEN** the user presses `Tab` from the amount field, types a prefix that matches a category
  name, and confirms the match with the keyboard (arrow key plus `Enter`, or continued typing to
  an unambiguous match)
- **THEN** that category is selected without the user touching a mouse or trackpad at any point

### Requirement: Category chips and search results are rendered with the category's display color
The quick-access category chips SHALL be rendered with each category's deterministic display
color (the same color mapping used elsewhere in the system for that category), rather than as
plain uncolored outlined pills. The category search results — both the keyboard type-ahead matches
and the full category picker's matches — SHALL also render each matched category with that same
color. The selected/highlighted state of a chip or match SHALL remain visually distinguishable from
its unselected state while still conveying the category's color. A category's display color SHALL
be a fixed attribute assigned once when the category is created, not recomputed from the current
set of categories, so that archiving, deleting, or creating any other category SHALL NOT change the
display color of a category that itself was not modified. Chips, type-ahead matches, and full
category picker results SHALL only ever include non-archived categories.

#### Scenario: Quick-access chips show category colors
- **WHEN** the entry form renders its quick-access category chips
- **THEN** each chip is styled with its category's deterministic display color, not a plain
  uncolored outline

#### Scenario: Type-ahead matches show category colors
- **WHEN** the user types a prefix into the keyboard category field and matching categories appear
- **THEN** each matched category in the list is rendered with its deterministic display color

#### Scenario: "More" search dropdown matches show category colors
- **WHEN** the user opens the full category picker (the successor to the old "more" search
  dropdown) and types a query that matches existing categories
- **THEN** each matched category in the picker's results is rendered with its deterministic display
  color

#### Scenario: Selected chip remains distinguishable from unselected chips
- **WHEN** a category chip is selected
- **THEN** the selected chip is visually distinguishable from unselected chips (e.g. via a border,
  weight, or highlight change) while still showing its category color

#### Scenario: A category's color is unaffected by deleting a different category
- **WHEN** a category `A` is deleted (archived) while a different, unaffected category `B` remains
- **THEN** category `B`'s display color after the deletion is identical to its display color before
  the deletion

## ADDED Requirements

### Requirement: Entry form uses a compact, height-bounded responsive layout
The entry form SHALL fit within 3 rows on narrow (mobile-width) viewports and within 2 rows on
viewports at or above 900px wide, so that it does not push the transaction list far below the fold.
On narrow viewports the form's total height SHALL NOT exceed 160px, excluding any transient inline
validation message and excluding the optional note-input row described below. No row's contents
SHALL wrap onto an additional line as a side effect of viewport width; where content would
otherwise overflow, it SHALL scroll horizontally instead (see the category chip requirement above)
or be truncated to a shorter label rather than wrapping.

The note field, when expanded via its toggle, SHALL appear as one additional row beneath the form's
otherwise-fixed row count, and SHALL collapse back out of the layout after its containing form is
either saved or the toggle is used again.

#### Scenario: Form height is bounded on a narrow viewport
- **WHEN** the entry form is rendered at a mobile-width viewport with no inline validation message
  showing and the note field collapsed
- **THEN** the form's rendered height does not exceed 160px

#### Scenario: Row count does not grow with viewport width
- **WHEN** the entry form is rendered at a viewport at or above 900px wide
- **THEN** the form occupies at most 2 rows (plus, if expanded, the note row)

#### Scenario: Expanding the note field adds exactly one row
- **WHEN** the user expands the note field via its toggle
- **THEN** the form's row count increases by exactly one, and returns to its prior count after the
  note field is collapsed again (via a save or via the toggle)

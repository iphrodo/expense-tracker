## MODIFIED Requirements

### Requirement: Category chips and search results are rendered with the category's display color
The quick-access category chips SHALL be rendered using each category's `tint` color as the chip
background and `text` color as the chip foreground, with no border, rather than as plain
uncolored outlined pills. The category search results — both the keyboard type-ahead matches and
the "more" search dropdown matches — SHALL also render each matched category using that same
`tint`/`text` styling. The selected/highlighted state of a chip or match SHALL remain visually
distinguishable from its unselected state — shown as a ring in the category's `dot` color around
the chip — while still conveying the category's tint and text colors. A category's underlying hue
assignment SHALL be a fixed attribute assigned once when the category is created, not recomputed
from the current set of categories, so that archiving, deleting, or creating any other category
SHALL NOT change the `dot`/`tint`/`text` roles of a category that itself was not modified. Chips,
type-ahead matches, and "more" search results SHALL only ever include non-archived categories.

#### Scenario: Quick-access chips show category colors
- **WHEN** the entry form renders its quick-access category chips
- **THEN** each chip is styled with its category's `tint` background and `text` foreground, with no
  border, not a plain uncolored outline

#### Scenario: Type-ahead matches show category colors
- **WHEN** the user types a prefix into the keyboard category field and matching categories appear
- **THEN** each matched category in the list is rendered with its `tint`/`text` roles

#### Scenario: "More" search dropdown matches show category colors
- **WHEN** the user opens the "more" search field and types a query that matches existing
  categories
- **THEN** each matched category in the dropdown is rendered with its `tint`/`text` roles

#### Scenario: Selected chip remains distinguishable from unselected chips
- **WHEN** a category chip is selected
- **THEN** the selected chip shows a ring in the category's `dot` color around it, distinguishing
  it from unselected chips, while still showing its `tint`/`text` colors

#### Scenario: A category's color is unaffected by deleting a different category
- **WHEN** a category `A` is deleted (archived) while a different, unaffected category `B` remains
- **THEN** category `B`'s `dot`/`tint`/`text` roles after the deletion are identical to its roles
  before the deletion

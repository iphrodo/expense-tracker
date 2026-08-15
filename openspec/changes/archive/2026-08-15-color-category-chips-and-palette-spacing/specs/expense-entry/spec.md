## ADDED Requirements

### Requirement: Category chips and search results are rendered with the category's display color
The quick-access category chips SHALL be rendered with each category's deterministic display
color (the same color mapping used elsewhere in the system for that category), rather than as
plain uncolored outlined pills. The category search results — both the keyboard type-ahead matches
and the "more" search dropdown matches — SHALL also render each matched category with that same
color. The selected/highlighted state of a chip or match SHALL remain visually distinguishable from
its unselected state while still conveying the category's color.

#### Scenario: Quick-access chips show category colors
- **WHEN** the entry form renders its quick-access category chips
- **THEN** each chip is styled with its category's deterministic display color, not a plain
  uncolored outline

#### Scenario: Type-ahead matches show category colors
- **WHEN** the user types a prefix into the keyboard category field and matching categories appear
- **THEN** each matched category in the list is rendered with its deterministic display color

#### Scenario: "More" search dropdown matches show category colors
- **WHEN** the user opens the "more" search field and types a query that matches existing
  categories
- **THEN** each matched category in the dropdown is rendered with its deterministic display color

#### Scenario: Selected chip remains distinguishable from unselected chips
- **WHEN** a category chip is selected
- **THEN** the selected chip is visually distinguishable from unselected chips (e.g. via a border,
  weight, or highlight change) while still showing its category color
</content>

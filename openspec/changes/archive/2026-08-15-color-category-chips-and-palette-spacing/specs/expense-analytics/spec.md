## MODIFIED Requirements

### Requirement: Each category row has a deterministic display color
Each category row in the per-category breakdown block SHALL be rendered with a background or
accent color drawn from a fixed palette and deterministically derived from the category, so the
same category always renders with the same color across renders and across sessions, without
requiring any per-category color configuration to be stored or edited by the user. The palette
SHALL order its colors so that any two categories assigned adjacent positions in that palette
have visually distinct hues, rather than ordering colors as a continuous hue progression (e.g.
consecutive same-family shades like amber/yellow/lime) that makes neighboring categories hard to
tell apart at a glance. Any other part of the system that renders a category with a color (such as
the entry form's category chips and search) SHALL use this same color mapping, so a given category
always displays with the same color everywhere it appears colored.

#### Scenario: Same category renders with the same color across months
- **WHEN** category "Продукти" is displayed in the breakdown block for two different selected
  months
- **THEN** its row is rendered with the same color in both cases

#### Scenario: A newly created category still gets a color with no configuration
- **WHEN** a category is created that has never been assigned a color by any user action
- **THEN** its row in the breakdown block still renders with a color drawn from the fixed palette,
  not left uncolored or erroring

#### Scenario: Adjacent categories in palette order are visually distinct
- **WHEN** two categories are assigned adjacent positions in the palette (e.g. palette indices 2
  and 3)
- **THEN** the two colors are drawn from visually distinct hue families rather than two shades of
  the same or a neighboring hue

#### Scenario: Same category shows the same color in the entry form and the sidebar
- **WHEN** category "Продукти" is displayed both as a quick-access chip in the entry form and as a
  row in the sidebar breakdown block
- **THEN** both renderings use the same color from the palette

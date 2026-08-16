## ADDED Requirements

### Requirement: A category can be created explicitly from the management view
The categories management view SHALL let the user create a new category by entering a name and
choosing DAILY or NON-DAILY, without first having to enter a transaction. On save, the system
SHALL assign the new category a display color automatically — the user SHALL NOT choose the color.
The assigned color SHALL be distinct from the display color of every other currently active
(non-archived) category, as long as an unused color remains in the palette; once every palette
color is already in use by an active category, the system falls back to reusing a color rather
than failing. The new category SHALL appear immediately in the management view's list, grouped
under Daily or Non-daily to match its chosen type.

#### Scenario: Creating a category assigns a color distinct from active categories
- **WHEN** the user creates a new category while at least one palette color remains unused among
  active categories
- **THEN** the category is created with a color that no other active category currently uses

#### Scenario: Created category appears in the correct group
- **WHEN** the user creates a category and selects DAILY
- **THEN** the new category appears in the management view's Daily group immediately, with its
  assigned color

#### Scenario: Duplicate name is rejected
- **WHEN** the user tries to create a category whose name matches (case-insensitively) an existing
  active category's name
- **THEN** the creation is rejected and the existing category is not modified

### Requirement: A category's name and type can be edited from the management view
The categories management view SHALL let the user edit any listed category's name and DAILY/
NON-DAILY type. The edit form SHALL be pre-filled with the category's current name and type. On
save, the category's id is unchanged, so every transaction and exclusion already referencing it
SHALL immediately reflect the updated name/type wherever the category is displayed (management
view, expense entry, analytics). Editing SHALL NOT change the category's assigned color.

#### Scenario: Renaming a category updates its history
- **WHEN** the user edits a category's name and saves
- **THEN** the category's past transactions display the new name, still linked to the same
  category id and color

#### Scenario: Changing a category's type moves it between groups
- **WHEN** the user edits a category from NON-DAILY to DAILY and saves
- **THEN** the category moves from the management view's Non-daily group to its Daily group

#### Scenario: Renaming to a duplicate name is rejected
- **WHEN** the user edits a category's name to match (case-insensitively) another existing active
  category's name
- **THEN** the edit is rejected and the category's stored name is unchanged

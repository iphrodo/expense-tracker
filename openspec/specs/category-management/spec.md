# category-management Specification

## Purpose

Lets users view all categories they've created and remove ones they no longer want to see when
selecting a category, without losing the history of transactions already recorded against them.

## Requirements

### Requirement: Categories management view lists all categories
The system SHALL provide a view where a user can see all of their non-archived categories in one
place, separate from the expense entry form.

#### Scenario: Management view lists existing categories
- **WHEN** the user opens the categories management view
- **THEN** every category that is not archived is listed, showing at least its name and its
  display color

### Requirement: A category can be deleted
The categories management view SHALL let the user delete any listed category. Deleting a category
SHALL archive it (mark it as archived) rather than permanently erasing its record, regardless of
whether the category has any transactions or exclusions referencing it. The action SHALL take
effect immediately, without a confirmation dialog, and SHALL be reachable via keyboard as well as
pointer.

#### Scenario: Deleting a category removes it from the management list
- **WHEN** the user deletes a category from the management view
- **THEN** the category is archived and no longer appears in the management view's list

#### Scenario: Deleting a category with existing transactions succeeds
- **WHEN** the user deletes a category that has one or more transactions recorded against it
- **THEN** the delete succeeds, the category is archived, and its existing transactions are
  unchanged — still showing the category's original name and color

#### Scenario: Deleting a category with no transactions succeeds the same way
- **WHEN** the user deletes a category that has zero transactions or exclusions referencing it
- **THEN** the delete succeeds via the same archive behavior as a category with history, with no
  separate "permanently delete" affordance offered

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

### Requirement: Archived categories are excluded from category selection
Once a category is archived, it SHALL NOT appear in any category-selection surface used to tag new
or edited transactions — including expense entry chips, keyboard type-ahead, and "more" search
results — and SHALL NOT be offered as a match when a user types a name that matches an archived
category (a new category with that name may be created instead).

#### Scenario: Archived category is absent from entry chips and search
- **WHEN** a category has been deleted (archived) and the user opens the expense entry form
- **THEN** that category does not appear among the quick-access chips, the keyboard type-ahead
  matches, or the "more" search results

#### Scenario: Archived category's transactions remain visible elsewhere
- **WHEN** a category has been deleted (archived) and it has past transactions
- **THEN** those transactions continue to display normally (name, color, amounts) in the month
  view and any analytics that reference them

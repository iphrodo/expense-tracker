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

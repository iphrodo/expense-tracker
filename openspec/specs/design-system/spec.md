# design-system Specification

## Purpose

Defines the shared design tokens and cross-cutting presentation rules — color, type, spacing,
category color roles, numeral formatting, and minimum control sizing — that every screen's
components draw from, so the app presents one consistent visual language instead of ad-hoc,
per-screen styling choices.
## Requirements
### Requirement: A single token set defines color, type, and spacing
The system SHALL define its neutral colors, single accent color, type scale, spacing/radius/
elevation values, and category color roles as a single, centrally defined token set, and every
screen SHALL render its colors, font sizes, weights, spacing, corner radii, and shadows exclusively
from that token set rather than from values chosen independently per screen or component.

#### Scenario: A neutral surface color is changed once and applies everywhere
- **WHEN** the token defining the app's card/surface background color is changed
- **THEN** every card across every screen (entry form, month list, sidebar cards, averages,
  categories, import/export) reflects the new color without a per-screen edit

#### Scenario: Only one accent color exists in the app
- **WHEN** any screen is rendered
- **THEN** exactly one accent color is used for primary buttons, the active tab/segment, and
  selection states, with no second accent color introduced anywhere in the UI

### Requirement: Category color is exposed as three derived roles, not one flat color
For any category, the system SHALL derive three presentation roles — a saturated `dot` color, a
light-tint `tint` background, and a `text` foreground readable on that tint — from that category's
existing single deterministic hue assignment, such that the same category maps to the same three
roles everywhere it is rendered, and no two roles for the same category diverge between renders,
sessions, or the set of other categories present.

#### Scenario: All three roles trace back to one hue per category
- **WHEN** a category's `dot`, `tint`, and `text` roles are computed
- **THEN** all three are derived from that one category's existing deterministic hue assignment,
  and computing them again for the same category (in the same or a different session) yields the
  same three colors

#### Scenario: Tint background keeps text readable
- **WHEN** a category's `text` role is rendered on top of that same category's `tint` background
- **THEN** the resulting contrast meets at least WCAG AA for normal-size text

### Requirement: Amount figures use tabular numerals in the body font, never a monospace font
Every rendered monetary amount (row amounts, totals, averages, run-rate figures, and any other
numeric spend figure) SHALL be rendered in the app's single sans body font family with
tabular-figure numeral alignment, and SHALL NOT be rendered in a monospace font family.

#### Scenario: A monospaced amount is not present anywhere
- **WHEN** any screen showing a monetary amount is rendered
- **THEN** no monetary amount is rendered using a monospace font family

#### Scenario: Amounts of differing digit counts still align in a column
- **WHEN** a list of amounts with differing numbers of digits (e.g. 7.83 and 2 348.03) is rendered
  in a single right-aligned column
- **THEN** each digit occupies a fixed width so the column of amounts stays vertically aligned by
  place value

### Requirement: Every interactive control meets a minimum touch/click target and keyboard-focus style
Every interactive control (button, chip, tab, input, icon-button) SHALL be at least 44 logical
pixels tall on mobile viewports, and every interactive control, across all viewport sizes, SHALL
show a visible focus indicator using the single accent color when focused via keyboard, replacing
the browser's default focus ring.

#### Scenario: A mobile control is reachable with a normal-sized tap
- **WHEN** any interactive control is rendered on a mobile-sized viewport
- **THEN** its rendered height is at least 44 logical pixels

#### Scenario: Keyboard focus is visible and uses the accent color
- **WHEN** any interactive control receives keyboard focus
- **THEN** a visible outline rendered in the app's single accent color appears around it, and the
  browser's default focus ring is not shown in addition to it

### Requirement: The application provides dark and light semantic color schemes
The system SHALL provide complete dark and light values for every shared semantic color token used
by the UI, including background, surfaces, borders, text levels, accent states, and error states.
The currently selected scheme SHALL determine those token values without requiring individual
components to branch on theme. Category colors SHALL retain their deterministic identity and remain
readable on their corresponding themed surfaces.

#### Scenario: A screen renders in dark mode
- **WHEN** the document theme is `dark`
- **THEN** all application surfaces, text, borders, accent states, and error states render using
  the dark-scheme semantic token values

#### Scenario: A screen renders in light mode
- **WHEN** the document theme is `light`
- **THEN** all application surfaces, text, borders, accent states, and error states render using
  the light-scheme semantic token values

#### Scenario: Category identity remains consistent across themes
- **WHEN** the user switches between dark and light modes
- **THEN** a category keeps its deterministic identity color and its label remains readable on the
  themed category tint and surrounding surface

### Requirement: Theme follows the local time
The application SHALL use the browser's local time to render dark theme from 20:00 inclusive until
07:00 exclusive, and light theme from 07:00 inclusive until 20:00 exclusive. Before the React UI
is displayed, the document theme SHALL be resolved so the page does not visibly flash another
scheme. The open application SHALL automatically update at either boundary and when a backgrounded
tab becomes visible again. It SHALL NOT derive the theme from the operating-system preference or a
previously stored selection.

#### Scenario: Application opens during dark-theme hours
- **WHEN** the application opens from 20:00 inclusive through 07:00 exclusive in the browser's
  local time
- **THEN** the document and initial UI render in dark theme

#### Scenario: Application opens during light-theme hours
- **WHEN** the application opens from 07:00 inclusive through 20:00 exclusive in the browser's
  local time
- **THEN** the document and initial UI render in light theme

#### Scenario: Automatic change occurs while the app is open
- **WHEN** the browser's local time reaches 07:00 or 20:00 while the application is open
- **THEN** the application respectively switches to light or dark theme without requiring a reload

### Requirement: A user can temporarily switch theme from every app shell
The application SHALL provide a keyboard-accessible theme switch in the desktop header and mobile
“Ще” menu. Activating it SHALL immediately switch between dark and light themes and expose the
current state programmatically. A manual selection SHALL last until the next scheduled automatic
change, after which the time-based theme is applied again. The control SHALL meet the shared focus
and minimum-target requirements.

#### Scenario: Desktop user changes to light theme
- **WHEN** a desktop user activates the theme switch while dark mode is active
- **THEN** the interface immediately changes to light mode, the control exposes light as selected,
  until the next scheduled automatic change

#### Scenario: Mobile user changes to dark theme
- **WHEN** a mobile user activates the theme action in the “Ще” menu while light mode is active
- **THEN** the interface immediately changes to dark mode, the menu remains operable, and the
  manually selected theme remains active until the next scheduled automatic change

#### Scenario: Keyboard user can identify and operate the switch
- **WHEN** the theme control receives keyboard focus
- **THEN** it displays the shared accent-colored focus indicator, has an accessible name describing
  the switch action, exposes its selected state, and activates with the standard button keys

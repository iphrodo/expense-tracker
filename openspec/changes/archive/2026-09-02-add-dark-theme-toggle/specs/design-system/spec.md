## ADDED Requirements

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

### Requirement: Dark theme is the initial theme unless the user has selected otherwise
The application SHALL render dark theme on the first visit and whenever no valid explicit theme
preference is available. It SHALL NOT derive the initial theme from the operating-system preference.
Before the React UI is displayed, the document theme SHALL be resolved so the page does not visibly
flash another scheme.

#### Scenario: First visit defaults to dark
- **WHEN** the application opens on a device with no stored valid theme preference
- **THEN** the document and initial UI render in dark theme

#### Scenario: OS preference does not override the product default
- **WHEN** the device is configured to prefer light mode and the user has no stored preference
- **THEN** the application still renders in dark theme

#### Scenario: Invalid or inaccessible storage falls back safely
- **WHEN** the saved value is not `dark` or `light`, or browser storage cannot be read
- **THEN** the application renders in dark theme and remains usable

### Requirement: A user can switch theme from every app shell and their choice persists locally
The application SHALL provide a keyboard-accessible theme switch in the desktop header and mobile
“Ще” menu. Activating it SHALL immediately switch between dark and light themes, expose the current
state programmatically, and save the explicit choice locally for later visits on that device. The
control SHALL meet the shared focus and minimum-target requirements.

#### Scenario: Desktop user changes to light theme
- **WHEN** a desktop user activates the theme switch while dark mode is active
- **THEN** the interface immediately changes to light mode, the control exposes light as selected,
  and the choice is saved locally

#### Scenario: Mobile user changes to dark theme
- **WHEN** a mobile user activates the theme action in the “Ще” menu while light mode is active
- **THEN** the interface immediately changes to dark mode, the menu remains operable, and the
  choice is saved locally

#### Scenario: Explicit choice is restored on a later visit
- **WHEN** the user selected light mode, closes the app, and visits again on the same device
- **THEN** light mode is resolved before the UI is shown

#### Scenario: Keyboard user can identify and operate the switch
- **WHEN** the theme control receives keyboard focus
- **THEN** it displays the shared accent-colored focus indicator, has an accessible name describing
  the switch action, exposes its selected state, and activates with the standard button keys

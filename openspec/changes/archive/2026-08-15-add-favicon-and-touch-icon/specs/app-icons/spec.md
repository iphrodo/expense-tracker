## ADDED Requirements

### Requirement: Branded favicon
The app SHALL serve a branded SVG favicon at `public/favicon.svg`, referenced from `index.html`
via `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />`. The icon SHALL depict a
cream-colored receipt shape (with a scalloped bottom edge) on a dark rounded-square background,
with three horizontal bars on the receipt representing expense line items, matching the supplied
design (background `#272e1b`, receipt `#f5ead8`, bars `#7a8a5e` and `#c67139`). The icon SHALL
NOT be the prior placeholder (abstract purple blob) shape.

#### Scenario: Browser tab shows the branded icon
- **WHEN** the app is loaded in a browser
- **THEN** the browser tab/bookmark icon is the dark rounded-square receipt icon, not the prior
  purple placeholder

### Requirement: Apple touch icon
The app SHALL provide a PNG apple-touch-icon derived from the same branded design, at
`public/icons/apple-touch-icon.png` (180×180, opaque background — no transparency, no
pre-rounded corners since iOS applies its own mask), referenced from `index.html` via
`<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`.

#### Scenario: Adding to iOS/iPadOS home screen
- **WHEN** a user adds the app to their home screen from Safari on iOS/iPadOS
- **THEN** the home-screen icon is the branded receipt design, not a screenshot thumbnail of the
  page

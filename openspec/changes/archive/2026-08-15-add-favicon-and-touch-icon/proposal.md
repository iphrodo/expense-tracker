## Why

`public/favicon.svg` is still the default generated-project placeholder (an abstract purple blob),
and the app ships no `apple-touch-icon`, so pinning the site or adding it to an iOS/iPadOS home
screen falls back to a screenshot thumbnail. A branded icon (a receipt with expense-list bars, on
a dark rounded-square ground) has been designed and needs to become the app's actual favicon and
home-screen icon.

## What Changes

- Replace `public/favicon.svg` with the branded receipt icon (dark rounded-square background,
  cream receipt shape, three line-item bars) referenced from `index.html`.
- Add an `apple-touch-icon` PNG generated from the same design and reference it from
  `index.html` via `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`.
- No change to app behavior, routing, or any existing capability — this is icon assets and
  `<head>` markup only.

## Capabilities

### New Capabilities

- `app-icons`: the app's favicon and home-screen (apple-touch) icon.

### Modified Capabilities

(none)

## Impact

- `public/favicon.svg` — replaced with the branded design.
- `public/icons/apple-touch-icon.png` — new asset (180×180, opaque background, no rounded
  corners baked in — iOS applies its own mask).
- `index.html` — `<link rel="icon">` continues pointing at the (now rebranded) `favicon.svg`;
  add `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">`.

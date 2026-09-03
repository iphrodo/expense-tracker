# Add dark-theme toggle

## Why

The interface currently has one light-only color scheme. A dark-first scheme is more comfortable
for routine evening use and should be the default experience, while retaining an explicit light
option for people who prefer it.

## What Changes

- Add a theme control available from both desktop and mobile navigation.
- Make the dark color scheme the initial theme for users who have not chosen a preference.
- Provide a complete light scheme as the alternate theme.
- Persist an explicit user choice locally and apply it before the UI becomes visible, preventing a
  flash of the wrong theme on load.
- Extend the design token system with semantic dark and light values; category identity colors,
  accessibility treatment, and all existing functionality remain unchanged.

## Capabilities

### Modified Capabilities

- `design-system`: Adds two color-scheme variants, dark-first initial rendering, and a persisted
  user-controlled theme switch.

## Impact

- Affected frontend areas: global CSS tokens, app shell navigation, and the sign-in screen.
- No changes to Supabase, data model, calculations, import/export, or authentication behavior.

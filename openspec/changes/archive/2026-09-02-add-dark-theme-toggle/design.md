## Context

`src/index.css` currently defines one set of semantic Tailwind v4 color tokens and forces
`color-scheme: light` at `:root`. The desktop header and mobile “Ще” menu are the shared app-shell
surfaces. The sign-in screen is rendered outside that shell, so its theme must be driven by the
same root attribute and tokens.

## Goals / Non-Goals

**Goals:**

- Render the application in dark mode by default for a user without a saved choice.
- Let the user choose dark or light mode from every supported navigation layout.
- Remember only an intentional user choice on that device.
- Preserve sufficient contrast and the semantic role of every existing token in both schemes.

**Non-Goals:**

- Do not follow the operating-system color preference automatically.
- Do not sync the preference through Supabase or between devices.
- Do not change category hue assignment, calculations, content, navigation, or data behavior.

## Decisions

### Theme state is an explicit `data-theme` attribute on `<html>`

Set `document.documentElement.dataset.theme` to `dark` or `light`. CSS custom properties remain
semantic (`--color-bg`, `--color-surface`, `--color-text`, etc.) and resolve differently under
each attribute value. This changes every existing token consumer without component-by-component
theme conditionals.

### Dark is the fallback, not the OS setting

If local storage has no valid preference, the bootstrap code sets `data-theme="dark"`. The app does
not inspect `prefers-color-scheme`; this makes “dark as primary” deterministic across devices and
browser settings.

### Store only an explicit selection

Use a versioned, app-specific local-storage key (for example, `expense-tracker.theme`) only after
the user activates the switch. Its value is strictly `dark` or `light`; malformed or unavailable
storage falls back safely to dark. The preference is applied by a small inline script in
`index.html`, before the React entry module loads, and React initializes from the resolved DOM
attribute. This avoids a light-frame flash and keeps storage access resilient in restricted
browsing contexts.

### The control uses text plus an icon and is available in both shells

The desktop header contains a compact, accessible Dark/Light toggle next to the account actions.
The mobile “Ще” menu contains the same action. Each has an accessible name describing the action
that will occur (for example, “Увімкнути світлу тему” while dark is active), exposes its current
state with `aria-pressed`, is keyboard reachable, and meets the existing 44px mobile target rule.

### Native browser surfaces follow the selected scheme

Set CSS `color-scheme` for each selected theme so browser-rendered controls, scrollbars, and form
chromes align with the app. Update the browser theme-color metadata when the selection changes so
the mobile browser chrome is coherent as well.

## Risks / Trade-offs

- [A token omitted from the light or dark mapping could make a component illegible] → Keep all
  colors semantic, use the existing token names only, and verify each screen in both schemes.
- [Early local-storage access can fail in privacy-restricted contexts] → Wrap bootstrap storage
  access in `try/catch` and use dark mode without persistence when unavailable.
- [Theme initialization can briefly disagree between HTML and React] → React reads the resolved
  root attribute rather than independently computing a default.

## 1. Theme foundation

- [x] 1.1 Define complete dark and light values for every existing semantic color token in
      `src/index.css`, with dark as the root/default scheme.
- [x] 1.2 Add pre-React theme bootstrap in `index.html`: restore a valid stored choice or set
      dark; safely fall back to dark when storage is unavailable.
- [x] 1.3 Add a shared theme state/helper that reads the resolved root attribute, updates it,
      persists only explicit choices, and updates browser theme color metadata.

## 2. Controls and accessibility

- [x] 2.1 Add the theme switch to the desktop header and the mobile “Ще” menu.
- [x] 2.2 Ensure the controls have clear Ukrainian labels, icon/text distinction, correct
      `aria-pressed` state, keyboard operation, focus styling, and 44px mobile targets.
- [x] 2.3 Confirm the sign-in screen and every authenticated screen use semantic tokens only and
      remain readable in both schemes.

## 3. Verification

- [x] 3.1 Add focused tests for default resolution, saved preference restoration, malformed value
      fallback, and explicit preference persistence.
- [x] 3.2 Run the existing Vitest suite, TypeScript check, and production build.
- [ ] 3.3 Manually inspect the sign-in, Month, History, Averages, Categories, and Import/Export
      screens in both themes, including mobile and desktop navigation controls.

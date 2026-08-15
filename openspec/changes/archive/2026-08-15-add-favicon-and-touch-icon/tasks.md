## 1. Favicon

- [x] 1.1 Replace `public/favicon.svg` contents with the branded receipt design (dark
      rounded-square background `#272e1b`, cream receipt `#f5ead8`, bars `#7a8a5e`/`#c67139`)
- [x] 1.2 Confirm `index.html`'s existing `<link rel="icon" type="image/svg+xml"
      href="/favicon.svg" />` needs no change (path/type stay valid)

## 2. Apple touch icon

- [x] 2.1 Generate `public/icons/apple-touch-icon.png` (180×180, opaque background, no
      pre-rounded corners) from the same design
- [x] 2.2 Add `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">` to
      `index.html`'s `<head>`

## 3. Verification

- [x] 3.1 Load the app in a browser and confirm the tab icon is the new branded favicon
- [x] 3.2 Confirm `apple-touch-icon.png` renders correctly (check via browser dev tools or an
      iOS "Add to Home Screen" preview)

## Verification / testing policy

- Do NOT write standalone browser-automation driver scripts (Playwright, Puppeteer,
  drive.mjs, etc.) to manually verify that something works — this applies to bug
  fixes, features, and any other task, whether or not it goes through OpenSpec.
- Verify changes using: existing Vitest tests, `tsc --noEmit`, `npm run build`,
  or by asking the user to check manually.
- If you genuinely believe E2E browser verification is needed, ask for
  confirmation first and explain why existing tests aren't sufficient.
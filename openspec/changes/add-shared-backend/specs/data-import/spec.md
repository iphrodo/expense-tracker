## REMOVED Requirements

### Requirement: One-time CSV seed import
**Reason**: The seed file was a one-time migration aid from the original spreadsheet. Local
IndexedDB data has since diverged from it (transactions have been entered directly in the app), so
importing it again would be actively wrong, not just redundant. Once the shared-backend migration
(see the `data-migration` capability) has moved the authoritative local data into Postgres and been
verified, `public/seed/transactions.csv` is deleted and the one-click seed-import button and its
handler are removed from the UI.
**Migration**: Use "Import from a user-picked file" (unchanged) if a CSV ever needs to be imported
again.

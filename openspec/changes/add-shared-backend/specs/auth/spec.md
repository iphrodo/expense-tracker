## Purpose

Gates the shared expense tracker behind a single sign-in step so the data in Postgres is only
reachable by the two people who know the one shared household credential, while staying out of
their way once signed in.

## ADDED Requirements

### Requirement: Sign-in screen gates the whole app
The application SHALL show an email/password sign-in screen before rendering any other screen when
there is no active session, and SHALL render the Month view (per the expense-entry capability) once
a session exists. The system SHALL NOT provide a signup form, a password-reset flow, or any user
management UI — the one shared account is created by hand in the Supabase dashboard.

#### Scenario: Unauthenticated load shows sign-in
- **WHEN** the app loads in a browser with no active session
- **THEN** the sign-in screen is the only screen rendered, and no expense data is fetched or shown

#### Scenario: No signup or password-reset affordance exists
- **WHEN** the user looks at the sign-in screen
- **THEN** there is no control to create a new account or reset a password

#### Scenario: Successful sign-in reveals the app
- **WHEN** the user submits the shared account's correct email and password
- **THEN** the sign-in screen is replaced by the Month view, and expense data loads

#### Scenario: Failed sign-in shows an inline error
- **WHEN** the user submits an incorrect email or password
- **THEN** the sign-in screen shows an inline error and does not reveal any part of the app

### Requirement: Session persists and auto-refreshes across visits
Once signed in, the session SHALL persist across page reloads and app restarts on the same device,
and SHALL auto-refresh before expiry, so the user is not asked to sign in again on every visit. A
sign-out control SHALL be available but SHALL NOT be prominently placed (e.g. not on the entry
screen's main action row).

#### Scenario: Reload does not require signing in again
- **WHEN** the user has signed in, then reloads or relaunches the app on the same device the next
  day
- **THEN** the app opens directly on the Month view without showing the sign-in screen

#### Scenario: Sign-out returns to the sign-in screen
- **WHEN** the user activates the sign-out control
- **THEN** the session ends and the sign-in screen is shown; no expense data remains visible

### Requirement: Anonymous access to data is rejected at the database
Every table (`categories`, `transactions`, `month_flags`, `average_exclusions`) SHALL enforce Row
Level Security such that a request without an authenticated session is rejected, regardless of
what the client-side code attempts, since the publishable key ships inside the client bundle and is
readable by anyone who opens devtools.

#### Scenario: Anonymous client cannot read categories
- **WHEN** a request to read `categories` is made without an authenticated session
- **THEN** the request returns no rows and is rejected by Row Level Security, not merely hidden by
  client-side UI

#### Scenario: Anonymous client cannot read transactions
- **WHEN** a request to read `transactions` is made without an authenticated session
- **THEN** the request returns no rows and is rejected by Row Level Security

#### Scenario: Anonymous client cannot write transactions
- **WHEN** a request to insert, update, or delete a row in `transactions` is made without an
  authenticated session
- **THEN** the request is rejected by Row Level Security and no row is changed

#### Scenario: Anonymous client cannot read or write month_flags
- **WHEN** a request to read or write `month_flags` is made without an authenticated session
- **THEN** the request is rejected by Row Level Security

#### Scenario: Anonymous client cannot read or write average_exclusions
- **WHEN** a request to read or write `average_exclusions` is made without an authenticated session
- **THEN** the request is rejected by Row Level Security

#### Scenario: Authenticated session has full access
- **WHEN** a request to read or write any of the four tables is made with the shared account's
  authenticated session
- **THEN** the request succeeds, since the `authenticated` role is granted full access on every
  table

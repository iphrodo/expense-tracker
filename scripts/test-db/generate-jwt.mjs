// Generates a fixed local-only JWT for the `authenticated` role, signed with the
// fixed secret in jwt-secret.txt. Not a real secret — only used to talk to the
// disposable local Postgres/PostgREST instance these scripts stand up for
// integration tests (see openspec/changes/add-shared-backend/tasks.md section 6).
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const secret = readFileSync(new URL('./jwt-secret.txt', import.meta.url), 'utf8').trim()

function base64url(input) {
  return Buffer.from(JSON.stringify(input))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

const header = { alg: 'HS256', typ: 'JWT' }
// Far-future fixed expiry so the checked-in token in .env.test doesn't need regenerating.
const payload = { role: 'authenticated', sub: 'integration-tests', exp: 4102444800 }
const data = `${base64url(header)}.${base64url(payload)}`
const signature = createHmac('sha256', secret)
  .update(data)
  .digest('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')

const token = `${data}.${signature}`

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(token)
}

export { token }

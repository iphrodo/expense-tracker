// Diagnoses where a Postgres connection stalls: raw TCP, the SSLRequest
// pre-negotiation byte, or the full TLS handshake. Usage:
//   node scripts/test-db/diagnose-pg-handshake.mjs HOST PORT
import net from 'node:net'
import tls from 'node:tls'

const host = process.argv[2]
const port = Number(process.argv[3] ?? 5432)

function withTimeout(label, promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label}: TIMEOUT after ${ms}ms`)), ms)),
  ])
}

async function step1_sslRequest() {
  return withTimeout(
    'SSLRequest',
    new Promise((resolve, reject) => {
      const socket = net.connect(port, host, () => {
        // Postgres SSLRequest packet: length=8, code=80877103
        const buf = Buffer.alloc(8)
        buf.writeInt32BE(8, 0)
        buf.writeInt32BE(80877103, 4)
        socket.write(buf)
      })
      socket.once('data', (data) => {
        console.log(`SSLRequest: got response byte '${data.toString('utf8', 0, 1)}' (${data.length} bytes)`)
        socket.end()
        resolve()
      })
      socket.on('error', reject)
    }),
  )
}

async function step2_tlsHandshake() {
  return withTimeout(
    'TLS handshake',
    new Promise((resolve, reject) => {
      const socket = net.connect(port, host, () => {
        const buf = Buffer.alloc(8)
        buf.writeInt32BE(8, 0)
        buf.writeInt32BE(80877103, 4)
        socket.write(buf)
      })
      socket.once('data', (data) => {
        if (data.toString('utf8', 0, 1) !== 'S') {
          reject(new Error(`Server refused SSL (responded '${data.toString('utf8', 0, 1)}')`))
          return
        }
        const tlsSocket = tls.connect({ socket, rejectUnauthorized: false, servername: host }, () => {
          console.log('TLS handshake: OK, negotiated', tlsSocket.getProtocol())
          tlsSocket.end()
          resolve()
        })
        tlsSocket.on('error', reject)
      })
      socket.on('error', reject)
    }),
  )
}

try {
  console.log(`Testing ${host}:${port} ...`)
  await step1_sslRequest()
  await step2_tlsHandshake()
  console.log('All steps completed.')
} catch (err) {
  console.error('FAILED:', err.message)
  process.exit(1)
}

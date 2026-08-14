// supabase-js always requests <url>/rest/v1/<table>, but PostgREST serves tables
// at its own root. This strips the /rest/v1 prefix so a local bare PostgREST
// instance looks enough like Supabase's gateway for integration tests.
import http from 'node:http'

const LISTEN_PORT = Number(process.argv[2] ?? 54321)
const TARGET_PORT = Number(process.argv[3] ?? 54322)

const server = http.createServer((req, res) => {
  const strippedUrl = req.url.replace(/^\/rest\/v1/, '') || '/'
  const proxyReq = http.request(
    {
      host: '127.0.0.1',
      port: TARGET_PORT,
      path: strippedUrl,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
      proxyRes.pipe(res)
    },
  )
  proxyReq.on('error', (err) => {
    res.writeHead(502)
    res.end(String(err))
  })
  req.pipe(proxyReq)
})

server.listen(LISTEN_PORT, '127.0.0.1', () => {
  console.log(`rest-proxy: :${LISTEN_PORT} -> :${TARGET_PORT} (stripping /rest/v1)`)
})

/**
 * PrintHype Printer Proxy — Puerto 3001
 * Proxy local para conectar el navegador con las impresoras en la red local.
 * Ejecutar con Node.js: node scripts/printer-proxy.js
 */
const http = require('http')

const PROXY_PORT = 3001

const server = http.createServer((req, res) => {
  // CORS headers — permite que Vercel (HTTPS) se conecte
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Allow-Private-Network', 'true')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Formato: /proxy/{ip}/{port}/{ruta...}
  // Ej: /proxy/192.168.1.4/7125/api/printer
  const match = req.url?.match(/^\/proxy\/([^/]+)\/(\d+)\/(.+)/)
  if (!match) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Formato: /proxy/{ip}/{port}/{ruta}' }))
    return
  }

  const ip = match[1]
  const port = parseInt(match[2])
  const path = '/' + match[3]
  const targetUrl = `http://${ip}:${port}${path}`

  const proxyReq = http.get(targetUrl, { timeout: 5000 }, (proxyRes) => {
    let data = ''
    proxyRes.on('data', chunk => data += chunk)
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' })
      res.end(data)
    })
  })

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'No se pudo conectar con la impresora' }))
  })

  proxyReq.on('timeout', () => {
    proxyReq.destroy()
    res.writeHead(504, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Tiempo de espera agotado' }))
  })
})

server.listen(PROXY_PORT, () => {
  console.log(`\n  🖨️  PrintHype Printer Proxy corriendo en http://localhost:${PROXY_PORT}`)
  console.log(`  Usá http://localhost:${PROXY_PORT}/proxy/192.168.1.4/7125/api/printer para testear\n`)
})

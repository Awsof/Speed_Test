/**
 * STP-SOAP · Proxy Local Anti-CORS
 * Zero dependências — usa apenas módulos nativos do Node.js
 *
 * Uso:
 *   node proxy.js
 *   Acesse o sistema em: http://localhost:3000
 */
const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const PORT = 3000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, SOAPAction, Authorization',
};

const server = http.createServer((req, res) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // ── /proxy  →  repassa para o endpoint SOAP ──────────────────────
  if (req.method === 'POST' && req.url === '/proxy') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); }
      catch { return sendJSON(res, 400, { error: 'JSON inválido' }); }

      const { targetUrl, headers: fwdHeaders = {}, payload, timeoutMs = 120000 } = parsed;
      if (!targetUrl || !payload) return sendJSON(res, 400, { error: 'targetUrl e payload obrigatórios' });

      const start = Date.now();
      const dest  = new url.URL(targetUrl);
      const lib   = dest.protocol === 'https:' ? https : http;

      const options = {
        hostname: dest.hostname,
        port:     dest.port || (dest.protocol === 'https:' ? 443 : 80),
        path:     dest.pathname + dest.search,
        method:   'POST',
        headers:  { 'Content-Type': 'text/xml; charset=utf-8', ...fwdHeaders, 'Content-Length': Buffer.byteLength(payload) },
        timeout:  timeoutMs,
      };

      const proxyReq = lib.request(options, proxyRes => {
        let data = '';
        proxyRes.on('data', c => data += c);
        proxyRes.on('end', () => {
          const duration = Date.now() - start;
          const hasFault = data.includes('<soap:Fault') || data.includes('<faultcode') || data.includes(':Fault>');
          const success  = proxyRes.statusCode >= 200 && proxyRes.statusCode < 300 && !hasFault;
          let errorDetail = null;
          if (hasFault) {
            const m = data.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
            errorDetail = m ? m[1].trim() : 'SOAP Fault';
          } else if (!success) {
            errorDetail = `HTTP ${proxyRes.statusCode}`;
          }
          sendJSON(res, 200, { success, statusCode: proxyRes.statusCode, duration, errorDetail });
        });
      });

      proxyReq.on('timeout', () => {
        proxyReq.destroy();
        sendJSON(res, 200, { success: false, duration: Date.now() - start, isTimeout: true, errorDetail: 'TIMEOUT' });
      });

      proxyReq.on('error', err => {
        sendJSON(res, 200, { success: false, duration: Date.now() - start, errorDetail: err.message });
      });

      proxyReq.write(payload);
      proxyReq.end();
    });
    return;
  }

  // ── Arquivos estáticos  ───────────────────────────────────────────
  const filePath = req.url === '/' ? '/index.html' : req.url;
  const fullPath = path.join(__dirname, filePath);

  fs.readFile(fullPath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const mime = filePath.endsWith('.html') ? 'text/html' : 'text/plain';
    res.writeHead(200, { 'Content-Type': mime, ...CORS_HEADERS });
    res.end(data);
  });
});

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(body);
}

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║   STP-SOAP · Proxy Local             ║');
  console.log(`  ║   http://localhost:${PORT}              ║`);
  console.log('  ║   Ctrl+C para encerrar               ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});

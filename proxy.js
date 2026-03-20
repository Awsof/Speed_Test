// api/proxy.js
// Proxy SOAP para o Vercel — usa apenas módulos nativos do Node.js
// Não depende de fetch, npm install, nem de nenhuma dependência externa

const https = require('https');
const http  = require('http');
const url   = require('url');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'Method not allowed' }); return; }

  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    let body;
    try { body = JSON.parse(raw); }
    catch(e) { res.status(400).json({ error: 'JSON inválido' }); return; }

    const { targetUrl, headers: fwdHeaders = {}, payload, timeoutMs = 120000 } = body;
    if (!targetUrl || !payload) {
      res.status(400).json({ error: 'targetUrl e payload obrigatórios' });
      return;
    }

    let dest;
    try { dest = new url.URL(targetUrl); }
    catch(e) { res.status(400).json({ error: 'URL inválida: ' + targetUrl }); return; }

    const lib = dest.protocol === 'https:' ? https : http;
    const payloadBuf = Buffer.from(payload, 'utf8');
    const start = Date.now();

    const options = {
      hostname: dest.hostname,
      port:     dest.port || (dest.protocol === 'https:' ? 443 : 80),
      path:     dest.pathname + (dest.search || ''),
      method:   'POST',
      headers:  Object.assign({}, fwdHeaders, { 'Content-Length': payloadBuf.length }),
      timeout:  timeoutMs,
    };

    const proxyReq = lib.request(options, proxyRes => {
      let data = '';
      proxyRes.on('data', c => { data += c; });
      proxyRes.on('end', () => {
        const duration   = Date.now() - start;
        const hasFault   = data.includes('<soap:Fault')  ||
                           data.includes('<faultcode')   ||
                           data.includes(':Fault>');
        const success    = proxyRes.statusCode >= 200 &&
                           proxyRes.statusCode < 300  && !hasFault;
        let errorDetail  = null;
        if (hasFault) {
          const m = data.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
          errorDetail = m ? m[1].trim() : 'SOAP Fault';
        } else if (!success) {
          errorDetail = 'HTTP ' + proxyRes.statusCode;
        }
        res.status(200).json({ success, statusCode: proxyRes.statusCode,
                               duration, errorDetail, isTimeout: false });
      });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(200).json({ success: false, duration: Date.now() - start,
                             isTimeout: true, errorDetail: 'TIMEOUT' });
    });

    proxyReq.on('error', err => {
      if (!res.headersSent)
        res.status(200).json({ success: false, duration: Date.now() - start,
                               isTimeout: false, errorDetail: err.message });
    });

    proxyReq.write(payloadBuf);
    proxyReq.end();
  });
};

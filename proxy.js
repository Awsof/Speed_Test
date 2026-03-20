// api/proxy.js — Vercel Serverless Function
// Repassa a requisição SOAP e resolve o CORS

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { targetUrl, headers: fwdHeaders = {}, payload, timeoutMs = 120000 } = req.body;

  if (!targetUrl || !payload) {
    return res.status(400).json({ error: 'targetUrl e payload são obrigatórios' });
  }

  const start = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: fwdHeaders,
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timer);
    const duration = Date.now() - start;
    const body = await response.text();

    const hasFault =
      body.includes('<soap:Fault') ||
      body.includes('<faultcode') ||
      body.includes(':Fault>');

    const success = response.ok && !hasFault;

    let errorDetail = null;
    if (hasFault) {
      const m = body.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
      errorDetail = m ? m[1].trim() : 'SOAP Fault';
    } else if (!response.ok) {
      errorDetail = `HTTP ${response.status}`;
    }

    return res.status(200).json({
      success,
      statusCode: response.status,
      duration,
      errorDetail,
      isTimeout: false,
    });

  } catch (err) {
    const duration = Date.now() - start;
    const isTimeout = err.name === 'AbortError';
    return res.status(200).json({
      success: false,
      duration,
      isTimeout,
      errorDetail: isTimeout ? 'TIMEOUT' : err.message,
    });
  }
}

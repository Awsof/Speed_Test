/**
 * STP-SOAP · Proxy Serverless (Vercel)
 * Cada requisição SOAP é executada por esta função individualmente.
 * O frontend controla a concorrência — evita timeout do Vercel.
 */
module.exports = async function handler(req, res) {
  // CORS para desenvolvimento local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    url,
    login,
    senha,
    soapAction = '',
    payload,
    timeoutMs = 120000,
    requestId,
    numAtendimento,
    endpoint,
  } = req.body;

  if (!url || !payload) {
    return res.status(400).json({ error: 'url e payload são obrigatórios' });
  }

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers = {
      'Content-Type': 'text/xml; charset=utf-8',
    };

    if (soapAction) headers['SOAPAction'] = soapAction;

    if (login && senha) {
      const encoded = Buffer.from(`${login}:${senha}`).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timer);
    const duration = Date.now() - startTime;
    const body = await response.text();

    // Detecta SOAP Fault
    const hasFault =
      body.includes('<soap:Fault') ||
      body.includes('<faultcode') ||
      body.includes(':Fault>');

    const success = response.ok && !hasFault;

    return res.status(200).json({
      requestId,
      endpoint,
      numAtendimento,
      success,
      statusCode: response.status,
      duration,
      soapFault: hasFault,
      errorDetail: hasFault
        ? extractFaultString(body)
        : !response.ok
        ? `HTTP ${response.status}`
        : null,
    });
  } catch (err) {
    const duration = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError';

    return res.status(200).json({
      requestId,
      endpoint,
      numAtendimento,
      success: false,
      duration,
      isTimeout,
      errorDetail: isTimeout ? 'TIMEOUT' : err.message,
    });
  }
};

/**
 * Extrai a mensagem de faultstring do SOAP Fault
 */
function extractFaultString(xml) {
  const match = xml.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
  return match ? match[1].trim() : 'SOAP Fault';
}

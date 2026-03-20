module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { usuario, senha } = req.body || {};
  const ok = usuario === process.env.LOGIN_USUARIO &&
             senha    === process.env.LOGIN_SENHA;

  return res.status(200).json({ ok });
};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { level = 'info', line = '', payload = '' } = body;
    const fn = level === 'error' ? console.error : console.log;
    fn(line, payload !== undefined && payload !== '' ? JSON.stringify(payload) : '');
    return res.status(204).end();
  } catch (err) {
    console.error('[LedgerFlow Vercel Logger Error]', err);
    return res.status(400).json({ error: 'Invalid log payload' });
  }
}

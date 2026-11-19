const isDebugEnabled = () => {
  try {
    return import.meta.env.DEV || localStorage.getItem('ledgerflow_debug') === 'true';
  } catch {
    return import.meta.env.DEV;
  }
};

function timestamp() {
  return new Date().toISOString().split('T')[1].slice(0, 12);
}

function sendToDevTerminal(level, line, payload) {
  if (!import.meta.env.DEV) return;
  try {
    fetch('/__dev_log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, line, payload })
    }).catch(() => {});
  } catch { /* ignore */ }
}

export const logger = {
  action(actionName, payload) {
    if (!isDebugEnabled()) return;
    const line = `[LedgerFlow ${timestamp()}] ▶ ${actionName}`;
    console.info(line, payload ?? '');
    sendToDevTerminal('info', line, payload);
  },
  success(actionName, meta) {
    if (!isDebugEnabled()) return;
    const line = `[LedgerFlow ${timestamp()}] ✓ ${actionName}`;
    console.info(line, meta ?? '');
    sendToDevTerminal('info', line, meta);
  },
  error(actionName, err) {
    const line = `[LedgerFlow ${timestamp()}] ✕ ${actionName}`;
    console.error(line, err);
    sendToDevTerminal('error', line, err?.message || err);
  }
};

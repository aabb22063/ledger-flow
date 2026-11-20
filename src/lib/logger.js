const isDebugEnabled = () => {
  try {
    return import.meta.env.DEV || localStorage.getItem('ledgerflow_debug') !== 'false';
  } catch {
    return true;
  }
};

function timestamp() {
  return new Date().toISOString().split('T')[1].slice(0, 12);
}

function sendRemoteLog(level, line, payload) {
  const endpoint = import.meta.env.DEV ? '/__dev_log' : '/api/log';
  try {
    const body = JSON.stringify({ level, line, payload });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon && !import.meta.env.DEV) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    }
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true
    }).catch(() => {});
  } catch { /* ignore */ }
}

export const logger = {
  action(actionName, payload) {
    if (!isDebugEnabled()) return;
    const line = `[LedgerFlow ${timestamp()}] ▶ ${actionName}`;
    console.info(line, payload ?? '');
    sendRemoteLog('info', line, payload);
  },
  success(actionName, meta) {
    if (!isDebugEnabled()) return;
    const line = `[LedgerFlow ${timestamp()}] ✓ ${actionName}`;
    console.info(line, meta ?? '');
    sendRemoteLog('info', line, meta);
  },
  error(actionName, err) {
    const line = `[LedgerFlow ${timestamp()}] ✕ ${actionName}`;
    console.error(line, err);
    sendRemoteLog('error', line, err?.message || err);
  }
};

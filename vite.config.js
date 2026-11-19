import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function devTerminalLogger() {
  return {
    name: 'dev-terminal-logger',
    configureServer(server) {
      server.middlewares.use('/__dev_log', (req, res, next) => {
        if (req.method !== 'POST') return next();
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { level, line, payload } = JSON.parse(body || '{}');
            const fn = level === 'error' ? console.error : console.log;
            fn(line, payload !== undefined && payload !== '' ? payload : '');
          } catch { /* ignore malformed dev log */ }
          res.statusCode = 204;
          res.end();
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), devTerminalLogger()]
});

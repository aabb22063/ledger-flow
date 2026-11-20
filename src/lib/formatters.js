import { CURRENCY_SYMBOLS, MONTHS, SHORT_WEEKDAYS, WEEKDAYS } from './constants';

export function formatMoney(val, currency = 'INR', privacyMode = false) {
  if (privacyMode) return '••••••';
  const sym = CURRENCY_SYMBOLS[currency] || '₹';
  const num = Number(val) || 0;
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString(currency === 'INR' ? 'en-IN' : 'en-US', {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
  return `${num < 0 ? '-' : ''}${sym}${formatted}`;
}

export function getWeekdayName(dateStr, short = false) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return '—';
  return short ? SHORT_WEEKDAYS[dt.getDay()] : WEEKDAYS[dt.getDay()];
}

export function getWeekdayIndex(dateStr) {
  if (!dateStr) return 0;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

export function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${mStr} ${ampm}`;
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses natural-language quick input like:
 * "450 groceries upi" or "120 coffee cash" or "+50000 salary hdfc"
 */
export function parseQuickEntry(input, accounts, tasks) {
  const text = (input || '').trim();
  if (!text) return null;

  const isIncome = text.startsWith('+');
  const amtMatch = text.match(/[+-]?\s*(\d+(?:\.\d{1,2})?)/);
  if (!amtMatch) return null;
  const amount = parseFloat(amtMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const remainder = text.replace(amtMatch[0], '').trim();
  const tokens = remainder.toLowerCase().split(/\s+/).filter(Boolean);

  // Match account by name or type
  let matchedAccount = accounts[0] || null;
  const remainingWords = [];
  for (const tok of tokens) {
    const foundAcct = accounts.find((a) =>
      a.name.toLowerCase().includes(tok) || a.type.toLowerCase().includes(tok)
    );
    if (foundAcct && matchedAccount === accounts[0]) {
      matchedAccount = foundAcct;
    } else {
      remainingWords.push(tok);
    }
  }

  // Match task
  const targetKind = isIncome ? 'income' : 'expense';
  const kindTasks = tasks.filter((t) => t.kind === targetKind);
  let matchedTask = kindTasks[0] || tasks[0] || null;
  for (const w of remainingWords) {
    const foundTask = kindTasks.find((t) => t.name.toLowerCase().includes(w));
    if (foundTask) {
      matchedTask = foundTask;
      break;
    }
  }

  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return {
    type: targetKind,
    amount,
    accountId: matchedAccount?.id || '',
    taskId: matchedTask?.id || '',
    date,
    time,
    note: remainingWords.join(' ') || (matchedTask?.name || 'Quick entry')
  };
}

export function parseCsvText(csvText) {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    return cols;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine).filter((r) => r.some(Boolean));
  return { headers, rows };
}

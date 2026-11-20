import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { parseCsvText } from '../../lib/formatters';

export default function CsvImportModal({
  open,
  accounts,
  tasks,
  categoryRules,
  onClose,
  onImport
}) {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [dateCol, setDateCol] = useState(0);
  const [amountCol, setAmountCol] = useState(1);
  const [noteCol, setNoteCol] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setHeaders([]);
      setRows([]);
      setAccountId(accounts[0]?.id || '');
      setSubmitting(false);
    }
  }, [open, accounts]);

  if (!open) return null;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCsvText(ev.target.result || '');
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      const findIdx = (keys, fallback) => {
        const idx = parsed.headers.findIndex((h) => keys.some((k) => h.toLowerCase().includes(k)));
        return idx >= 0 ? idx : Math.min(fallback, Math.max(0, parsed.headers.length - 1));
      };
      setDateCol(findIdx(['date', 'time'], 0));
      setAmountCol(findIdx(['amount', 'debit', 'amt', 'value'], 1));
      setNoteCol(findIdx(['note', 'desc', 'narration', 'merchant', 'particular'], 2));
    };
    reader.readAsText(file);
  };

  const expenseTasks = tasks.filter((t) => t.kind === 'expense');
  const incomeTasks = tasks.filter((t) => t.kind === 'income');

  const resolveTask = (note, isIncome) => {
    const lower = (note || '').toLowerCase();
    for (const r of categoryRules) {
      if (r.taskId && lower.includes(r.keyword)) return r.taskId;
    }
    return isIncome ? (incomeTasks[0]?.id || '') : (expenseTasks[0]?.id || '');
  };

  const previewEntries = rows.slice(0, 50).map((r) => {
    const rawAmt = parseFloat(String(r[amountCol] || '').replace(/[^0-9.-]/g, ''));
    const rawDate = String(r[dateCol] || '').slice(0, 10);
    const note = String(r[noteCol] || '');
    const isIncome = rawAmt > 0 && String(r[amountCol]).includes('+');
    return {
      valid: Number.isFinite(rawAmt) && rawAmt !== 0 && /^\d{4}-\d{2}-\d{2}$/.test(rawDate),
      type: isIncome ? 'income' : 'expense',
      amount: Math.abs(rawAmt || 0),
      date: rawDate,
      time: '12:00',
      note,
      accountId: accountId || accounts[0]?.id || '',
      taskId: resolveTask(note, isIncome)
    };
  }).filter((e) => e.valid);

  const handleConfirmImport = async () => {
    if (submitting || previewEntries.length === 0) return;
    setSubmitting(true);
    try {
      const ok = await onImport(previewEntries);
      if (ok) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={() => { if (!submitting) onClose(); }}
    >
      <div
        className="bg-surface rounded-2xl max-w-xl w-full shadow-xl border border-hairline overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Import Bank / UPI CSV</h3>
          <button type="button" disabled={submitting} onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-hairline rounded-xl p-6 bg-canvas cursor-pointer hover:border-ink transition">
            <Upload className="w-6 h-6 text-muted mb-2" />
            <span className="text-xs font-semibold text-ink">Choose a `.csv` file (YYYY-MM-DD dates)</span>
            <span className="text-[11px] text-muted mt-0.5">Auto-categorizes using your Rules in Plan & Budgets</span>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>

          {headers.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">Account</label>
                  <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-hairline rounded-lg bg-surface">
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">Date Col</label>
                  <select value={dateCol} onChange={(e) => setDateCol(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-hairline rounded-lg bg-surface">
                    {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">Amount Col</label>
                  <select value={amountCol} onChange={(e) => setAmountCol(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-hairline rounded-lg bg-surface">
                    {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-muted mb-1">Note Col</label>
                  <select value={noteCol} onChange={(e) => setNoteCol(Number(e.target.value))} className="w-full px-2 py-1.5 text-xs border border-hairline rounded-lg bg-surface">
                    {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-canvas border border-hairline text-xs text-ink">
                Ready to import <strong>{previewEntries.length}</strong> valid rows (matched against {categoryRules.length} auto-rules).
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={submitting} onClick={onClose} className="px-4 py-2 text-xs font-semibold text-muted">
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || previewEntries.length === 0}
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-ink rounded-lg disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Importing...' : `Import ${previewEntries.length} Entries`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

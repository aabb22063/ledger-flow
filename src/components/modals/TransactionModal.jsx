import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, Split } from 'lucide-react';
import { getWeekdayName } from '../../lib/formatters';

export default function TransactionModal({
  modal,
  accounts,
  tasks,
  onClose,
  onSave
}) {
  const [form, setForm] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (modal) {
      setForm({ ...modal.data });
      setSplitMode(false);
      const firstExpTask = tasks.find((t) => t.kind === 'expense')?.id || '';
      setSplits([
        { taskId: modal.data.taskId || firstExpTask, amount: '', note: '' },
        { taskId: firstExpTask, amount: '', note: '' }
      ]);
      setSubmitting(false);
    } else {
      setForm(null);
    }
  }, [modal, tasks]);

  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, submitting, onClose]);

  if (!modal || !form) return null;

  const availableTasks = tasks.filter((t) => t.kind === (form.type === 'income' ? 'income' : 'expense'));
  const transferBlocked = form.type === 'transfer' && accounts.length < 2;
  const taskBlocked = form.type !== 'transfer' && availableTasks.length === 0;
  const canSplit = modal.mode === 'add' && form.type === 'expense' && availableTasks.length > 0;

  const splitTotal = splits.reduce((s, x) => s + (parseFloat(x.amount) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || transferBlocked || taskBlocked) return;
    setSubmitting(true);
    try {
      const payload = splitMode && canSplit ? { ...form, splits } : form;
      const ok = await onSave(modal.mode, payload);
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
        className="bg-surface rounded-2xl max-w-lg w-full shadow-xl border border-hairline overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">
            {modal.mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close"
            className="text-muted hover:text-ink disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-1 p-1 bg-canvas rounded-xl border border-hairline">
            {['expense', 'income', 'transfer'].map((tp) => (
              <button
                key={tp}
                type="button"
                disabled={submitting}
                onClick={() => {
                  const firstTask = tasks.find((t) => t.kind === (tp === 'income' ? 'income' : 'expense'))?.id || '';
                  setForm((f) => ({ ...f, type: tp, taskId: firstTask }));
                  if (tp !== 'expense') setSplitMode(false);
                }}
                className={`py-2 text-xs font-semibold rounded-lg capitalize transition ${
                  form.type === tp ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {tp}
              </button>
            ))}
          </div>

          {canSplit && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-canvas border border-hairline">
              <div className="flex items-center gap-2 text-xs font-medium text-ink">
                <Split className="w-3.5 h-3.5 text-muted" />
                <span>Split across multiple tasks</span>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setSplitMode((s) => !s)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  splitMode ? 'bg-ink text-white' : 'bg-surface border border-hairline text-muted'
                }`}
              >
                {splitMode ? 'On' : 'Off'}
              </button>
            </div>
          )}

          {splitMode && canSplit ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">Split Items (Total: <span className="font-mono">{splitTotal.toFixed(2)}</span>)</span>
                <button
                  type="button"
                  onClick={() => setSplits((s) => [...s, { taskId: availableTasks[0]?.id || '', amount: '', note: '' }])}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>
              {splits.map((sp, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={sp.taskId}
                    disabled={submitting}
                    onChange={(e) => setSplits((arr) => arr.map((x, i) => (i === idx ? { ...x, taskId: e.target.value } : x)))}
                    className="col-span-6 px-2.5 py-2 text-xs border border-hairline rounded-lg bg-surface"
                  >
                    {availableTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input
                    type="number" step="0.01" min="0.01" required placeholder="0.00"
                    disabled={submitting}
                    value={sp.amount}
                    onChange={(e) => setSplits((arr) => arr.map((x, i) => (i === idx ? { ...x, amount: e.target.value } : x)))}
                    className="col-span-5 px-2.5 py-2 text-xs font-mono bg-canvas border border-hairline rounded-lg"
                  />
                  <button
                    type="button"
                    disabled={splits.length <= 2 || submitting}
                    onClick={() => setSplits((arr) => arr.filter((_, i) => i !== idx))}
                    className="col-span-1 text-negative disabled:opacity-30 flex justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">Deduct From Account *</label>
                <select
                  disabled={submitting}
                  value={form.accountId}
                  onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
                >
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                    disabled={submitting}
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 text-sm font-mono font-semibold bg-canvas border border-hairline rounded-lg focus:outline-none focus:border-ink disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {form.type === 'transfer' ? 'From Account *' : form.type === 'income' ? 'Deposit To *' : 'Deduct From *'}
                  </label>
                  <select
                    disabled={submitting}
                    value={form.accountId}
                    onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface disabled:opacity-60"
                  >
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              {form.type === 'transfer' ? (
                transferBlocked ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    Add at least 2 accounts in the Accounts tab to transfer money between them.
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">To Account *</label>
                    <select
                      disabled={submitting}
                      value={form.toAccountId}
                      onChange={(e) => setForm((f) => ({ ...f, toAccountId: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface disabled:opacity-60"
                    >
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                )
              ) : taskBlocked ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  No {form.type} tasks found. Add one in the Plan & Budgets tab first.
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Task / Category *</label>
                  <select
                    disabled={submitting}
                    value={form.taskId}
                    onChange={(e) => setForm((f) => ({ ...f, taskId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface disabled:opacity-60"
                  >
                    {availableTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink">Date *</label>
                <span className="text-[11px] font-semibold text-ink bg-canvas border border-hairline px-2 py-0.5 rounded-md">
                  {getWeekdayName(form.date)}
                </span>
              </div>
              <input
                type="date"
                required
                disabled={submitting}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-canvas border border-hairline rounded-lg disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Time *</label>
              <input
                type="time"
                required
                disabled={submitting}
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-canvas border border-hairline rounded-lg disabled:opacity-60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Note</label>
            <input
              type="text"
              disabled={submitting}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g., Weekly groceries, Electricity bill"
              className="w-full px-3 py-2 text-sm bg-canvas border border-hairline rounded-lg disabled:opacity-60"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink rounded-lg disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || transferBlocked || taskBlocked}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-ink hover:bg-neutral-800 rounded-lg disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Saving...' : splitMode ? 'Save Split Entries' : 'Save Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

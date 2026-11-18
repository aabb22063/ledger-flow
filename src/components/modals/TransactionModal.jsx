import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getWeekdayName } from '../../lib/formatters';

export default function TransactionModal({
  modal,
  accounts,
  tasks,
  onClose,
  onSave
}) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (modal) setForm({ ...modal.data });
    else setForm(null);
  }, [modal]);

  if (!modal || !form) return null;

  const availableTasks = tasks.filter((t) => t.kind === (form.type === 'income' ? 'income' : 'expense'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await onSave(modal.mode, form);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl max-w-lg w-full shadow-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">
            {modal.mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-1 p-1 bg-canvas rounded-xl border border-hairline">
            {['expense', 'income', 'transfer'].map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => {
                  const firstTask = tasks.find((t) => t.kind === (tp === 'income' ? 'income' : 'expense'))?.id || '';
                  setForm((f) => ({ ...f, type: tp, taskId: firstTask }));
                }}
                className={`py-2 text-xs font-semibold rounded-lg capitalize transition ${
                  form.type === tp ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {tp}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-canvas border border-hairline rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                {form.type === 'transfer' ? 'From Account *' : form.type === 'income' ? 'Deposit To *' : 'Deduct From *'}
              </label>
              <select
                value={form.accountId}
                onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
              >
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {form.type === 'transfer' ? (
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">To Account *</label>
              <select
                value={form.toAccountId}
                onChange={(e) => setForm((f) => ({ ...f, toAccountId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
              >
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Task / Category *</label>
              <select
                value={form.taskId}
                onChange={(e) => setForm((f) => ({ ...f, taskId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
              >
                {availableTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
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
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-canvas border border-hairline rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Time *</label>
              <input
                type="time"
                required
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-canvas border border-hairline rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Note</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g., Weekly groceries, Electricity bill"
              className="w-full px-3 py-2 text-sm bg-canvas border border-hairline rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-ink hover:bg-neutral-800 rounded-lg">
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

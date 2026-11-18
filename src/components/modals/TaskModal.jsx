import React, { useState, useEffect } from 'react';

export default function TaskModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (modal) setForm({ ...modal.data });
    else setForm(null);
  }, [modal]);

  if (!modal || !form) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ok = await onSave(modal.mode, form);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl max-w-md w-full shadow-xl border border-hairline p-5">
        <h3 className="text-base font-bold text-ink mb-4">
          {modal.mode === 'edit' ? 'Edit Task' : 'Add Custom Task'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Task Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., Groceries, Gym, Freelance"
              className="w-full px-3 py-2 text-sm bg-canvas border border-hairline rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Applies To</label>
              <select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Monthly Budget</label>
              <input
                type="number"
                min="0"
                step="100"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                className="w-full px-3 py-2 text-sm font-mono bg-canvas border border-hairline rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Color Tag</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="w-full h-10 p-1 border border-hairline rounded-lg cursor-pointer"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-ink hover:bg-neutral-800 rounded-lg">
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

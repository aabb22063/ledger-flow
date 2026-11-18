import React, { useState, useEffect } from 'react';
import { ACCOUNT_TYPES, ACCOUNT_COLORS } from '../../lib/constants';

export default function AccountModal({ modal, onClose, onSave }) {
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
          {modal.mode === 'edit' ? 'Edit Account' : 'Add Account'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Account Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., HDFC Bank, Cash Wallet"
              className="w-full px-3 py-2 text-sm bg-canvas border border-hairline rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
              >
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Opening Balance</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.openingBalance}
                onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
                className="w-full px-3 py-2 text-sm font-mono bg-canvas border border-hairline rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Accent Color</label>
            <select
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
            >
              {ACCOUNT_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-ink hover:bg-neutral-800 rounded-lg">
              Save Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

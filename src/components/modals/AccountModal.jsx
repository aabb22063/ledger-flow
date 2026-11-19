import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { ACCOUNT_TYPES, ACCOUNT_COLORS } from '../../lib/constants';

export default function AccountModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (modal) {
      setForm({ ...modal.data });
      setSubmitting(false);
    } else {
      setForm(null);
    }
  }, [modal]);

  useEffect(() => {
    if (!modal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal, submitting, onClose]);

  if (!modal || !form) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const ok = await onSave(modal.mode, form);
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
        className="bg-surface rounded-2xl max-w-md w-full shadow-xl border border-hairline p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-ink">
            {modal.mode === 'edit' ? 'Edit Account' : 'Add Account'}
          </h3>
          <button type="button" disabled={submitting} onClick={onClose} aria-label="Close" className="text-muted hover:text-ink disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Account Name *</label>
            <input
              type="text"
              required
              autoFocus
              disabled={submitting}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g., HDFC Bank, Cash Wallet"
              className="w-full px-3 py-2 text-sm bg-canvas border border-hairline rounded-lg disabled:opacity-60"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Type</label>
              <select
                disabled={submitting}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface disabled:opacity-60"
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
                disabled={submitting}
                value={form.openingBalance}
                onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
                className="w-full px-3 py-2 text-sm font-mono bg-canvas border border-hairline rounded-lg disabled:opacity-60"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Accent Color</label>
            <select
              disabled={submitting}
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface disabled:opacity-60"
            >
              {ACCOUNT_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={submitting} onClick={onClose} className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink disabled:opacity-40">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-ink hover:bg-neutral-800 rounded-lg disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Saving...' : 'Save Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

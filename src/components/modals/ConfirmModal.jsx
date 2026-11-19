import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function ConfirmModal({ confirmState, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubmitting(false);
  }, [confirmState]);

  useEffect(() => {
    if (!confirmState) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmState, submitting, onClose]);

  if (!confirmState) return null;

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await confirmState.onOk();
      onClose();
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
        className="bg-surface rounded-2xl max-w-sm w-full shadow-xl border border-hairline p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-ink">{confirmState.title}</h3>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">{confirmState.message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-negative hover:opacity-90 rounded-lg disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{submitting ? 'Processing...' : 'Confirm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

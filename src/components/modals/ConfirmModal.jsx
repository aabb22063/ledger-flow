import React from 'react';

export default function ConfirmModal({ confirmState, onClose }) {
  if (!confirmState) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[1px] flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl max-w-sm w-full shadow-xl border border-hairline p-5">
        <h3 className="text-base font-bold text-ink">{confirmState.title}</h3>
        <p className="text-xs text-muted mt-1.5 leading-relaxed">{confirmState.message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { confirmState.onOk(); onClose(); }}
            className="px-4 py-2 text-xs font-semibold text-white bg-negative hover:opacity-90 rounded-lg"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

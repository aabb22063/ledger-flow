import React from 'react';
import { ArrowLeftRight, Plus } from 'lucide-react';
import { formatMoney } from '../lib/formatters';

export default function AccountsView({
  currency,
  accounts,
  accountStatsMap,
  onOpenTransfer,
  onOpenAddAccount,
  onEditAccount,
  onDeleteAccount
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Manage Accounts</h2>
          <p className="text-xs text-muted">Track inflows, deductions, and transfers across wallets, banks, and cards.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenTransfer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-hairline bg-surface hover:bg-canvas text-ink transition"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
          </button>
          <button
            type="button"
            onClick={onOpenAddAccount}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-ink hover:bg-neutral-800 text-white transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((a) => {
          const st = accountStatsMap[a.id] || { balance: 0, totalIn: 0, totalOut: 0 };
          return (
            <div key={a.id} className="bg-surface rounded-xl p-5 border border-hairline">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                  <div>
                    <h3 className="text-base font-bold text-ink">{a.name}</h3>
                    <p className="text-xs text-muted">{a.type}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => onEditAccount(a)} className="text-xs text-ink font-medium hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => onDeleteAccount(a)} className="text-xs text-negative font-medium hover:underline">
                    Delete
                  </button>
                </div>
              </div>
              <p className={`font-mono text-2xl font-bold mt-4 tabular-nums ${st.balance < 0 ? 'text-negative' : 'text-ink'}`}>
                {formatMoney(st.balance, currency)}
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-hairline text-xs">
                <div>
                  <span className="text-muted block">Opening</span>
                  <strong className="font-mono text-ink">{formatMoney(a.openingBalance, currency)}</strong>
                </div>
                <div>
                  <span className="text-muted block">In</span>
                  <strong className="font-mono text-positive">+{formatMoney(st.totalIn, currency)}</strong>
                </div>
                <div>
                  <span className="text-muted block">Out</span>
                  <strong className="font-mono text-negative">-{formatMoney(st.totalOut, currency)}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

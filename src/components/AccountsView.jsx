import React from 'react';
import { ArrowLeftRight, Plus, Wallet, CreditCard } from 'lucide-react';
import { formatMoney } from '../lib/formatters';

export default function AccountsView({
  currency,
  privacyLevel,
  accounts,
  accountStatsMap,
  onOpenTransfer,
  onPayCreditCard,
  onOpenAddAccount,
  onEditAccount,
  onDeleteAccount
}) {
  const hideBalances = privacyLevel === 'balances' || privacyLevel === 'all';
  const hideAll = privacyLevel === 'all';
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
            disabled={accounts.length < 2}
            onClick={onOpenTransfer}
            title={accounts.length < 2 ? 'Add at least 2 accounts to transfer' : 'Transfer between accounts'}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-hairline bg-surface hover:bg-canvas text-ink transition disabled:opacity-40 disabled:cursor-not-allowed"
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

      {accounts.length === 0 ? (
        <div className="bg-surface rounded-xl border border-hairline p-10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-canvas border border-hairline mx-auto flex items-center justify-center text-muted">
            <Wallet className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-ink">No accounts yet</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Add your bank account, cash wallet, or UPI account to start tracking balances and transactions.
          </p>
          <button
            type="button"
            onClick={onOpenAddAccount}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-ink text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Create First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => {
            const st = accountStatsMap[a.id] || { balance: 0, totalIn: 0, totalOut: 0 };
            const isCreditOwed = a.type === 'Credit Card' && st.balance < 0;
            return (
              <div key={a.id} className="bg-surface rounded-xl p-5 border border-hairline flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      <div>
                        <h3 className="text-base font-bold text-ink">{a.name}</h3>
                        <p className="text-xs text-muted">{a.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => onEditAccount(a)} className="text-xs text-ink font-medium hover:underline py-1 px-1">
                        Edit
                      </button>
                      <button type="button" onClick={() => onDeleteAccount(a)} className="text-xs text-negative font-medium hover:underline py-1 px-1">
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className={`font-mono text-2xl font-bold mt-4 tabular-nums ${st.balance < 0 ? 'text-negative' : 'text-ink'}`}>
                    {formatMoney(st.balance, currency, hideBalances)}
                  </p>
                  {isCreditOwed && (
                    <button
                      type="button"
                      disabled={accounts.length < 2}
                      onClick={() => onPayCreditCard(a, Math.abs(st.balance))}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-canvas border border-hairline text-ink hover:bg-hairline/40 transition disabled:opacity-40"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-negative" />
                      Pay Card Bill ({formatMoney(Math.abs(st.balance), currency, hideAll)})
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-hairline text-xs">
                  <div>
                    <span className="text-muted block">Opening</span>
                    <strong className="font-mono text-ink">{formatMoney(a.openingBalance, currency, hideBalances)}</strong>
                  </div>
                  <div>
                    <span className="text-muted block">In</span>
                    <strong className="font-mono text-positive">+{formatMoney(st.totalIn, currency, hideAll)}</strong>
                  </div>
                  <div>
                    <span className="text-muted block">Out</span>
                    <strong className="font-mono text-negative">-{formatMoney(st.totalOut, currency, hideAll)}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

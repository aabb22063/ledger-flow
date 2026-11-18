import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { formatMoney, formatDisplayDate, formatTime12h, getWeekdayName } from '../lib/formatters';

export default function DashboardView({
  currency,
  accounts,
  tasks,
  accountStatsMap,
  periodTxs,
  metrics,
  showAllTime,
  onOpenNewAccount,
  onOpenTransfer,
  onViewAllTransactions
}) {
  const recentTxs = [...periodTxs]
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-5 border border-hairline">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Balance</span>
          <p className="font-mono text-2xl font-bold text-ink mt-2 tabular-nums">
            {formatMoney(metrics.totalBalance, currency)}
          </p>
          <p className="text-xs text-muted mt-1">Across {accounts.length} active accounts</p>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {showAllTime ? 'Total Money In' : 'Monthly Money In'}
            </span>
            <ArrowDownLeft className="w-4 h-4 text-positive" />
          </div>
          <p className="font-mono text-2xl font-bold text-positive mt-2 tabular-nums">
            {formatMoney(metrics.periodIn, currency)}
          </p>
          <p className="text-xs text-muted mt-1">{metrics.inCount} deposits recorded</p>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {showAllTime ? 'Total Money Out' : 'Monthly Money Out'}
            </span>
            <ArrowUpRight className="w-4 h-4 text-negative" />
          </div>
          <p className="font-mono text-2xl font-bold text-negative mt-2 tabular-nums">
            {formatMoney(metrics.periodOut, currency)}
          </p>
          <p className="text-xs text-muted mt-1">
            {metrics.outCount} expenses · Avg {formatMoney(metrics.avgDaily, currency)}/day
          </p>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-hairline">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Net Cash Flow</span>
          <p className={`font-mono text-2xl font-bold mt-2 tabular-nums ${metrics.netFlow >= 0 ? 'text-positive' : 'text-negative'}`}>
            {metrics.netFlow >= 0 ? '+' : ''}{formatMoney(metrics.netFlow, currency)}
          </p>
          <p className="text-xs text-muted mt-1 truncate">
            {metrics.sortedTasks[0]
              ? `Top: ${metrics.sortedTasks[0].name} (${formatMoney(metrics.sortedTasks[0].amount, currency)})`
              : 'No expenses recorded'}
          </p>
        </div>
      </div>

      {/* Accounts Strip */}
      <div className="bg-surface rounded-xl p-5 border border-hairline">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-ink">Accounts</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTransfer}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink px-2.5 py-1.5 rounded-lg border border-hairline transition"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
            </button>
            <button
              type="button"
              onClick={onOpenNewAccount}
              className="text-xs font-semibold text-ink bg-canvas hover:bg-hairline/60 px-2.5 py-1.5 rounded-lg border border-hairline transition"
            >
              + New Account
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {accounts.map((a) => {
            const st = accountStatsMap[a.id] || { balance: 0 };
            return (
              <div key={a.id} className="p-3.5 rounded-lg border border-hairline bg-canvas/60">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted">{a.type}</span>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                </div>
                <p className="text-sm font-semibold text-ink mt-1 truncate">{a.name}</p>
                <p className={`font-mono text-lg font-bold mt-1 tabular-nums ${st.balance < 0 ? 'text-negative' : 'text-ink'}`}>
                  {formatMoney(st.balance, currency)}
                </p>
              </div>
            );
          })}
          {accounts.length === 0 && (
            <p className="text-xs text-muted col-span-full py-2">No accounts yet. Add one to get started.</p>
          )}
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-surface rounded-xl p-5 border border-hairline flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-ink">Spending by Task</h2>
              <p className="text-xs text-muted">Where your money went</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-canvas border border-hairline text-ink">
              {metrics.periodIn > 0 ? `${metrics.savingsRate}% Saved` : 'No Income'}
            </span>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.sortedTasks.length ? metrics.sortedTasks : [{ name: 'No Data', amount: 1, color: '#E5E5E0' }]}
                  dataKey="amount"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="84%"
                  paddingAngle={2}
                >
                  {(metrics.sortedTasks.length ? metrics.sortedTasks : [{ color: '#E5E5E0' }]).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                {metrics.sortedTasks.length > 0 && (
                  <RechartsTooltip formatter={(v) => formatMoney(v, currency)} />
                )}
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {metrics.sortedTasks.map((t) => (
              <div key={t.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="font-medium text-ink truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                    <span className="font-semibold text-ink">{formatMoney(t.amount, currency)}</span>
                    <span className="text-muted w-8 text-right">{t.pct}%</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${t.pct}%`, backgroundColor: t.color }} />
                </div>
              </div>
            ))}
            {metrics.sortedTasks.length === 0 && (
              <p className="text-xs text-muted text-center py-4">No expenses for this period.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-surface rounded-xl p-5 border border-hairline">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-ink">Daily Money In vs Out</h2>
                <p className="text-xs text-muted">{periodTxs.length} transactions in period</p>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B6B66' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B6B66' }} />
                  <RechartsTooltip formatter={(v) => formatMoney(v, currency)} />
                  <Bar dataKey="in" name="Money In" fill="#0D6E4E" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="out" name="Money Out" fill="#C23B2B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface rounded-xl p-5 border border-hairline">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-ink">Spending by Day of Week</h2>
              <span className="text-xs font-medium text-ink bg-canvas border border-hairline px-2.5 py-0.5 rounded-md">
                Peak: {metrics.peakDay}
              </span>
            </div>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.weekdaySeries}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B6B66' }} />
                  <RechartsTooltip formatter={(v) => formatMoney(v, currency)} />
                  <Bar dataKey="amount" name="Spent" fill="#111110" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-surface rounded-xl border border-hairline overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-ink">Recent Entries</h2>
            <p className="text-xs text-muted">Latest activity with day, date, time, task & account</p>
          </div>
          <button
            type="button"
            onClick={onViewAllTransactions}
            className="text-xs font-semibold text-ink hover:underline"
          >
            View All →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-hairline">
                <th className="py-3 px-4">Day, Date & Time</th>
                <th className="py-3 px-4">Task</th>
                <th className="py-3 px-4">Note</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline text-sm">
              {recentTxs.map((tx) => {
                const task = tasks.find((t) => t.id === tx.taskId);
                const acct = accounts.find((a) => a.id === tx.accountId);
                const toAcct = accounts.find((a) => a.id === tx.toAccountId);
                return (
                  <tr key={tx.id} className="hover:bg-canvas/60">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-ink">
                        {getWeekdayName(tx.date, true)}, {formatDisplayDate(tx.date)}
                      </div>
                      <div className="text-[11px] text-muted">{formatTime12h(tx.time)}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs font-medium text-ink">
                      {tx.type === 'transfer' ? 'Account Transfer' : (task?.name || 'Other')}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted max-w-xs truncate">{tx.note || '—'}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-ink">
                      {tx.type === 'transfer' ? `${acct?.name || '?'} → ${toAcct?.name || '?'}` : (acct?.name || 'Unknown')}
                    </td>
                    <td className={`py-3 px-4 text-right whitespace-nowrap font-mono font-semibold tabular-nums ${
                      tx.type === 'income' ? 'text-positive' : tx.type === 'expense' ? 'text-negative' : 'text-ink'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatMoney(tx.amount, currency)}
                    </td>
                  </tr>
                );
              })}
              {recentTxs.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-xs text-muted">
                    No transactions for this period. Click "Add Entry" to log one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Zap, Loader2, CalendarClock, Plus
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { formatMoney, formatDisplayDate, formatTime12h, getWeekdayName, parseQuickEntry } from '../lib/formatters';

export default function DashboardView({
  currency,
  privacyLevel,
  accounts,
  tasks,
  accountStatsMap,
  periodTxs,
  metrics,
  showAllTime,
  quickTemplates,
  recurringBills,
  onQuickSaveTx,
  onLogRecurringBill,
  onOpenNewAccount,
  onOpenTransfer,
  onViewAllTransactions,
  onGoToBudgets
}) {
  const [quickInput, setQuickInput] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [loggingTemplateId, setLoggingTemplateId] = useState(null);
  const [loggingBillId, setLoggingBillId] = useState(null);

  const hideBalances = privacyLevel === 'balances' || privacyLevel === 'all';
  const hideAll = privacyLevel === 'all';

  const recentTxs = [...periodTxs]
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 6);

  const now = new Date();
  const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const dueBills = recurringBills.filter((b) => b.lastLoggedMonth !== curMonthKey);

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    if (quickSaving || !accounts.length) return;
    const parsed = parseQuickEntry(quickInput, accounts, tasks);
    if (!parsed) return;
    setQuickSaving(true);
    try {
      const ok = await onQuickSaveTx('add', parsed);
      if (ok) setQuickInput('');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleRunTemplate = async (tpl) => {
    if (loggingTemplateId) return;
    setLoggingTemplateId(tpl.id);
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    try {
      await onQuickSaveTx('add', {
        type: tpl.type || 'expense',
        amount: tpl.amount,
        accountId: tpl.accountId || accounts[0]?.id || '',
        taskId: tpl.taskId || tasks[0]?.id || '',
        date,
        time,
        note: tpl.name
      });
    } finally {
      setLoggingTemplateId(null);
    }
  };

  const handleRunBill = async (bill) => {
    if (loggingBillId) return;
    setLoggingBillId(bill.id);
    try {
      await onLogRecurringBill(bill);
    } finally {
      setLoggingBillId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Natural-Language Entry + Quick Templates */}
      <div className="bg-surface rounded-xl p-4 border border-hairline space-y-3">
        <form onSubmit={handleQuickSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Zap className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              disabled={quickSaving || accounts.length === 0}
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder='Quick log: e.g. "450 groceries upi" or "+50000 salary"'
              className="w-full pl-9 pr-3 py-2 text-sm bg-canvas border border-hairline rounded-lg focus:outline-none focus:border-ink disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={quickSaving || !quickInput.trim() || accounts.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-ink hover:bg-neutral-800 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {quickSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{quickSaving ? 'Logging...' : 'Quick Log'}</span>
          </button>
        </form>

        {quickTemplates.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[11px] font-semibold text-muted uppercase shrink-0">Presets:</span>
            {quickTemplates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                disabled={Boolean(loggingTemplateId)}
                onClick={() => handleRunTemplate(tpl)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-canvas hover:bg-hairline/50 border border-hairline text-xs font-medium text-ink shrink-0 transition disabled:opacity-50"
              >
                {loggingTemplateId === tpl.id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Plus className="w-3 h-3 text-muted" />}
                <span>{tpl.name}</span>
                <span className="font-mono text-[11px] text-muted">{formatMoney(tpl.amount, currency, hideAll)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-5 border border-hairline">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Balance</span>
          <p className="font-mono text-2xl font-bold text-ink mt-2 tabular-nums">
            {formatMoney(metrics.totalBalance, currency, hideBalances)}
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
            {formatMoney(metrics.periodIn, currency, hideAll)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted">{metrics.inCount} deposits</span>
            {metrics.inMomPct !== null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                metrics.inMomPct >= 0 ? 'bg-emerald-50 text-positive' : 'bg-red-50 text-negative'
              }`}>
                {metrics.inMomPct >= 0 ? `+${metrics.inMomPct}%` : `${metrics.inMomPct}%`} vs {metrics.prevMonthShort}
              </span>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {showAllTime ? 'Total Money Out' : 'Monthly Money Out'}
            </span>
            <ArrowUpRight className="w-4 h-4 text-negative" />
          </div>
          <p className="font-mono text-2xl font-bold text-negative mt-2 tabular-nums">
            {formatMoney(metrics.periodOut, currency, hideAll)}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted">Avg {formatMoney(metrics.avgDaily, currency, hideAll)}/day</span>
            {metrics.outMomPct !== null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                metrics.outMomPct <= 0 ? 'bg-emerald-50 text-positive' : 'bg-red-50 text-negative'
              }`}>
                {metrics.outMomPct >= 0 ? `+${metrics.outMomPct}%` : `${metrics.outMomPct}%`} vs {metrics.prevMonthShort}
              </span>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-xl p-5 border border-hairline">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Safe to Spend / Day</span>
            <button type="button" onClick={onGoToBudgets} className="text-[11px] font-semibold text-muted hover:text-ink">
              Budgets →
            </button>
          </div>
          {metrics.totalBudget > 0 ? (
            <>
              <p className={`font-mono text-2xl font-bold mt-2 tabular-nums ${
                metrics.safeToSpendPerDay >= 0 ? 'text-ink' : 'text-negative'
              }`}>
                {formatMoney(metrics.safeToSpendPerDay, currency, hideAll)}
              </p>
              <p className="text-xs text-muted mt-1">
                {formatMoney(metrics.remainingBudget, currency, hideAll)} left · {metrics.remainingDaysInMonth}d remaining
              </p>
            </>
          ) : (
            <>
              <p className={`font-mono text-2xl font-bold mt-2 tabular-nums ${metrics.netFlow >= 0 ? 'text-positive' : 'text-negative'}`}>
                {metrics.netFlow >= 0 ? '+' : ''}{formatMoney(metrics.netFlow, currency, hideAll)}
              </p>
              <p className="text-xs text-muted mt-1">Net cash flow (set budgets for daily pace)</p>
            </>
          )}
        </div>
      </div>

      {/* Upcoming Recurring Bills Banner */}
      {dueBills.length > 0 && (
        <div className="bg-surface rounded-xl p-4 border border-hairline">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-ink" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                Due This Month ({dueBills.length})
              </h2>
            </div>
            <button type="button" onClick={onGoToBudgets} className="text-xs font-semibold text-muted hover:text-ink">
              Manage Bills →
            </button>
          </div>
          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar">
            {dueBills.map((bill) => (
              <div key={bill.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-canvas border border-hairline shrink-0">
                <div>
                  <p className="text-xs font-semibold text-ink">{bill.name}</p>
                  <p className="text-[11px] text-muted font-mono">
                    {formatMoney(bill.amount, currency, hideAll)} · Due Day {bill.dueDay}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={Boolean(loggingBillId)}
                  onClick={() => handleRunBill(bill)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-ink text-white text-[11px] font-semibold hover:bg-neutral-800 disabled:opacity-50"
                >
                  {loggingBillId === bill.id && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Log</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accounts Strip */}
      <div className="bg-surface rounded-xl p-5 border border-hairline">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold text-ink">Accounts</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={accounts.length < 2}
              onClick={onOpenTransfer}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink px-2.5 py-1.5 rounded-lg border border-hairline transition disabled:opacity-40"
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
                  {formatMoney(st.balance, currency, hideBalances)}
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
                  <RechartsTooltip formatter={(v) => formatMoney(v, currency, hideAll)} />
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
                    <span className="font-semibold text-ink">{formatMoney(t.amount, currency, hideAll)}</span>
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
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6B6B66' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#6B6B66' }} />
                  <RechartsTooltip formatter={(v) => formatMoney(v, currency, hideAll)} />
                  <Bar dataKey="in" name="Money In" fill="#0D6E4E" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="out" name="Money Out" fill="#C23B2B" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl p-5 border border-hairline">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-ink">Day of Week</h2>
                <span className="text-[11px] font-medium text-ink bg-canvas border border-hairline px-2 py-0.5 rounded">
                  Peak: {metrics.peakDay}
                </span>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.weekdaySeries}>
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B6B66' }} />
                    <RechartsTooltip formatter={(v) => formatMoney(v, currency, hideAll)} />
                    <Bar dataKey="amount" name="Spent" fill="#111110" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-5 border border-hairline">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-ink">6-Month Net Worth</h2>
                <span className="text-[11px] text-muted">Cumulative</span>
              </div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.netWorthSeries}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6B6B66' }} />
                    <RechartsTooltip formatter={(v) => formatMoney(v, currency, hideBalances)} />
                    <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="#0D6E4E" fill="#0D6E4E" fillOpacity={0.12} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
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
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatMoney(tx.amount, currency, hideAll)}
                    </td>
                  </tr>
                );
              })}
              {recentTxs.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-xs text-muted">
                    No transactions for this period. Use Quick Log above or click "Add Entry".
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

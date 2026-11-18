import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { WEEKDAYS } from '../lib/constants';
import { formatDisplayDate, formatMoney, formatTime12h, getWeekdayIndex, getWeekdayName } from '../lib/formatters';

export default function TransactionsView({
  currency,
  accounts,
  tasks,
  periodTxs,
  onEditTx,
  onDeleteTx
}) {
  const [searchQ, setSearchQ] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterTask, setFilterTask] = useState('all');
  const [filterDay, setFilterDay] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');

  const filteredTxs = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return periodTxs
      .filter((tx) => {
        if (filterType !== 'all' && tx.type !== filterType) return false;
        if (filterAccount !== 'all' && tx.accountId !== filterAccount && tx.toAccountId !== filterAccount) return false;
        if (filterTask !== 'all' && tx.taskId !== filterTask) return false;
        if (filterDay !== 'all' && String(getWeekdayIndex(tx.date)) !== filterDay) return false;
        if (q) {
          const tName = (tasks.find((t) => t.id === tx.taskId)?.name || '').toLowerCase();
          const aName = (accounts.find((a) => a.id === tx.accountId)?.name || '').toLowerCase();
          const note = (tx.note || '').toLowerCase();
          if (!tName.includes(q) && !aName.includes(q) && !note.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date-asc') return (a.date + a.time).localeCompare(b.date + b.time);
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        return (b.date + b.time).localeCompare(a.date + a.time);
      });
  }, [periodTxs, searchQ, filterType, filterAccount, filterTask, filterDay, sortBy, tasks, accounts]);

  const { sumIn, sumOut } = useMemo(() => {
    let i = 0;
    let o = 0;
    for (const tx of filteredTxs) {
      if (tx.type === 'income') i += Number(tx.amount) || 0;
      if (tx.type === 'expense') o += Number(tx.amount) || 0;
    }
    return { sumIn: i, sumOut: o };
  }, [filteredTxs]);

  return (
    <div className="space-y-5">
      <div className="bg-surface rounded-xl p-4 border border-hairline">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Search</label>
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search task, note, account..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-canvas border border-hairline rounded-lg focus:outline-none focus:border-ink"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
            >
              <option value="all">All Types</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Account</label>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
            >
              <option value="all">All Accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Task</label>
            <select
              value={filterTask}
              onChange={(e) => setFilterTask(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
            >
              <option value="all">All Tasks</option>
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Day</label>
            <select
              value={filterDay}
              onChange={(e) => setFilterDay(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-hairline rounded-lg bg-surface"
            >
              <option value="all">Any Day</option>
              {WEEKDAYS.map((d, i) => <option key={d} value={String(i)}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-hairline text-xs">
          <div className="flex items-center gap-4 text-muted">
            <span>Showing <strong className="text-ink">{filteredTxs.length}</strong> entries</span>
            <span>In: <strong className="font-mono text-positive">{formatMoney(sumIn, currency)}</strong></span>
            <span>Out: <strong className="font-mono text-negative">{formatMoney(sumOut, currency)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-hairline rounded-lg px-2.5 py-1.5 bg-surface text-ink"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setSearchQ('');
                setFilterType('all');
                setFilterAccount('all');
                setFilterTask('all');
                setFilterDay('all');
              }}
              className="text-muted hover:text-ink px-2 py-1"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-hairline overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-canvas text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-hairline">
              <th className="py-3 px-4">Day, Date & Time</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Task</th>
              <th className="py-3 px-4">Note</th>
              <th className="py-3 px-4">Account</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline text-sm">
            {filteredTxs.map((tx) => {
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
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                      tx.type === 'income'
                        ? 'bg-emerald-50 text-positive'
                        : tx.type === 'expense'
                          ? 'bg-red-50 text-negative'
                          : 'bg-canvas text-ink border border-hairline'
                    }`}>
                      {tx.type === 'income' ? 'Money In' : tx.type === 'expense' ? 'Expense' : 'Transfer'}
                    </span>
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
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onEditTx(tx)}
                      className="text-xs font-medium text-ink hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTx(tx)}
                      className="text-xs font-medium text-negative hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredTxs.length === 0 && (
              <tr>
                <td colSpan="7" className="py-10 text-center text-xs text-muted">
                  No matching transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

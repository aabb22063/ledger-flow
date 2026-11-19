import React, { useMemo } from 'react';
import { Plus, Tag } from 'lucide-react';
import { formatMoney } from '../lib/formatters';

export default function BudgetsView({
  currency,
  tasks,
  periodTxs,
  onOpenAddTask,
  onEditTask,
  onDeleteTask
}) {
  const summary = useMemo(() => {
    let totalBudget = 0;
    let budgetedSpent = 0;
    for (const t of tasks) {
      if (t.kind === 'expense' && t.budget > 0) {
        totalBudget += Number(t.budget) || 0;
        const spent = periodTxs
          .filter((tx) => tx.taskId === t.id && tx.type === 'expense')
          .reduce((s, x) => s + (Number(x.amount) || 0), 0);
        budgetedSpent += spent;
      }
    }
    return {
      totalBudget,
      budgetedSpent,
      remaining: totalBudget - budgetedSpent
    };
  }, [tasks, periodTxs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Tasks & Monthly Budgets</h2>
          <p className="text-xs text-muted">Customize spending tasks and track monthly limits.</p>
        </div>
        <button
          type="button"
          onClick={onOpenAddTask}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-ink hover:bg-neutral-800 text-white transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Custom Task
        </button>
      </div>

      {/* Budget Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl p-4 border border-hairline">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Monthly Budget</span>
          <p className="font-mono text-xl font-bold text-ink mt-1 tabular-nums">{formatMoney(summary.totalBudget, currency)}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-hairline">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Budgeted Spend So Far</span>
          <p className="font-mono text-xl font-bold text-negative mt-1 tabular-nums">{formatMoney(summary.budgetedSpent, currency)}</p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-hairline">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Remaining Budget</span>
          <p className={`font-mono text-xl font-bold mt-1 tabular-nums ${summary.remaining >= 0 ? 'text-positive' : 'text-negative'}`}>
            {formatMoney(summary.remaining, currency)}
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-surface rounded-xl border border-hairline p-10 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-canvas border border-hairline mx-auto flex items-center justify-center text-muted">
            <Tag className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-ink">No tasks or categories yet</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Create tasks like Groceries, Rent, or Salary to categorize your transactions and set monthly budgets.
          </p>
          <button
            type="button"
            onClick={onOpenAddTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-ink text-white"
          >
            <Plus className="w-3.5 h-3.5" /> Add First Task
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((t) => {
            const matching = periodTxs.filter((tx) => tx.taskId === t.id && tx.type === t.kind);
            const spent = matching.reduce((s, x) => s + (Number(x.amount) || 0), 0);
            const hasBudget = t.kind === 'expense' && t.budget > 0;
            const pct = hasBudget ? Math.min(100, Math.round((spent / t.budget) * 100)) : 0;
            const over = hasBudget && spent > t.budget;

            return (
              <div key={t.id} className="bg-surface rounded-xl p-4 border border-hairline">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                    <div>
                      <h3 className="text-sm font-bold text-ink">{t.name}</h3>
                      <span className="text-[11px] text-muted">
                        {t.kind === 'income' ? 'Income Source' : 'Expense Task'} · {matching.length} entr{matching.length === 1 ? 'y' : 'ies'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => onEditTask(t)} className="text-xs text-ink font-medium hover:underline py-1 px-1">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDeleteTask(t)} className="text-xs text-negative font-medium hover:underline py-1 px-1">
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-baseline justify-between text-sm tabular-nums">
                  <strong className="font-mono text-ink">{formatMoney(spent, currency)}</strong>
                  {hasBudget ? (
                    <span className={`text-xs ${over ? 'text-negative font-semibold' : 'text-muted'}`}>
                      of {formatMoney(t.budget, currency)} {over ? '(Over budget)' : ''}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">No budget limit</span>
                  )}
                </div>
                {hasBudget && (
                  <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full rounded-full transition-all ${over ? 'bg-negative' : 'bg-ink'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

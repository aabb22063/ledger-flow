import React from 'react';
import { Plus } from 'lucide-react';
import { formatMoney } from '../lib/formatters';

export default function BudgetsView({
  currency,
  tasks,
  periodTxs,
  onOpenAddTask,
  onEditTask,
  onDeleteTask
}) {
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((t) => {
          const spent = periodTxs
            .filter((tx) => tx.taskId === t.id && tx.type === t.kind)
            .reduce((s, x) => s + (Number(x.amount) || 0), 0);
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
                      {t.kind === 'income' ? 'Income Source' : 'Expense Task'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => onEditTask(t)} className="text-xs text-ink font-medium hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => onDeleteTask(t)} className="text-xs text-negative font-medium hover:underline">
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
                    className={`h-full rounded-full ${over ? 'bg-negative' : 'bg-ink'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

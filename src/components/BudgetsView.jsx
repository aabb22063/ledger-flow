import React, { useState } from 'react';
import { Plus, Tag, CalendarClock, Target, Sparkles, Trash2, Loader2 } from 'lucide-react';
import { formatMoney } from '../lib/formatters';

export default function BudgetsView({
  currency,
  privacyLevel,
  tasks,
  accounts,
  periodTxs,
  metrics,
  quickTemplates,
  recurringBills,
  savingsGoals,
  categoryRules,
  onOpenAddTask,
  onEditTask,
  onDeleteTask,
  onAddQuickTemplate,
  onDeleteQuickTemplate,
  onAddRecurringBill,
  onDeleteRecurringBill,
  onLogRecurringBill,
  onAddSavingsGoal,
  onContributeGoal,
  onDeleteSavingsGoal,
  onAddCategoryRule,
  onDeleteCategoryRule
}) {
  const [subTab, setSubTab] = useState('budgets'); // 'budgets' | 'recurring' | 'goals' | 'automation'

  // Inline forms state
  const [billForm, setBillForm] = useState({ name: '', amount: '', dueDay: 1, accountId: accounts[0]?.id || '', taskId: tasks.find(t => t.kind === 'expense')?.id || '' });
  const [loggingBillId, setLoggingBillId] = useState(null);

  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', savedAmount: '', targetDate: '' });
  const [contribAmounts, setContribAmounts] = useState({});

  const [tplForm, setTplForm] = useState({ name: '', amount: '', accountId: accounts[0]?.id || '', taskId: tasks.find(t => t.kind === 'expense')?.id || '' });
  const [ruleForm, setRuleForm] = useState({ keyword: '', taskId: tasks.find(t => t.kind === 'expense')?.id || '' });

  const hideBalances = privacyLevel === 'balances' || privacyLevel === 'all';
  const hideAll = privacyLevel === 'all';
  const expenseTasks = tasks.filter((t) => t.kind === 'expense');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Planning, Budgets & Automation</h2>
          <p className="text-xs text-muted">Manage task budgets, recurring bills, savings goals, and auto-rules.</p>
        </div>
        <button
          type="button"
          onClick={onOpenAddTask}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-ink hover:bg-neutral-800 text-white transition"
        >
          <Plus className="w-3.5 h-3.5" /> Add Custom Task
        </button>
      </div>

      {/* Sub-navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'budgets', label: 'Task Budgets', icon: Tag },
          { id: 'recurring', label: `Recurring Bills (${recurringBills.length})`, icon: CalendarClock },
          { id: 'goals', label: `Savings Goals (${savingsGoals.length})`, icon: Target },
          { id: 'automation', label: 'Presets & Rules', icon: Sparkles }
        ].map((st) => {
          const Icon = st.icon;
          const active = subTab === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => setSubTab(st.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border whitespace-nowrap transition ${
                active ? 'bg-ink text-white border-ink' : 'bg-surface text-muted border-hairline hover:text-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{st.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'budgets' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-surface rounded-xl p-4 border border-hairline">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total Monthly Budget</span>
              <p className="font-mono text-xl font-bold text-ink mt-1">{formatMoney(metrics.totalBudget, currency, hideAll)}</p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-hairline">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Budgeted Spend</span>
              <p className="font-mono text-xl font-bold text-negative mt-1">{formatMoney(metrics.budgetedSpent, currency, hideAll)}</p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-hairline">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Remaining</span>
              <p className={`font-mono text-xl font-bold mt-1 ${metrics.remainingBudget >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatMoney(metrics.remainingBudget, currency, hideAll)}
              </p>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-hairline">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Safe Daily Pace</span>
              <p className={`font-mono text-xl font-bold mt-1 ${metrics.safeToSpendPerDay >= 0 ? 'text-ink' : 'text-negative'}`}>
                {formatMoney(metrics.safeToSpendPerDay, currency, hideAll)}/d
              </p>
            </div>
          </div>

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
                      <button type="button" onClick={() => onEditTask(t)} className="text-xs text-ink font-medium hover:underline py-1">
                        Edit
                      </button>
                      <button type="button" onClick={() => onDeleteTask(t)} className="text-xs text-negative font-medium hover:underline py-1">
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between text-sm tabular-nums">
                    <strong className="font-mono text-ink">{formatMoney(spent, currency, hideAll)}</strong>
                    {hasBudget ? (
                      <span className={`text-xs ${over ? 'text-negative font-semibold' : 'text-muted'}`}>
                        of {formatMoney(t.budget, currency, hideAll)} {over ? '(Over budget)' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-muted">No budget limit</span>
                    )}
                  </div>
                  {hasBudget && (
                    <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden mt-2">
                      <div className={`h-full rounded-full transition-all ${over ? 'bg-negative' : 'bg-ink'}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === 'recurring' && (
        <div className="space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!billForm.name.trim() || !billForm.amount) return;
              onAddRecurringBill({
                name: billForm.name.trim(),
                amount: parseFloat(billForm.amount),
                dueDay: parseInt(billForm.dueDay, 10) || 1,
                accountId: billForm.accountId || accounts[0]?.id || '',
                taskId: billForm.taskId || expenseTasks[0]?.id || ''
              });
              setBillForm((f) => ({ ...f, name: '', amount: '' }));
            }}
            className="bg-surface rounded-xl p-4 border border-hairline grid grid-cols-1 sm:grid-cols-6 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Bill / Subscription Name</label>
              <input
                type="text" required placeholder="e.g., Fiber Wi-Fi, Rent, Gym"
                value={billForm.name} onChange={(e) => setBillForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-canvas border border-hairline rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Amount</label>
              <input
                type="number" step="0.01" min="1" required placeholder="999"
                value={billForm.amount} onChange={(e) => setBillForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-mono bg-canvas border border-hairline rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Due Day (1–28)</label>
              <input
                type="number" min="1" max="28" required
                value={billForm.dueDay} onChange={(e) => setBillForm((f) => ({ ...f, dueDay: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-mono bg-canvas border border-hairline rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Task</label>
              <select
                value={billForm.taskId || expenseTasks[0]?.id || ''}
                onChange={(e) => setBillForm((f) => ({ ...f, taskId: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-hairline rounded-lg bg-surface"
              >
                {expenseTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-ink text-white hover:bg-neutral-800">
              + Add Bill
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recurringBills.map((b) => {
              const tName = tasks.find((t) => t.id === b.taskId)?.name || 'Expense';
              const aName = accounts.find((a) => a.id === b.accountId)?.name || 'Default';
              return (
                <div key={b.id} className="bg-surface rounded-xl p-4 border border-hairline flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-ink">{b.name}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      Due Day {b.dueDay} · {tName} · {aName}
                    </p>
                    <p className="font-mono text-base font-bold text-ink mt-1">{formatMoney(b.amount, currency, hideAll)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={Boolean(loggingBillId)}
                      onClick={async () => {
                        setLoggingBillId(b.id);
                        try { await onLogRecurringBill(b); } finally { setLoggingBillId(null); }
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-ink text-white disabled:opacity-50"
                    >
                      {loggingBillId === b.id && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Log Now</span>
                    </button>
                    <button type="button" onClick={() => onDeleteRecurringBill(b.id)} aria-label="Delete bill" className="p-1.5 text-negative hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            {recurringBills.length === 0 && (
              <p className="text-xs text-muted col-span-full py-6 text-center">No recurring bills added yet.</p>
            )}
          </div>
        </div>
      )}

      {subTab === 'goals' && (
        <div className="space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!goalForm.name.trim() || !goalForm.targetAmount) return;
              onAddSavingsGoal({
                name: goalForm.name.trim(),
                targetAmount: parseFloat(goalForm.targetAmount),
                savedAmount: parseFloat(goalForm.savedAmount) || 0,
                targetDate: goalForm.targetDate
              });
              setGoalForm({ name: '', targetAmount: '', savedAmount: '', targetDate: '' });
            }}
            className="bg-surface rounded-xl p-4 border border-hairline grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Goal Name</label>
              <input
                type="text" required placeholder="e.g., Emergency Fund, MacBook, Vacation"
                value={goalForm.name} onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-canvas border border-hairline rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Target Amount</label>
              <input
                type="number" min="1" step="100" required placeholder="50000"
                value={goalForm.targetAmount} onChange={(e) => setGoalForm((f) => ({ ...f, targetAmount: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-mono bg-canvas border border-hairline rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase mb-1">Already Saved</label>
              <input
                type="number" min="0" step="100" placeholder="0"
                value={goalForm.savedAmount} onChange={(e) => setGoalForm((f) => ({ ...f, savedAmount: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-mono bg-canvas border border-hairline rounded-lg"
              />
            </div>
            <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-lg bg-ink text-white hover:bg-neutral-800">
              + Add Goal
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savingsGoals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0;
              return (
                <div key={g.id} className="bg-surface rounded-xl p-4 border border-hairline space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-ink">{g.name}</h3>
                      <p className="text-xs text-muted font-mono mt-0.5">
                        {formatMoney(g.savedAmount, currency, hideBalances)} of {formatMoney(g.targetAmount, currency, hideBalances)} ({pct}%)
                      </p>
                    </div>
                    <button type="button" onClick={() => onDeleteSavingsGoal(g.id)} aria-label="Delete goal" className="text-negative p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-full h-2 bg-canvas rounded-full overflow-hidden">
                    <div className="h-full bg-positive rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="1" step="100" placeholder="Add amount..."
                      value={contribAmounts[g.id] || ''}
                      onChange={(e) => setContribAmounts((c) => ({ ...c, [g.id]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 text-xs font-mono bg-canvas border border-hairline rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onContributeGoal(g.id, contribAmounts[g.id]);
                        setContribAmounts((c) => ({ ...c, [g.id]: '' }));
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-ink text-white"
                    >
                      + Contribute
                    </button>
                  </div>
                </div>
              );
            })}
            {savingsGoals.length === 0 && (
              <p className="text-xs text-muted col-span-full py-6 text-center">No savings goals yet.</p>
            )}
          </div>
        </div>
      )}

      {subTab === 'automation' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Templates */}
          <div className="bg-surface rounded-xl p-5 border border-hairline space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">Quick-Log Presets</h3>
              <p className="text-xs text-muted">One-tap buttons on your Dashboard for frequent daily spends.</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!tplForm.name.trim() || !tplForm.amount) return;
                const chosenTaskId = tplForm.taskId || tasks[0]?.id || '';
                const chosenTask = tasks.find((t) => t.id === chosenTaskId);
                onAddQuickTemplate({
                  name: tplForm.name.trim(),
                  amount: parseFloat(tplForm.amount),
                  accountId: tplForm.accountId || accounts[0]?.id || '',
                  taskId: chosenTaskId,
                  type: chosenTask?.kind === 'income' ? 'income' : 'expense'
                });
                setTplForm((f) => ({ ...f, name: '', amount: '' }));
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              <input
                type="text" required placeholder="Preset name (e.g., Morning Chai)"
                value={tplForm.name} onChange={(e) => setTplForm((f) => ({ ...f, name: e.target.value }))}
                className="px-3 py-2 text-xs bg-canvas border border-hairline rounded-lg"
              />
              <input
                type="number" min="0.01" step="0.01" required placeholder="Amount"
                value={tplForm.amount} onChange={(e) => setTplForm((f) => ({ ...f, amount: e.target.value }))}
                className="px-3 py-2 text-xs font-mono bg-canvas border border-hairline rounded-lg"
              />
              <select
                aria-label="Preset Account"
                value={tplForm.accountId || accounts[0]?.id || ''}
                onChange={(e) => setTplForm((f) => ({ ...f, accountId: e.target.value }))}
                className="px-3 py-2 text-xs border border-hairline rounded-lg bg-surface"
              >
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <select
                aria-label="Preset Task"
                value={tplForm.taskId || tasks[0]?.id || ''}
                onChange={(e) => setTplForm((f) => ({ ...f, taskId: e.target.value }))}
                className="px-3 py-2 text-xs border border-hairline rounded-lg bg-surface"
              >
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.kind})</option>)}
              </select>
              <button type="submit" className="sm:col-span-2 px-3 py-2 text-xs font-semibold rounded-lg bg-ink text-white hover:bg-neutral-800">
                + Save Preset
              </button>
            </form>
            <div className="space-y-2">
              {quickTemplates.map((tpl) => {
                const acctName = accounts.find((a) => a.id === tpl.accountId)?.name || 'Default';
                const taskName = tasks.find((t) => t.id === tpl.taskId)?.name || 'Task';
                return (
                  <div key={tpl.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-canvas border border-hairline text-xs">
                    <div>
                      <span className="font-semibold text-ink">{tpl.name}</span>
                      <span className="block text-[11px] text-muted">{taskName} · {acctName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-ink font-semibold">{formatMoney(tpl.amount, currency, hideAll)}</span>
                      <button type="button" onClick={() => onDeleteQuickTemplate(tpl.id)} className="text-negative">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {quickTemplates.length === 0 && <p className="text-xs text-muted">No presets yet.</p>}
            </div>
          </div>

          {/* Auto-Categorization Rules */}
          <div className="bg-surface rounded-xl p-5 border border-hairline space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">CSV Auto-Categorization Rules</h3>
              <p className="text-xs text-muted">Automatically assign a Task when imported descriptions contain a keyword.</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ruleForm.keyword.trim()) return;
                onAddCategoryRule(ruleForm.keyword, ruleForm.taskId || expenseTasks[0]?.id);
                setRuleForm((f) => ({ ...f, keyword: '' }));
              }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2"
            >
              <input
                type="text" required placeholder="Keyword (e.g. swiggy)"
                value={ruleForm.keyword} onChange={(e) => setRuleForm((f) => ({ ...f, keyword: e.target.value }))}
                className="px-3 py-2 text-xs bg-canvas border border-hairline rounded-lg"
              />
              <select
                value={ruleForm.taskId || expenseTasks[0]?.id || ''}
                onChange={(e) => setRuleForm((f) => ({ ...f, taskId: e.target.value }))}
                className="px-3 py-2 text-xs border border-hairline rounded-lg bg-surface"
              >
                {expenseTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button type="submit" className="px-3 py-2 text-xs font-semibold rounded-lg bg-ink text-white">
                + Add Rule
              </button>
            </form>
            <div className="space-y-2">
              {categoryRules.map((r) => {
                const tName = tasks.find((t) => t.id === r.taskId)?.name || 'Select task';
                return (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-canvas border border-hairline text-xs">
                    <span>If note has <strong className="font-mono text-ink">"{r.keyword}"</strong> → <strong>{tName}</strong></span>
                    <button type="button" onClick={() => onDeleteCategoryRule(r.id)} className="text-negative">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

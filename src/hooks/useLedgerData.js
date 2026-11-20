import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MONTHS, SHORT_WEEKDAYS, WEEKDAYS, buildStarterSeed } from '../lib/constants';
import { formatDisplayDate, formatMoney, getWeekdayIndex } from '../lib/formatters';
import { logger } from '../lib/logger';

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function loadUserLocal(userId, key, fallback) {
  if (!userId) return fallback;
  try {
    const raw = localStorage.getItem(`lf_${userId}_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveUserLocal(userId, key, value) {
  if (!userId) return;
  try {
    localStorage.setItem(`lf_${userId}_${key}`, JSON.stringify(value));
  } catch { /* ignore */ }
}

export function useLedgerData(session, notify) {
  const userId = session?.user?.id || null;

  const [currency, setCurrency] = useState('INR');
  const [accounts, setAccounts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Extended planning & productivity state (persisted per-user locally)
  const [quickTemplates, setQuickTemplates] = useState([]);
  const [recurringBills, setRecurringBills] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [categoryRules, setCategoryRules] = useState([]);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showAllTime, setShowAllTime] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setQuickTemplates(loadUserLocal(userId, 'templates', []));
    setRecurringBills(loadUserLocal(userId, 'recurring', []));
    setSavingsGoals(loadUserLocal(userId, 'goals', []));
    setCategoryRules(loadUserLocal(userId, 'rules', [
      { id: 'rule_1', keyword: 'swiggy', taskId: '' },
      { id: 'rule_2', keyword: 'zomato', taskId: '' },
      { id: 'rule_3', keyword: 'uber', taskId: '' }
    ]));
  }, [userId]);

  const fetchAll = useCallback(async () => {
    if (!supabase || !userId) {
      setLoading(false);
      return;
    }
    const t0 = performance.now();
    logger.action('FETCH_ALL', { userId });
    setLoading(true);
    try {
      const [settingsRes, acctsRes, tasksRes, txRes] = await Promise.all([
        supabase.from('user_settings').select('currency').eq('user_id', userId).maybeSingle(),
        supabase.from('accounts').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false })
      ]);

      if (settingsRes.error) throw settingsRes.error;
      if (acctsRes.error) throw acctsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (txRes.error) throw txRes.error;

      if (settingsRes.data?.currency) {
        setCurrency(settingsRes.data.currency);
      }

      const loadedAccounts = (acctsRes.data || []).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        openingBalance: Number(a.opening_balance) || 0,
        color: a.color || '#111110'
      }));

      const loadedTasks = (tasksRes.data || []).map((t) => ({
        id: t.id,
        name: t.name,
        kind: t.kind,
        budget: Number(t.budget) || 0,
        color: t.color || '#0D6E4E'
      }));

      const loadedTxs = (txRes.data || []).map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: Number(tx.amount) || 0,
        accountId: tx.account_id,
        toAccountId: tx.to_account_id || '',
        taskId: tx.task_id || '',
        date: tx.date,
        time: tx.time,
        note: tx.note || ''
      }));

      if (loadedAccounts.length === 0 && loadedTasks.length === 0) {
        logger.action('SEED_STARTER_DATA', { userId });
        const seed = buildStarterSeed(userId);
        const [seedAcctRes, seedTaskRes] = await Promise.all([
          supabase.from('accounts').insert(seed.accounts),
          supabase.from('tasks').insert(seed.tasks),
          supabase.from('user_settings').upsert({ user_id: userId, currency: 'INR' })
        ]);
        if (!seedAcctRes.error && !seedTaskRes.error) {
          setAccounts(seed.accounts.map((a) => ({
            id: a.id, name: a.name, type: a.type, openingBalance: a.opening_balance, color: a.color
          })));
          setTasks(seed.tasks.map((t) => ({
            id: t.id, name: t.name, kind: t.kind, budget: t.budget, color: t.color
          })));
          setTransactions([]);
          logger.success('SEED_STARTER_DATA', { accounts: seed.accounts.length, tasks: seed.tasks.length });
          setLoading(false);
          return;
        }
      }

      setAccounts(loadedAccounts);
      setTasks(loadedTasks);
      setTransactions(loadedTxs);
      logger.success('FETCH_ALL', {
        ms: Math.round(performance.now() - t0),
        accounts: loadedAccounts.length,
        tasks: loadedTasks.length,
        transactions: loadedTxs.length
      });
    } catch (err) {
      logger.error('FETCH_ALL', err);
      notify(err.message || 'Failed to sync with Supabase', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, notify]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateCurrency = async (nextCurrency) => {
    logger.action('UPDATE_CURRENCY', { nextCurrency });
    setCurrency(nextCurrency);
    if (!supabase || !userId) return;
    setSyncing(true);
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, currency: nextCurrency, updated_at: new Date().toISOString() });
    setSyncing(false);
    if (error) {
      logger.error('UPDATE_CURRENCY', error);
      notify(error.message, 'error');
    } else {
      logger.success('UPDATE_CURRENCY', { currency: nextCurrency });
    }
  };

  // Supports single entry OR split expenses (when data.splits is provided)
  const saveTransaction = async (mode, data) => {
    if (mode === 'add' && data.type === 'expense' && Array.isArray(data.splits) && data.splits.length > 1) {
      const validSplits = data.splits
        .map((s) => ({ taskId: s.taskId, amount: parseFloat(s.amount), note: (s.note || data.note || '').trim() }))
        .filter((s) => Number.isFinite(s.amount) && s.amount > 0 && s.taskId);

      if (validSplits.length === 0) {
        notify('Enter valid split amounts', 'error');
        return false;
      }

      const rows = validSplits.map((sp) => ({
        id: generateId(),
        user_id: userId,
        type: 'expense',
        amount: sp.amount,
        account_id: data.accountId,
        to_account_id: '',
        task_id: sp.taskId,
        date: data.date,
        time: data.time,
        note: sp.note ? `${sp.note} (Split)` : 'Split expense'
      }));

      logger.action('CREATE_SPLIT_TRANSACTION', { count: rows.length });
      setSyncing(true);
      const { error } = await supabase.from('transactions').insert(rows);
      setSyncing(false);

      if (error) {
        logger.error('CREATE_SPLIT_TRANSACTION', error);
        notify(error.message, 'error');
        return false;
      }

      const clientObjs = rows.map((row) => ({
        id: row.id,
        type: row.type,
        amount: row.amount,
        accountId: row.account_id,
        toAccountId: '',
        taskId: row.task_id,
        date: row.date,
        time: row.time,
        note: row.note
      }));

      setTransactions((prev) => [...clientObjs, ...prev]);
      logger.success('CREATE_SPLIT_TRANSACTION', { count: rows.length });
      notify(`Saved ${rows.length} split entries`);
      return true;
    }

    const amt = parseFloat(data.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      notify('Enter a valid amount', 'error');
      return false;
    }
    if (data.type === 'transfer' && data.accountId === data.toAccountId) {
      notify('Choose two different accounts for transfer', 'error');
      return false;
    }

    const id = mode === 'edit' ? data.id : generateId();
    const row = {
      id,
      user_id: userId,
      type: data.type,
      amount: amt,
      account_id: data.accountId,
      to_account_id: data.type === 'transfer' ? data.toAccountId : '',
      task_id: data.type === 'transfer' ? '' : data.taskId,
      date: data.date,
      time: data.time,
      note: (data.note || '').trim()
    };

    logger.action(mode === 'edit' ? 'UPDATE_TRANSACTION' : 'CREATE_TRANSACTION', row);
    setSyncing(true);
    const { error } = mode === 'edit'
      ? await supabase.from('transactions').update(row).eq('id', id).eq('user_id', userId)
      : await supabase.from('transactions').insert(row);
    setSyncing(false);

    if (error) {
      logger.error('SAVE_TRANSACTION', error);
      notify(error.message, 'error');
      return false;
    }

    const clientObj = {
      id,
      type: row.type,
      amount: row.amount,
      accountId: row.account_id,
      toAccountId: row.to_account_id,
      taskId: row.task_id,
      date: row.date,
      time: row.time,
      note: row.note
    };

    setTransactions((prev) => (mode === 'edit' ? prev.map((t) => (t.id === id ? clientObj : t)) : [clientObj, ...prev]));
    if (!showAllTime && row.date) {
      const [y, m] = row.date.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
    logger.success('SAVE_TRANSACTION', { id, mode });
    notify(mode === 'edit' ? 'Transaction updated' : 'Transaction saved');
    return true;
  };

  const bulkImportTransactions = async (entries) => {
    if (!entries?.length) return false;
    const rows = entries.map((e) => ({
      id: generateId(),
      user_id: userId,
      type: e.type,
      amount: Number(e.amount),
      account_id: e.accountId,
      to_account_id: '',
      task_id: e.taskId || '',
      date: e.date,
      time: e.time || '12:00',
      note: (e.note || '').trim()
    }));

    logger.action('BULK_IMPORT_CSV', { count: rows.length });
    setSyncing(true);
    const { error } = await supabase.from('transactions').insert(rows);
    setSyncing(false);

    if (error) {
      logger.error('BULK_IMPORT_CSV', error);
      notify(error.message, 'error');
      return false;
    }

    const clientObjs = rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      accountId: r.account_id,
      toAccountId: '',
      taskId: r.task_id,
      date: r.date,
      time: r.time,
      note: r.note
    }));
    setTransactions((prev) => [...clientObjs, ...prev]);
    logger.success('BULK_IMPORT_CSV', { count: rows.length });
    notify(`Imported ${rows.length} transactions`);
    return true;
  };

  const deleteTransaction = async (id) => {
    logger.action('DELETE_TRANSACTION', { id });
    setSyncing(true);
    const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
    setSyncing(false);
    if (error) {
      logger.error('DELETE_TRANSACTION', error);
      notify(error.message, 'error');
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    logger.success('DELETE_TRANSACTION', { id });
    notify('Transaction deleted', 'info');
  };

  const saveAccount = async (mode, data) => {
    const name = (data.name || '').trim();
    if (!name) return false;
    const id = mode === 'edit' ? data.id : generateId();
    const opening = parseFloat(data.openingBalance) || 0;
    const row = {
      id,
      user_id: userId,
      name,
      type: data.type,
      opening_balance: opening,
      color: data.color || '#111110'
    };

    logger.action(mode === 'edit' ? 'UPDATE_ACCOUNT' : 'CREATE_ACCOUNT', row);
    setSyncing(true);
    const { error } = mode === 'edit'
      ? await supabase.from('accounts').update(row).eq('id', id).eq('user_id', userId)
      : await supabase.from('accounts').insert(row);
    setSyncing(false);

    if (error) {
      logger.error('SAVE_ACCOUNT', error);
      notify(error.message, 'error');
      return false;
    }

    const clientObj = { id, name, type: row.type, openingBalance: opening, color: row.color };
    setAccounts((prev) => (mode === 'edit' ? prev.map((a) => (a.id === id ? clientObj : a)) : [...prev, clientObj]));
    logger.success('SAVE_ACCOUNT', { id, mode });
    notify(mode === 'edit' ? 'Account updated' : 'Account added');
    return true;
  };

  const deleteAccount = async (id) => {
    logger.action('DELETE_ACCOUNT', { id });
    setSyncing(true);
    const { error } = await supabase.from('accounts').delete().eq('id', id).eq('user_id', userId);
    setSyncing(false);
    if (error) {
      logger.error('DELETE_ACCOUNT', error);
      notify(error.message, 'error');
      return;
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    logger.success('DELETE_ACCOUNT', { id });
    notify('Account deleted', 'info');
  };

  const saveTask = async (mode, data) => {
    const name = (data.name || '').trim();
    if (!name) return false;
    const id = mode === 'edit' ? data.id : generateId();
    const budget = Math.max(0, parseFloat(data.budget) || 0);
    const row = {
      id,
      user_id: userId,
      name,
      kind: data.kind,
      budget,
      color: data.color || '#0D6E4E'
    };

    logger.action(mode === 'edit' ? 'UPDATE_TASK' : 'CREATE_TASK', row);
    setSyncing(true);
    const { error } = mode === 'edit'
      ? await supabase.from('tasks').update(row).eq('id', id).eq('user_id', userId)
      : await supabase.from('tasks').insert(row);
    setSyncing(false);

    if (error) {
      logger.error('SAVE_TASK', error);
      notify(error.message, 'error');
      return false;
    }

    const clientObj = { id, name, kind: row.kind, budget, color: row.color };
    setTasks((prev) => (mode === 'edit' ? prev.map((t) => (t.id === id ? clientObj : t)) : [...prev, clientObj]));
    logger.success('SAVE_TASK', { id, mode });
    notify(mode === 'edit' ? 'Task updated' : 'Task added');
    return true;
  };

  const deleteTask = async (id) => {
    logger.action('DELETE_TASK', { id });
    setSyncing(true);
    const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
    setSyncing(false);
    if (error) {
      logger.error('DELETE_TASK', error);
      notify(error.message, 'error');
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    logger.success('DELETE_TASK', { id });
    notify('Task deleted', 'info');
  };

  const clearTransactions = async () => {
    logger.action('CLEAR_TRANSACTIONS', { userId });
    setSyncing(true);
    const { error } = await supabase.from('transactions').delete().eq('user_id', userId);
    setSyncing(false);
    if (error) {
      logger.error('CLEAR_TRANSACTIONS', error);
      notify(error.message, 'error');
      return;
    }
    setTransactions([]);
    logger.success('CLEAR_TRANSACTIONS');
    notify('All transactions cleared', 'info');
  };

  const importBackup = async (parsed) => {
    if (!parsed?.accounts || !parsed?.tasks || !parsed?.transactions) {
      notify('Invalid backup JSON format', 'error');
      return;
    }
    logger.action('IMPORT_BACKUP', {
      accounts: parsed.accounts.length,
      tasks: parsed.tasks.length,
      transactions: parsed.transactions.length
    });
    setSyncing(true);
    try {
      const acctRows = parsed.accounts.map((a) => ({
        id: a.id || generateId(),
        user_id: userId,
        name: a.name,
        type: a.type,
        opening_balance: Number(a.openingBalance ?? a.opening_balance) || 0,
        color: a.color || '#111110'
      }));
      const taskRows = parsed.tasks.map((t) => ({
        id: t.id || generateId(),
        user_id: userId,
        name: t.name,
        kind: t.kind,
        budget: Number(t.budget) || 0,
        color: t.color || '#0D6E4E'
      }));
      const txRows = parsed.transactions.map((tx) => ({
        id: tx.id || generateId(),
        user_id: userId,
        type: tx.type,
        amount: Number(tx.amount) || 0,
        account_id: tx.accountId || tx.account_id,
        to_account_id: tx.toAccountId || tx.to_account_id || '',
        task_id: tx.taskId || tx.task_id || '',
        date: tx.date,
        time: tx.time || '12:00',
        note: tx.note || ''
      }));

      if (acctRows.length) await supabase.from('accounts').upsert(acctRows);
      if (taskRows.length) await supabase.from('tasks').upsert(taskRows);
      if (txRows.length) await supabase.from('transactions').upsert(txRows);
      if (parsed.currency) await updateCurrency(parsed.currency);

      await fetchAll();
      logger.success('IMPORT_BACKUP');
      notify('Backup imported to Supabase');
    } catch (err) {
      logger.error('IMPORT_BACKUP', err);
      notify(err.message || 'Import failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Quick Templates CRUD
  const addQuickTemplate = (tpl) => {
    const next = [...quickTemplates, { ...tpl, id: generateId() }];
    setQuickTemplates(next);
    saveUserLocal(userId, 'templates', next);
    logger.success('ADD_QUICK_TEMPLATE', tpl);
    notify('Quick template saved');
  };

  const deleteQuickTemplate = (id) => {
    const next = quickTemplates.filter((t) => t.id !== id);
    setQuickTemplates(next);
    saveUserLocal(userId, 'templates', next);
    notify('Template removed', 'info');
  };

  // Recurring Bills CRUD
  const addRecurringBill = (bill) => {
    const next = [...recurringBills, { ...bill, id: generateId(), lastLoggedMonth: '' }];
    setRecurringBills(next);
    saveUserLocal(userId, 'recurring', next);
    logger.success('ADD_RECURRING_BILL', bill);
    notify('Recurring bill added');
  };

  const deleteRecurringBill = (id) => {
    const next = recurringBills.filter((b) => b.id !== id);
    setRecurringBills(next);
    saveUserLocal(userId, 'recurring', next);
    notify('Recurring bill removed', 'info');
  };

  const logRecurringBill = async (bill) => {
    const curNow = new Date();
    const date = `${curNow.getFullYear()}-${String(curNow.getMonth() + 1).padStart(2, '0')}-${String(curNow.getDate()).padStart(2, '0')}`;
    const time = `${String(curNow.getHours()).padStart(2, '0')}:${String(curNow.getMinutes()).padStart(2, '0')}`;
    const ok = await saveTransaction('add', {
      type: 'expense',
      amount: bill.amount,
      accountId: bill.accountId,
      taskId: bill.taskId,
      date,
      time,
      note: `${bill.name} (Recurring)`
    });
    if (ok) {
      const monthKey = `${curNow.getFullYear()}-${String(curNow.getMonth() + 1).padStart(2, '0')}`;
      const next = recurringBills.map((b) => (b.id === bill.id ? { ...b, lastLoggedMonth: monthKey } : b));
      setRecurringBills(next);
      saveUserLocal(userId, 'recurring', next);
    }
    return ok;
  };

  // Savings Goals CRUD
  const addSavingsGoal = (goal) => {
    const next = [...savingsGoals, { ...goal, id: generateId(), savedAmount: Number(goal.savedAmount) || 0 }];
    setSavingsGoals(next);
    saveUserLocal(userId, 'goals', next);
    logger.success('ADD_SAVINGS_GOAL', goal);
    notify('Savings goal created');
  };

  const contributeToGoal = (id, delta) => {
    const amt = parseFloat(delta);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const next = savingsGoals.map((g) => (g.id === id ? { ...g, savedAmount: (Number(g.savedAmount) || 0) + amt } : g));
    setSavingsGoals(next);
    saveUserLocal(userId, 'goals', next);
    notify('Contribution added to goal');
  };

  const deleteSavingsGoal = (id) => {
    const next = savingsGoals.filter((g) => g.id !== id);
    setSavingsGoals(next);
    saveUserLocal(userId, 'goals', next);
    notify('Goal deleted', 'info');
  };

  // Auto-Categorization Rules CRUD
  const addCategoryRule = (keyword, taskId) => {
    const kw = (keyword || '').trim().toLowerCase();
    if (!kw || !taskId) return;
    const next = [...categoryRules, { id: generateId(), keyword: kw, taskId }];
    setCategoryRules(next);
    saveUserLocal(userId, 'rules', next);
    notify('Auto-categorization rule saved');
  };

  const deleteCategoryRule = (id) => {
    const next = categoryRules.filter((r) => r.id !== id);
    setCategoryRules(next);
    saveUserLocal(userId, 'rules', next);
    notify('Rule deleted', 'info');
  };

  // Derived Calculations
  const accountStatsMap = useMemo(() => {
    const map = {};
    for (const a of accounts) {
      map[a.id] = { balance: Number(a.openingBalance) || 0, totalIn: 0, totalOut: 0 };
    }
    for (const tx of transactions) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income' && map[tx.accountId]) {
        map[tx.accountId].balance += amt;
        map[tx.accountId].totalIn += amt;
      } else if (tx.type === 'expense' && map[tx.accountId]) {
        map[tx.accountId].balance -= amt;
        map[tx.accountId].totalOut += amt;
      } else if (tx.type === 'transfer') {
        if (map[tx.accountId]) {
          map[tx.accountId].balance -= amt;
          map[tx.accountId].totalOut += amt;
        }
        if (map[tx.toAccountId]) {
          map[tx.toAccountId].balance += amt;
          map[tx.toAccountId].totalIn += amt;
        }
      }
    }
    return map;
  }, [accounts, transactions]);

  const periodTxs = useMemo(() => {
    if (showAllTime) return transactions;
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    return transactions.filter((tx) => tx.date?.startsWith(prefix));
  }, [transactions, viewYear, viewMonth, showAllTime]);

  const metrics = useMemo(() => {
    let totalBalance = 0;
    for (const a of accounts) totalBalance += accountStatsMap[a.id]?.balance || 0;

    let periodIn = 0;
    let periodOut = 0;
    let inCount = 0;
    let outCount = 0;
    const taskTotals = {};
    const weekdayTotals = [0, 0, 0, 0, 0, 0, 0];

    for (const tx of periodTxs) {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        periodIn += amt;
        inCount += 1;
      } else if (tx.type === 'expense') {
        periodOut += amt;
        outCount += 1;
        const tid = tx.taskId || 'uncategorized';
        taskTotals[tid] = (taskTotals[tid] || 0) + amt;
        if (tx.date) weekdayTotals[getWeekdayIndex(tx.date)] += amt;
      }
    }

    // Previous month MoM comparison
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevPrefix = `${prevY}-${String(prevM + 1).padStart(2, '0')}`;
    let prevIn = 0;
    let prevOut = 0;
    if (!showAllTime) {
      for (const tx of transactions) {
        if (!tx.date?.startsWith(prevPrefix)) continue;
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') prevIn += amt;
        else if (tx.type === 'expense') prevOut += amt;
      }
    }
    const outMomPct = prevOut > 0 ? Math.round(((periodOut - prevOut) / prevOut) * 100) : null;
    const inMomPct = prevIn > 0 ? Math.round(((periodIn - prevIn) / prevIn) * 100) : null;

    // Safe to Spend daily pace
    let totalBudget = 0;
    let budgetedSpent = 0;
    for (const t of tasks) {
      if (t.kind === 'expense' && t.budget > 0) {
        totalBudget += Number(t.budget) || 0;
        budgetedSpent += taskTotals[t.id] || 0;
      }
    }
    const remainingBudget = totalBudget - budgetedSpent;
    const today = new Date();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const isCurrentMonth = today.getFullYear() === viewYear && today.getMonth() === viewMonth;
    const remainingDaysInMonth = isCurrentMonth ? Math.max(1, daysInMonth - today.getDate() + 1) : daysInMonth;
    const safeToSpendPerDay = totalBudget > 0 ? remainingBudget / remainingDaysInMonth : 0;

    // 6-Month Net Worth trend
    const openingTotal = accounts.reduce((s, a) => s + (Number(a.openingBalance) || 0), 0);
    const netWorthSeries = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(viewYear, viewMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const endOfM = `${y}-${String(m + 1).padStart(2, '0')}-${String(new Date(y, m + 1, 0).getDate()).padStart(2, '0')}`;
      let running = openingTotal;
      for (const tx of transactions) {
        if (!tx.date || tx.date > endOfM) continue;
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'income') running += amt;
        else if (tx.type === 'expense') running -= amt;
      }
      netWorthSeries.push({ month: `${MONTHS[m].slice(0, 3)} ${String(y).slice(2)}`, netWorth: running });
    }

    const sortedTasks = Object.entries(taskTotals)
      .map(([tid, amount]) => {
        const t = tasks.find((x) => x.id === tid) || { id: tid, name: 'Other', color: '#6B6B66' };
        return { ...t, amount, pct: periodOut > 0 ? Math.round((amount / periodOut) * 100) : 0 };
      })
      .sort((a, b) => b.amount - a.amount);

    const daysInPeriod = showAllTime
      ? Math.max(1, new Set(periodTxs.map((t) => t.date)).size)
      : daysInMonth;

    const dateMap = {};
    if (!showAllTime) {
      for (let d = 1; d <= daysInPeriod; d += 1) {
        const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        dateMap[key] = { label: String(d), in: 0, out: 0 };
      }
    }
    for (const tx of periodTxs) {
      if (!dateMap[tx.date]) dateMap[tx.date] = { label: formatDisplayDate(tx.date), in: 0, out: 0 };
      if (tx.type === 'income') dateMap[tx.date].in += Number(tx.amount) || 0;
      if (tx.type === 'expense') dateMap[tx.date].out += Number(tx.amount) || 0;
    }

    const dailySeries = Object.keys(dateMap).sort().map((k) => dateMap[k]);
    const weekdaySeries = SHORT_WEEKDAYS.map((day, idx) => ({ day, amount: weekdayTotals[idx] }));
    const maxWeekday = Math.max(...weekdayTotals);
    const peakDay = maxWeekday > 0
      ? `${WEEKDAYS[weekdayTotals.indexOf(maxWeekday)]} (${formatMoney(maxWeekday, currency)})`
      : '—';

    return {
      totalBalance,
      periodIn,
      periodOut,
      netFlow: periodIn - periodOut,
      inCount,
      outCount,
      avgDaily: periodOut / daysInPeriod,
      savingsRate: periodIn > 0 ? Math.round(((periodIn - periodOut) / periodIn) * 100) : 0,
      prevMonthShort: MONTHS[prevM].slice(0, 3),
      outMomPct,
      inMomPct,
      totalBudget,
      budgetedSpent,
      remainingBudget,
      remainingDaysInMonth,
      safeToSpendPerDay,
      netWorthSeries,
      sortedTasks,
      dailySeries,
      weekdaySeries,
      peakDay
    };
  }, [accounts, tasks, transactions, accountStatsMap, periodTxs, showAllTime, viewYear, viewMonth, currency]);

  const periodLabel = showAllTime ? 'All Time' : `${MONTHS[viewMonth]} ${viewYear}`;

  const goPrevMonth = () => {
    setShowAllTime(false);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    setShowAllTime(false);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return {
    currency,
    accounts,
    tasks,
    transactions,
    loading,
    syncing,
    periodLabel,
    showAllTime,
    setShowAllTime,
    goPrevMonth,
    goNextMonth,
    accountStatsMap,
    periodTxs,
    metrics,
    quickTemplates,
    recurringBills,
    savingsGoals,
    categoryRules,
    updateCurrency,
    saveTransaction,
    bulkImportTransactions,
    deleteTransaction,
    saveAccount,
    deleteAccount,
    saveTask,
    deleteTask,
    clearTransactions,
    importBackup,
    addQuickTemplate,
    deleteQuickTemplate,
    addRecurringBill,
    deleteRecurringBill,
    logRecurringBill,
    addSavingsGoal,
    contributeToGoal,
    deleteSavingsGoal,
    addCategoryRule,
    deleteCategoryRule,
    refreshData: fetchAll
  };
}

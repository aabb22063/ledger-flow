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

export function useLedgerData(session, notify) {
  const userId = session?.user?.id || null;

  const [currency, setCurrency] = useState('INR');
  const [accounts, setAccounts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [showAllTime, setShowAllTime] = useState(false);

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

  const saveTransaction = async (mode, data) => {
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

    const sortedTasks = Object.entries(taskTotals)
      .map(([tid, amount]) => {
        const t = tasks.find((x) => x.id === tid) || { id: tid, name: 'Other', color: '#6B6B66' };
        return { ...t, amount, pct: periodOut > 0 ? Math.round((amount / periodOut) * 100) : 0 };
      })
      .sort((a, b) => b.amount - a.amount);

    const daysInPeriod = showAllTime
      ? Math.max(1, new Set(periodTxs.map((t) => t.date)).size)
      : new Date(viewYear, viewMonth + 1, 0).getDate();

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
      sortedTasks,
      dailySeries,
      weekdaySeries,
      peakDay
    };
  }, [accounts, tasks, accountStatsMap, periodTxs, showAllTime, viewYear, viewMonth, currency]);

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
    updateCurrency,
    saveTransaction,
    deleteTransaction,
    saveAccount,
    deleteAccount,
    saveTask,
    deleteTask,
    clearTransactions,
    importBackup,
    refreshData: fetchAll
  };
}

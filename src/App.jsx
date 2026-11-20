import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { downloadFile, getWeekdayName } from './lib/formatters';
import { logger } from './lib/logger';
import { useLedgerData } from './hooks/useLedgerData';
import AuthScreen from './components/AuthScreen';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';
import DashboardView from './components/DashboardView';
import TransactionsView from './components/TransactionsView';
import AccountsView from './components/AccountsView';
import BudgetsView from './components/BudgetsView';
import TransactionModal from './components/modals/TransactionModal';
import AccountModal from './components/modals/AccountModal';
import TaskModal from './components/modals/TaskModal';
import ConfirmModal from './components/modals/ConfirmModal';
import CsvImportModal from './components/modals/CsvImportModal';

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [privacyLevel, setPrivacyLevel] = useState('off');
  const [toast, setToast] = useState(null);

  const [txModal, setTxModal] = useState(null);
  const [acctModal, setAcctModal] = useState(null);
  const [taskModal, setTaskModal] = useState(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);

  const notify = useCallback((msg, tone = 'success') => {
    setToast({ msg, tone, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  const ledger = useLedgerData(session, notify);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center text-xs font-medium text-muted">
        Loading LedgerFlow...
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  const openNewTx = (defaultType = 'expense', overrides = {}) => {
    if (ledger.accounts.length === 0) {
      notify('Add an account first', 'error');
      setAcctModal({ mode: 'add', data: { name: '', type: 'Bank Account', openingBalance: 0, color: '#111110' } });
      return;
    }
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const firstTask = ledger.tasks.find((t) => t.kind === (defaultType === 'income' ? 'income' : 'expense'))?.id || '';
    setTxModal({
      mode: 'add',
      data: {
        type: defaultType,
        amount: '',
        accountId: ledger.accounts[0]?.id || '',
        toAccountId: ledger.accounts[1]?.id || ledger.accounts[0]?.id || '',
        taskId: firstTask,
        date,
        time,
        note: '',
        ...overrides
      }
    });
  };

  const handlePayCreditCard = (cardAccount, owedAmount) => {
    const bankSource = ledger.accounts.find((a) => a.id !== cardAccount.id) || ledger.accounts[0];
    openNewTx('transfer', {
      amount: owedAmount.toFixed(2),
      accountId: bankSource?.id || '',
      toAccountId: cardAccount.id,
      note: `Credit card bill payment: ${cardAccount.name}`
    });
  };

  const handleExportCsv = () => {
    logger.action('EXPORT_CSV', { count: ledger.transactions.length });
    const rows = [['Day', 'Date', 'Time', 'Type', 'Task', 'Account', 'To Account', 'Amount', 'Note']];
    for (const tx of ledger.transactions) {
      const tName = ledger.tasks.find((t) => t.id === tx.taskId)?.name || (tx.type === 'transfer' ? 'Transfer' : '');
      const aName = ledger.accounts.find((a) => a.id === tx.accountId)?.name || '';
      const toName = ledger.accounts.find((a) => a.id === tx.toAccountId)?.name || '';
      rows.push([
        getWeekdayName(tx.date), tx.date, tx.time, tx.type, tName, aName, toName, tx.amount,
        `"${(tx.note || '').replace(/"/g, '""')}"`
      ]);
    }
    downloadFile(rows.map((r) => r.join(',')).join('\n'), `ledgerflow_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    notify('CSV exported');
  };

  const handleExportJson = () => {
    logger.action('EXPORT_JSON');
    const payload = {
      currency: ledger.currency,
      accounts: ledger.accounts,
      tasks: ledger.tasks,
      transactions: ledger.transactions
    };
    downloadFile(JSON.stringify(payload, null, 2), `ledgerflow_backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    notify('JSON backup downloaded');
  };

  const handleImportJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        ledger.importBackup(parsed);
      } catch {
        notify('Could not parse JSON file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        periodLabel={ledger.periodLabel}
        onPrevMonth={ledger.goPrevMonth}
        onNextMonth={ledger.goNextMonth}
        onToggleAllTime={() => ledger.setShowAllTime((s) => !s)}
        currency={ledger.currency}
        onCurrencyChange={ledger.updateCurrency}
        privacyLevel={privacyLevel}
        onTogglePrivacyClick={() => setPrivacyLevel((p) => (p === 'off' ? 'balances' : 'off'))}
        onPrivacyLongPress={() => setPrivacyLevel('all')}
        onOpenAddTx={() => openNewTx('expense')}
        onOpenCsvImport={() => setCsvModalOpen(true)}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClearTransactions={() => setConfirmState({
          title: 'Clear All Transactions',
          message: 'Delete all transactions from your Supabase database? Accounts and tasks will remain.',
          onOk: ledger.clearTransactions
        })}
        onSignOut={() => {
          logger.action('AUTH_SIGNOUT');
          supabase.auth.signOut();
        }}
        onRefresh={ledger.refreshData}
        syncing={ledger.syncing}
        userEmail={session.user?.email}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
        {ledger.loading ? (
          <div className="py-16 text-center text-xs text-muted">Syncing your ledger from Supabase...</div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                currency={ledger.currency}
                privacyLevel={privacyLevel}
                accounts={ledger.accounts}
                tasks={ledger.tasks}
                accountStatsMap={ledger.accountStatsMap}
                periodTxs={ledger.periodTxs}
                metrics={ledger.metrics}
                showAllTime={ledger.showAllTime}
                quickTemplates={ledger.quickTemplates}
                recurringBills={ledger.recurringBills}
                onQuickSaveTx={ledger.saveTransaction}
                onLogRecurringBill={ledger.logRecurringBill}
                onOpenNewAccount={() => setAcctModal({ mode: 'add', data: { name: '', type: 'Bank Account', openingBalance: 0, color: '#111110' } })}
                onOpenTransfer={() => openNewTx('transfer')}
                onViewAllTransactions={() => setActiveTab('transactions')}
                onGoToBudgets={() => setActiveTab('budgets')}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsView
                currency={ledger.currency}
                privacyLevel={privacyLevel}
                accounts={ledger.accounts}
                tasks={ledger.tasks}
                periodTxs={ledger.periodTxs}
                onEditTx={(tx) => setTxModal({ mode: 'edit', data: { ...tx } })}
                onDeleteTx={(tx) => setConfirmState({
                  title: 'Delete Transaction',
                  message: 'Remove this transaction and recalculate account balances?',
                  onOk: () => ledger.deleteTransaction(tx.id)
                })}
                onOpenCsvImport={() => setCsvModalOpen(true)}
              />
            )}

            {activeTab === 'accounts' && (
              <AccountsView
                currency={ledger.currency}
                privacyLevel={privacyLevel}
                accounts={ledger.accounts}
                accountStatsMap={ledger.accountStatsMap}
                onOpenTransfer={() => openNewTx('transfer')}
                onPayCreditCard={handlePayCreditCard}
                onOpenAddAccount={() => setAcctModal({ mode: 'add', data: { name: '', type: 'Bank Account', openingBalance: 0, color: '#111110' } })}
                onEditAccount={(a) => setAcctModal({ mode: 'edit', data: { ...a } })}
                onDeleteAccount={(a) => setConfirmState({
                  title: 'Delete Account',
                  message: `Delete "${a.name}"? Existing transactions referencing it will stay in history.`,
                  onOk: () => ledger.deleteAccount(a.id)
                })}
              />
            )}

            {activeTab === 'budgets' && (
              <BudgetsView
                currency={ledger.currency}
                privacyLevel={privacyLevel}
                tasks={ledger.tasks}
                accounts={ledger.accounts}
                periodTxs={ledger.periodTxs}
                metrics={ledger.metrics}
                quickTemplates={ledger.quickTemplates}
                recurringBills={ledger.recurringBills}
                savingsGoals={ledger.savingsGoals}
                categoryRules={ledger.categoryRules}
                onOpenAddTask={() => setTaskModal({ mode: 'add', data: { name: '', kind: 'expense', budget: 0, color: '#0D6E4E' } })}
                onEditTask={(t) => setTaskModal({ mode: 'edit', data: { ...t } })}
                onDeleteTask={(t) => setConfirmState({
                  title: 'Delete Task',
                  message: `Delete "${t.name}"?`,
                  onOk: () => ledger.deleteTask(t.id)
                })}
                onAddQuickTemplate={ledger.addQuickTemplate}
                onDeleteQuickTemplate={ledger.deleteQuickTemplate}
                onAddRecurringBill={ledger.addRecurringBill}
                onDeleteRecurringBill={ledger.deleteRecurringBill}
                onLogRecurringBill={ledger.logRecurringBill}
                onAddSavingsGoal={ledger.addSavingsGoal}
                onContributeGoal={ledger.contributeToGoal}
                onDeleteSavingsGoal={ledger.deleteSavingsGoal}
                onAddCategoryRule={ledger.addCategoryRule}
                onDeleteCategoryRule={ledger.deleteCategoryRule}
              />
            )}
          </>
        )}
      </main>

      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddTx={() => openNewTx('expense')}
      />

      <TransactionModal
        modal={txModal}
        accounts={ledger.accounts}
        tasks={ledger.tasks}
        onClose={() => setTxModal(null)}
        onSave={ledger.saveTransaction}
      />

      <AccountModal
        modal={acctModal}
        onClose={() => setAcctModal(null)}
        onSave={ledger.saveAccount}
      />

      <TaskModal
        modal={taskModal}
        onClose={() => setTaskModal(null)}
        onSave={ledger.saveTask}
      />

      <CsvImportModal
        open={csvModalOpen}
        accounts={ledger.accounts}
        tasks={ledger.tasks}
        categoryRules={ledger.categoryRules}
        onClose={() => setCsvModalOpen(false)}
        onImport={ledger.bulkImportTransactions}
      />

      <ConfirmModal
        confirmState={confirmState}
        onClose={() => setConfirmState(null)}
      />

      {toast && (
        <div className={`fixed bottom-20 md:bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-white text-xs font-semibold ${
          toast.tone === 'error' ? 'bg-negative' : toast.tone === 'info' ? 'bg-ink' : 'bg-positive'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

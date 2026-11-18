import React, { useState } from 'react';
import {
  Wallet, Plus, ChevronLeft, ChevronRight, MoreVertical,
  Download, Upload, Trash2, LogOut, RefreshCw
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'budgets', label: 'Tasks & Budgets' }
];

export default function Header({
  activeTab,
  setActiveTab,
  periodLabel,
  onPrevMonth,
  onNextMonth,
  onToggleAllTime,
  currency,
  onCurrencyChange,
  onOpenAddTx,
  onExportCsv,
  onExportJson,
  onImportJson,
  onClearTransactions,
  onSignOut,
  onRefresh,
  syncing,
  userEmail
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-surface border-b border-hairline sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-ink leading-none">LedgerFlow</h1>
                {syncing && <RefreshCw className="w-3.5 h-3.5 text-muted animate-spin" />}
              </div>
              <p className="text-[11px] text-muted hidden sm:block mt-0.5 truncate max-w-[200px]">
                {userEmail || 'Synced with Supabase'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Period Switcher */}
            <div className="flex items-center bg-canvas rounded-lg p-0.5 border border-hairline">
              <button
                type="button"
                onClick={onPrevMonth}
                aria-label="Previous month"
                className="p-1.5 rounded-md hover:bg-surface text-muted hover:text-ink transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onToggleAllTime}
                title="Click to toggle All Time"
                className="px-2.5 py-1 text-xs font-semibold text-ink min-w-[116px] text-center"
              >
                {periodLabel}
              </button>
              <button
                type="button"
                onClick={onNextMonth}
                aria-label="Next month"
                className="p-1.5 rounded-md hover:bg-surface text-muted hover:text-ink transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <select
              aria-label="Currency"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              className="bg-surface border border-hairline rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-ink"
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>

            <button
              type="button"
              onClick={onOpenAddTx}
              className="inline-flex items-center gap-1.5 bg-ink hover:bg-neutral-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>

            {/* Responsive Overflow Menu */}
            <div className="relative ml-auto sm:ml-0">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="More options"
                className="p-2 rounded-lg border border-hairline bg-surface hover:bg-canvas text-ink transition"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                  <div className="fixed left-4 right-4 top-28 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-56 bg-surface rounded-xl shadow-lg border border-hairline py-1.5 z-40">
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onRefresh(); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-ink hover:bg-canvas flex items-center gap-2.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-muted" /> Sync Now
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onExportCsv(); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-ink hover:bg-canvas flex items-center gap-2.5"
                    >
                      <Download className="w-3.5 h-3.5 text-muted" /> Export CSV Ledger
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onExportJson(); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-ink hover:bg-canvas flex items-center gap-2.5"
                    >
                      <Download className="w-3.5 h-3.5 text-muted" /> Backup JSON
                    </button>
                    <label className="w-full text-left px-4 py-2 text-xs font-medium text-ink hover:bg-canvas flex items-center gap-2.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-muted" /> Restore JSON
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => { setMenuOpen(false); onImportJson(e); }}
                        className="hidden"
                      />
                    </label>
                    <div className="border-t border-hairline my-1" />
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onClearTransactions(); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-negative hover:bg-red-50 flex items-center gap-2.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear All Transactions
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onSignOut(); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-muted hover:bg-canvas hover:text-ink flex items-center gap-2.5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 overflow-x-auto no-scrollbar -mb-px" aria-label="Main navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-xs sm:text-sm whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? 'font-semibold border-ink text-ink'
                  : 'font-medium border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

import React, { useState, useRef } from 'react';
import {
  Wallet, Plus, ChevronLeft, ChevronRight, MoreVertical,
  Download, Upload, Trash2, LogOut, RefreshCw, Eye, EyeOff
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'budgets', label: 'Plan & Budgets' }
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
  privacyLevel,
  onTogglePrivacyClick,
  onPrivacyLongPress,
  onOpenAddTx,
  onOpenCsvImport,
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
  const pressTimerRef = useRef(null);
  const longPressedRef = useRef(false);

  const startPress = () => {
    longPressedRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      longPressedRef.current = true;
      onPrivacyLongPress();
    }, 500);
  };

  const cancelPress = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleEyeClick = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    onTogglePrivacyClick();
  };

  const renderPrivacyBtn = (extraClass = '') => (
    <button
      type="button"
      onPointerDown={startPress}
      onPointerUp={cancelPress}
      onPointerLeave={cancelPress}
      onPointerCancel={cancelPress}
      onClick={handleEyeClick}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Privacy mode: click to hide balances, long-press to hide all numbers"
      title="Click: hide balances · Hold: hide all numbers"
      className={`inline-flex items-center gap-1 p-2 rounded-lg border transition select-none ${
        privacyLevel === 'all'
          ? 'bg-negative text-white border-negative'
          : privacyLevel === 'balances'
            ? 'bg-ink text-white border-ink'
            : 'bg-surface border-hairline text-muted hover:text-ink hover:bg-canvas'
      } ${extraClass}`}
    >
      {privacyLevel === 'off' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      {privacyLevel === 'all' && <span className="text-[10px] font-bold leading-none">ALL</span>}
    </button>
  );

  const renderMenuBtn = (extraClass = '') => (
    <div className={`relative ${extraClass}`}>
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
          <div className="fixed left-4 right-4 top-16 md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-56 bg-surface rounded-xl shadow-lg border border-hairline py-1.5 z-40">
            <button
              type="button"
              disabled={syncing}
              onClick={() => { setMenuOpen(false); onRefresh(); }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-ink hover:bg-canvas flex items-center gap-2.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted ${syncing ? 'animate-spin' : ''}`} /> Sync Now
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onOpenCsvImport(); }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-ink hover:bg-canvas flex items-center gap-2.5"
            >
              <Upload className="w-3.5 h-3.5 text-muted" /> Import Bank CSV
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
              disabled={syncing}
              onClick={() => { setMenuOpen(false); onClearTransactions(); }}
              className="w-full text-left px-4 py-2 text-xs font-medium text-negative hover:bg-red-50 flex items-center gap-2.5 disabled:opacity-50"
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
  );

  return (
    <header className="bg-surface border-b border-hairline sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 py-3">
          {/* Top Row: Brand + (Mobile Eye & 3-Dots) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-ink text-white flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-ink leading-none">LedgerFlow</h1>
                  {syncing && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-canvas border border-hairline text-muted">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Syncing
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted hidden sm:block mt-0.5 truncate max-w-[220px]">
                  {userEmail || 'Synced with Supabase'}
                </p>
              </div>
            </div>

            {/* Mobile-only top-right Eye & 3-dots */}
            <div className="flex md:hidden items-center gap-1.5 shrink-0">
              {renderPrivacyBtn()}
              {renderMenuBtn()}
            </div>
          </div>

          {/* Second Row on Mobile / Right Side on Desktop: Period + Currency + Desktop Actions */}
          <div className="flex items-center justify-between md:justify-end gap-2">
            <div className="flex items-center bg-canvas rounded-lg p-0.5 border border-hairline flex-1 md:flex-initial justify-between md:justify-start">
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
                className="px-2 py-1 text-xs font-semibold text-ink min-w-[104px] text-center truncate"
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
              className="bg-surface border border-hairline rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink focus:outline-none focus:border-ink shrink-0"
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>

            <div className="hidden md:flex items-center gap-2">
              {renderPrivacyBtn()}
              <button
                type="button"
                onClick={onOpenAddTx}
                className="inline-flex items-center gap-1.5 bg-ink hover:bg-neutral-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Entry</span>
              </button>
              {renderMenuBtn()}
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar -mb-px" aria-label="Main navigation">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition ${
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

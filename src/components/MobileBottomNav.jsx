import React from 'react';
import { LayoutDashboard, ListOrdered, Plus, Wallet, Target } from 'lucide-react';

export default function MobileBottomNav({ activeTab, setActiveTab, onOpenAddTx }) {
  const navBtn = (id, label, Icon) => {
    const active = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        className={`flex flex-col items-center justify-center py-1.5 px-2 flex-1 transition ${
          active ? 'text-ink font-semibold' : 'text-muted'
        }`}
      >
        <Icon className={`w-5 h-5 ${active ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
        <span className="text-[10px] mt-0.5">{label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-hairline px-2 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around h-16">
        {navBtn('dashboard', 'Overview', LayoutDashboard)}
        {navBtn('transactions', 'Ledger', ListOrdered)}

        <button
          type="button"
          onClick={onOpenAddTx}
          aria-label="Add Entry"
          className="w-12 h-12 -mt-5 rounded-full bg-ink text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        >
          <Plus className="w-6 h-6" />
        </button>

        {navBtn('accounts', 'Accounts', Wallet)}
        {navBtn('budgets', 'Plan', Target)}
      </div>
    </nav>
  );
}

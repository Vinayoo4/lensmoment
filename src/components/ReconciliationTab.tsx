import React, { useState } from 'react';
import { useApp } from './AppContext';
import { Scale, Calendar, AlertCircle, CheckCircle2, Lock, Save, ShieldAlert } from 'lucide-react';

export default function ReconciliationTab() {
  const { 
    user, 
    transactions, 
    reconciliationStates, 
    postReconciliation, 
    apiCall, 
    showToast, 
    fetchTransactions, 
    fetchReconciliations, 
    fetchDashboard 
  } = useApp();

  const [selectedMonth, setSelectedMonth] = useState('2026-07'); // Default to demo active month

  const isClientPortal = user?.role === 'Client Portal User';
  const canModifyReconciliation = user?.role === 'Workspace Admin' || user?.role === 'Financial Manager' || user?.role === 'superadmin';

  // Compute transactions matching selected month (e.g. YYYY-MM)
  const monthTransactions = transactions.filter(tx => tx.date.startsWith(selectedMonth));
  const unreconciledTxs = monthTransactions.filter(tx => tx.status === 'unreconciled');
  const discrepanciesCount = unreconciledTxs.length;

  // Retrieve existing reconciliation state for this month
  const currentMonthState = reconciliationStates.find(r => r.month === selectedMonth);

  // Draft Save Handler
  const handleSaveDraft = async () => {
    await postReconciliation({
      month: selectedMonth,
      discrepanciesCount,
      isDraft: true
    });
  };

  // Finalize Close Books Handler
  const handleFinalize = async () => {
    if (discrepanciesCount > 0) {
      if (!window.confirm(`Warning: You currently have ${discrepanciesCount} unreconciled discrepancies. Finalizing will force-reconcile all outstanding ledger entries for ${selectedMonth} to close the books. Do you want to proceed?`)) {
        return;
      }
    } else {
      if (!window.confirm(`Are you ready to finalize reconciliation and close the books for ${selectedMonth}? This locks the month record.`)) {
        return;
      }
    }

    try {
      // 1. Post reconciliation state as finalized (isDraft: false, discrepanciesCount: 0)
      await postReconciliation({
        month: selectedMonth,
        discrepanciesCount: 0,
        isDraft: false
      });

      // 2. If there were unreconciled transactions, bulk reconcile them in the backend or iteratively
      if (discrepanciesCount > 0) {
        showToast('Bulk reconciling outstanding month transactions...', 'info');
        for (const tx of unreconciledTxs) {
          await apiCall(`/api/transactions/${tx.id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'reconciled' })
          });
        }
      }

      showToast(`Books for ${selectedMonth} successfully reconciled and locked!`, 'success');
      fetchTransactions();
      fetchReconciliations();
      fetchDashboard();
    } catch (err: any) {
      showToast('Reconciliation finalization error: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2 uppercase">
            <Scale className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Monthly Ledger Reconciliation
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-wider mt-1">
            Compare transaction balances, evaluate differences, save drafts, and close monthly financial books.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 px-3 py-2 border-2 border-zinc-900 bg-white dark:bg-zinc-900 dark:border-zinc-800 shadow-none rounded-none shrink-0">
          <Calendar className="h-4 w-4 text-zinc-400" />
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="text-xs font-black uppercase tracking-wider bg-transparent border-none text-zinc-700 dark:text-zinc-200 focus:outline-none"
          >
            <option value="2026-05" className="dark:bg-zinc-900">May 2026</option>
            <option value="2026-06" className="dark:bg-zinc-900">June 2026</option>
            <option value="2026-07" className="dark:bg-zinc-900">July 2026</option>
            <option value="2026-08" className="dark:bg-zinc-900">August 2026</option>
          </select>
        </div>
      </div>

      {isClientPortal && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500 text-zinc-900 dark:text-zinc-100 flex items-center gap-3 rounded-none">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-mono uppercase tracking-wide">
            <strong>Client Portal Restricted Mode:</strong> Access to month finalization, closing draft saves, and balance modifications is disabled.
          </p>
        </div>
      )}

      {/* Main Reconciliation Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Discrepancy details & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 shadow-none space-y-4">
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">Month Summary — {selectedMonth}</h2>
            
            {/* Displaying state badge */}
            <div className="flex items-center gap-4">
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Books Status:</div>
              {currentMonthState ? (
                currentMonthState.isDraft ? (
                  <span className="px-2.5 py-1 rounded-none text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border-2 border-zinc-900">
                    Draft Reconciled ({currentMonthState.discrepanciesCount} Discrepancies)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-2 border-zinc-900">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled & Closed (Locked)
                  </span>
                )
              ) : (
                <span className="px-2.5 py-1 rounded-none text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-500 border-2 border-zinc-900 dark:bg-zinc-800 dark:text-zinc-400">
                  Unreconciled
                </span>
              )}
            </div>

            {/* Reconciliation math boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-850/80">
                <div className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Total Postings This Month</div>
                <div className="text-2xl font-black mt-1 text-zinc-900 dark:text-zinc-100 font-mono uppercase tracking-tight">
                  {monthTransactions.length} items
                </div>
              </div>
              <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-850/80">
                <div className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">Discrepancy (Unreconciled) Backlog</div>
                <div className="text-2xl font-black mt-1 font-mono flex items-center gap-2">
                  <span className={discrepanciesCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {discrepanciesCount} items
                  </span>
                  {discrepanciesCount > 0 && <AlertCircle className="h-4 w-4 text-rose-500 animate-pulse" />}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            {canModifyReconciliation && (!currentMonthState || currentMonthState.isDraft) && (
              <div className="flex justify-end gap-3 border-t-2 border-zinc-900 dark:border-zinc-800 pt-4">
                <button
                  onClick={handleSaveDraft}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-none text-xs font-black uppercase tracking-wider border-2 border-zinc-900 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Draft State
                </button>
                <button
                  onClick={handleFinalize}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-none text-xs font-black uppercase tracking-wider border-2 border-zinc-900 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Finalize & Close Books
                </button>
              </div>
            )}
          </div>

          {/* Month Transaction review listing */}
          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none p-5 shadow-none space-y-4">
            <h3 className="font-black text-base text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">Transaction Postings for {selectedMonth}</h3>
            <div className="divide-y-2 divide-zinc-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto pr-1">
              {monthTransactions.length === 0 ? (
                <p className="text-xs text-zinc-400 italic text-center py-6 uppercase font-mono tracking-wider">No transaction postings entered for this month period.</p>
              ) : (
                monthTransactions.map(tx => (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-xs gap-3">
                    <div>
                      <p className="font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{tx.description}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">{tx.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-black text-zinc-700 dark:text-zinc-300">
                        ₹{tx.amount.toLocaleString()}
                      </p>
                      <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-none border border-zinc-900 mt-1 ${
                        tx.status === 'reconciled' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Informative Guidance */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">Ledger compliance guide</h2>
          <div className="p-5 rounded-none bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 space-y-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-450">
            <div>
              <h4 className="font-black text-zinc-700 dark:text-zinc-350 uppercase tracking-wide text-xs mb-1">What is Reconciliation?</h4>
              <p>Reconciliation compares the internal accounting ledger against external bank statements. Any unmatched transaction creates a "discrepancy".</p>
            </div>
            <div>
              <h4 className="font-black text-zinc-700 dark:text-zinc-350 uppercase tracking-wide text-xs mb-1">Closing the Books</h4>
              <p>At the end of a fiscal month, resolving all discrepancies allows you to safely lock the month ledger. Once finalized, the period is marked Closed & Locked to protect historical reporting accuracy.</p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-none border-2 border-indigo-500 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wide">
              Pro-Tip: Keeping transactions matched in the Transactions tab daily avoids a backlog during month-end closes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

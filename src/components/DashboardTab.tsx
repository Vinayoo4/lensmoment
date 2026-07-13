import React from 'react';
import { useApp } from './AppContext';
import { api } from '../lib/api';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  RefreshCw, 
  Trash2, 
  Check, 
  AlertCircle 
} from 'lucide-react';

// Reusable crash-proof Sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div className="text-xs text-slate-400">Not enough data</div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 30;
  const padding = 2;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function DashboardTab() {
  const { 
    user, 
    dashboardData, 
    suggestions, 
    resolveSuggestion, 
    isOnline, 
    offlineQueue, 
    failedQueue, 
    clearFailedQueue, 
    retryFailedAction,
    isLoading,
    fetchDashboard,
    fetchSuggestions,
    showToast
  } = useApp();

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [aiInsight, setAiInsight] = React.useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = React.useState(false);

  const loadAiInsight = async () => {
    try {
      setIsLoadingInsight(true);
      const res = await fetch('/api/dashboard/ai-summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('quantify_token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAiInsight(data.insight);
      }
    } catch (err) {
      console.error('Failed to load AI insight', err);
    } finally {
      setIsLoadingInsight(false);
    }
  };

  React.useEffect(() => {
    loadAiInsight();
  }, []);

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      // Directly call the typed API wrapper to test the connection and fetch
      await api.dashboard.get();
      // Call standard refresh routines to update App context state
      if (fetchDashboard) await fetchDashboard();
      if (fetchSuggestions) await fetchSuggestions();
      await loadAiInsight();
      if (showToast) showToast('Dashboard synchronized via Quantify API Client.', 'success');
    } catch (err: any) {
      if (showToast) showToast('Sync failed: ' + err.message, 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-slate-500">
        <Activity className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium">Crunching workspace statistics...</p>
      </div>
    );
  }

  const { kpis, entries, transactions } = dashboardData;

  // Process core KPIs for cards
  const kpiCards = kpis.map((kpi: any) => {
    const kpiEntries = entries.filter((e: any) => e.kpiId === kpi.id).sort((a: any, b: any) => a.date.localeCompare(b.date));
    const values = kpiEntries.map((e: any) => e.value);
    const lastValue = values.length > 0 ? values[values.length - 1] : 0;
    const priorValue = values.length > 1 ? values[values.length - 2] : lastValue;
    const changePct = priorValue > 0 ? ((lastValue - priorValue) / priorValue) * 100 : 0;
    
    // Determine trend colors
    const isHigherIsBetter = kpi.name !== 'Customer Acquisition Cost';
    const isPositive = changePct >= 0;
    const isGood = isHigherIsBetter ? isPositive : !isPositive;

    return {
      id: kpi.id,
      name: kpi.name,
      value: lastValue,
      unit: kpi.unit,
      target: kpi.targetValue,
      changePct: Math.round(changePct * 10) / 10,
      isGood,
      values: values.slice(-10), // last 10 points for sparkline
      color: isGood ? '#10b981' : '#f43f5e' // green vs rose
    };
  });

  const activeSuggestions = suggestions.filter((s: any) => s.status === 'todo');
  const isClientPortal = user?.role === 'Client Portal User';

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">
            Operational Intelligence Console
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-wider mt-1">
            Real-time metric health, AI alerts, and multi-tenant ledger outstandings.
          </p>
        </div>
        <div className="text-left md:text-right flex flex-col md:items-end gap-2">
          <div>
            <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.2em] font-black">Operational Timestamp</div>
            <div className="text-xs font-black text-zinc-700 dark:text-zinc-300 font-mono uppercase tracking-wider mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-2 border-zinc-900 dark:border-zinc-800 text-xs font-mono font-bold uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${(isRefreshing || isLoading) ? 'animate-spin' : ''}`} />
            Sync Ledger
          </button>
        </div>
      </div>

      {/* AI Financial Health Summary Banner */}
      <div id="ai-insight-banner" className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 text-zinc-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle decorative mesh background effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40"></div>
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="h-10 w-10 shrink-0 bg-indigo-500/10 border-2 border-indigo-400/30 flex items-center justify-center text-indigo-400">
            <Sparkles className={`h-5 w-5 ${isLoadingInsight ? 'animate-spin' : 'animate-pulse'}`} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Quantify AI Intelligence Node</span>
              <span className="bg-indigo-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 tracking-wider font-mono">Gemini 3.5 Flash</span>
            </div>
            <p className="text-sm font-black text-white leading-relaxed max-w-4xl">
              {isLoadingInsight ? (
                <span className="inline-block animate-pulse text-zinc-400 font-mono text-xs uppercase tracking-wider">Synthesizing last 7 days of financial ledger transactions...</span>
              ) : (
                aiInsight || 'No transactions logged within simulated analytics range.'
              )}
            </p>
          </div>
        </div>

        <button 
          onClick={loadAiInsight}
          disabled={isLoadingInsight}
          className="shrink-0 text-[10px] font-black uppercase font-mono tracking-wider border-2 border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-850 px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-50 text-indigo-300 relative z-10"
        >
          {isLoadingInsight ? 'Computing...' : 'Recalculate Summary'}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpiCards.length === 0 ? (
          <div className="col-span-3 p-6 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-900 rounded-none text-center text-zinc-500 dark:text-zinc-400 text-sm font-bold uppercase">
            No KPI definitions configured for this workspace. Head over to the KPI tab to establish your business definitions.
          </div>
        ) : (
          kpiCards.map((card: any) => (
            <div 
              key={card.id} 
              className="p-6 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 shadow-none hover:shadow-[4px_4px_0px_0px_rgba(99,102,241,1)] transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                    {card.name}
                  </span>
                  <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-none border-2 border-zinc-900 ${
                    card.isGood 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {card.changePct >= 0 ? '+' : ''}{card.changePct}%
                  </div>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100 font-mono tracking-tighter">
                    {card.unit}{card.value.toLocaleString()}
                  </span>
                  {card.target && (
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                      / target: {card.unit}{card.target.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline & trend description */}
              <div className="mt-6 flex items-center justify-between border-t-2 border-zinc-900 dark:border-zinc-800 pt-4">
                <div className="flex items-center gap-1.5">
                  {card.isGood ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  )}
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    {card.isGood ? 'Positive trend' : 'Needs attention'}
                  </span>
                </div>
                <Sparkline data={card.values} color={card.color} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Offline Sync Ledger Widget */}
      {(offlineQueue.length > 0 || failedQueue.length > 0) && (
        <div className="p-6 rounded-none bg-amber-500/10 border-2 border-amber-500 dark:border-amber-500/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-none border-2 border-zinc-900 bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-5 w-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wide">
                  Offline Sync Log — Pending Actions
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  The ledger holds mutations locally while internet connection is disconnected. Retries can be requested below.
                </p>
              </div>
            </div>
            {failedQueue.length > 0 && (
              <button 
                onClick={clearFailedQueue}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-none border-2 border-zinc-900 bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-black text-zinc-900 dark:text-zinc-300 transition-colors uppercase tracking-wider"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear failed queue
              </button>
            )}
          </div>

          <div className="divide-y-2 divide-zinc-900">
            {/* Pending items */}
            {offlineQueue.map(item => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs font-mono">
                <div className="text-zinc-600 dark:text-zinc-300">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">[{item.type.toUpperCase()}]</span> — Queued {new Date(item.timestamp).toLocaleTimeString()}
                </div>
                <span className="px-2 py-0.5 rounded-none text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-500/30">
                  Pending online
                </span>
              </div>
            ))}

            {/* Failed items */}
            {failedQueue.map(item => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-zinc-700 dark:text-zinc-200">
                    <span className="font-bold text-rose-600 dark:text-rose-400">[{item.type.toUpperCase()}]</span> — Failed Sync
                  </div>
                  <div className="text-[11px] text-rose-500 mt-1 max-w-lg truncate">
                    Reason: {item.errorMessage}
                  </div>
                </div>
                <button
                  onClick={() => retryFailedAction(item.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none border-2 border-zinc-900 font-sans text-[10px] font-black uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry Sync
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: AI Suggestions & Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Suggestions Box */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">
              Operational Intelligence suggestions
            </h2>
          </div>

          <div className="space-y-4">
            {activeSuggestions.length === 0 ? (
              <div className="p-8 rounded-none border-2 border-dashed border-zinc-350 dark:border-zinc-700 text-center text-zinc-500 dark:text-zinc-400">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
                <p className="text-sm font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">All ledger health rules look solid!</p>
                <p className="text-xs text-zinc-400 mt-1 font-mono uppercase">Quantify AI rules-based engine finds no immediate discrepancies.</p>
              </div>
            ) : (
              activeSuggestions.map((sug: any) => (
                <div 
                  key={sug.id} 
                  className={`p-5 rounded-none border-2 border-zinc-900 dark:border-zinc-800 flex flex-col justify-between gap-4 transition-all hover:-translate-y-0.5 ${
                    sug.type.includes('critical') || sug.type.includes('decline')
                      ? 'bg-rose-500/10 border-rose-900'
                      : 'bg-indigo-500/10 border-indigo-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2.5 h-2.5 rounded-none ${
                        sug.type.includes('critical') || sug.type.includes('decline') ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500'
                      }`} />
                      <span className="text-[10px] font-black font-mono tracking-widest uppercase text-zinc-500">
                        {sug.trigger.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-2 font-black italic leading-relaxed">
                      "{sug.text}"
                    </p>
                  </div>

                  {!isClientPortal && (
                    <div className="flex items-center gap-2 self-end border-t-2 border-zinc-900 dark:border-zinc-850 pt-3 w-full justify-end">
                      <button 
                        onClick={() => resolveSuggestion(sug.id, 'done')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-none bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-black uppercase tracking-widest transition-colors border-2 border-zinc-900 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" /> Mark completed
                      </button>
                      <button 
                        onClick={() => resolveSuggestion(sug.id, 'dismissed')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-none bg-white hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-black uppercase tracking-widest transition-colors border-2 border-zinc-900 dark:border-zinc-800 cursor-pointer"
                      >
                        ✕ Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Ledger postings sidebar */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2 uppercase">
            <span className="inline-block w-3.5 h-3.5 rounded-none bg-indigo-600 dark:bg-indigo-500" />
            Recent Ledger
          </h2>

          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none p-4 shadow-none divide-y-2 divide-zinc-100 dark:divide-zinc-800 max-h-[500px] overflow-y-auto">
            {transactions.length === 0 ? (
              <div className="p-6 text-center text-zinc-400 text-xs uppercase font-mono tracking-wider">
                No recent postings tracked.
              </div>
            ) : (
              transactions.map((tx: any) => (
                <div key={tx.id} className="py-3 flex items-center justify-between text-xs gap-3">
                  <div className="truncate">
                    <p className="font-black text-zinc-900 dark:text-zinc-200 truncate uppercase tracking-tight">{tx.description}</p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{tx.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-mono font-black ${tx.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString()}
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
    </div>
  );
}

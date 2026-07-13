import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { api } from '../lib/api';
import { ShieldAlert, Plus, Server, FileLock, Clipboard, RefreshCw, ChevronUp, ChevronDown, ArrowUpDown, Search, X, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function AdminTab() {
  const { user, apiCall, showToast } = useApp();

  const [workspacesList, setWorkspacesList] = useState<any[]>([]);
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [selectedWsStats, setSelectedWsStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Subscription management states
  const [subPlan, setSubPlan] = useState<'free' | '6_months' | '1_year' | 'unsubscribed'>('free');
  const [subExpiry, setSubExpiry] = useState<string>('');
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  useEffect(() => {
    if (selectedWsStats) {
      setSubPlan(selectedWsStats.subscriptionPlan || 'free');
      setSubExpiry(selectedWsStats.subscriptionExpiresAt || '');
    }
  }, [selectedWsStats]);

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWsId) return;
    setIsUpdatingSub(true);
    try {
      await apiCall(`/api/workspaces/${selectedWsId}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({ plan: subPlan, expiresAt: subExpiry })
      });
      showToast('Workspace subscription updated successfully!', 'success');
      // Reload stats
      loadWorkspaceStats(selectedWsId);
      loadAuditLogs();
    } catch (err: any) {
      showToast('Failed to update subscription: ' + err.message, 'error');
    } finally {
      setIsUpdatingSub(false);
    }
  };

  const [isCreatingWs, setIsCreatingWs] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Sorting and filtering state
  const [sortField, setSortField] = useState<'timestamp' | 'action' | 'userEmail' | 'details'>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Log for detail modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Reset pagination on search or limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  // Guard: Fail safely if not superadmin
  if (user?.role !== 'superadmin') {
    return (
      <div className="p-8 text-center text-rose-600 bg-rose-50 dark:bg-zinc-950 border-2 border-rose-500 rounded-none flex flex-col items-center gap-3">
        <ShieldAlert className="h-10 w-10 animate-bounce" />
        <h2 className="text-base font-black uppercase tracking-wider">Access Denied</h2>
        <p className="text-xs font-mono uppercase tracking-wide">The Superadmin Portal is strictly restricted to platform administrators with Superadmin role privileges.</p>
      </div>
    );
  }

  // Fetch all workspaces
  const loadWorkspaces = async () => {
    try {
      const data = await apiCall('/api/workspaces');
      setWorkspacesList(data);
    } catch (err: any) {
      showToast('Failed to load workspaces: ' + err.message, 'error');
    }
  };

  // Fetch full system audit logs using our typed API wrapper
  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const data = await api.audit.list();
      setAuditLogs(data);
    } catch (err: any) {
      showToast('Failed to load audit logs: ' + err.message, 'error');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Fetch workspace-specific statistics
  const loadWorkspaceStats = async (wsId: string) => {
    setIsLoadingStats(true);
    try {
      const data = await apiCall(`/api/workspaces/${wsId}/stats`);
      setSelectedWsStats(data);
    } catch (err: any) {
      showToast('Failed to load workspace statistics: ' + err.message, 'error');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
    loadAuditLogs();
  }, []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName) return;

    try {
      await apiCall('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: newWsName })
      });
      showToast(`Workspace "${newWsName}" provisioned!`, 'success');
      setNewWsName('');
      setIsCreatingWs(false);
      loadWorkspaces();
      loadAuditLogs(); // will register workspace creation in audit logs
    } catch (err: any) {
      showToast('Workspace creation failed: ' + err.message, 'error');
    }
  };

  const handleSort = (field: 'timestamp' | 'action' | 'userEmail' | 'details') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (field: 'timestamp' | 'action' | 'userEmail' | 'details') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-zinc-400 inline" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3.5 w-3.5 ml-1 text-indigo-600 dark:text-indigo-400 inline" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1 text-indigo-600 dark:text-indigo-400 inline" />;
  };

  // Filter and Sort logs
  const filteredAndSortedLogs = auditLogs
    .filter(log => {
      const query = searchQuery.toLowerCase();
      const formattedDate = new Date(log.timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).toLowerCase();

      return (
        log.action?.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query) ||
        log.userEmail?.toLowerCase().includes(query) ||
        log.id?.toLowerCase().includes(query) ||
        formattedDate.includes(query)
      );
    })
    .sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (sortField === 'timestamp') {
        const timeA = new Date(aVal).getTime();
        const timeB = new Date(bVal).getTime();
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  // Paginated subset of logs
  const totalItems = filteredAndSortedLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedLogs = filteredAndSortedLogs.slice(indexOfFirstItem, indexOfLastItem);

  // Export currently filtered audit logs to CSV
  const handleExportCSV = () => {
    try {
      if (filteredAndSortedLogs.length === 0) {
        showToast('No logs available to export.', 'warning');
        return;
      }
      
      const csvRows = [
        ['ID', 'Timestamp', 'Action', 'Operator/User', 'Details'].join(',')
      ];

      filteredAndSortedLogs.forEach(log => {
        const id = log.id || '';
        const timestamp = new Date(log.timestamp).toISOString();
        const action = `"${(log.action || '').replace(/"/g, '""')}"`;
        const operator = `"${(log.userEmail || 'System').replace(/"/g, '""')}"`;
        const details = `"${(log.details || '').replace(/"/g, '""')}"`;
        
        csvRows.push([id, timestamp, action, operator, details].join(','));
      });

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `filtered_security_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Filtered audit logs CSV downloaded successfully.', 'success');
    } catch (err: any) {
      showToast('Failed to export CSV: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2 uppercase">
            <ShieldAlert className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Superadmin Central Portal
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-wider mt-1">
            Provision workspaces, monitor cross-tenant telemetry logs, and inspect server-side security audits.
          </p>
        </div>

        {!isCreatingWs && (
          <button
            onClick={() => setIsCreatingWs(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-none text-xs font-black uppercase tracking-wider transition-colors border-2 border-zinc-900 cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            Provision Workspace
          </button>
        )}
      </div>

      {/* Provision workspace overlay */}
      {isCreatingWs && (
        <form onSubmit={handleCreateWorkspace} className="p-6 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 space-y-4 shadow-none animate-fade-in max-w-xl">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Provision New Multi-Tenant Workspace</h2>
          <div>
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Workspace Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Gamma Enterprises LLC"
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              className="w-full p-3 rounded-none border-2 border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900 text-sm focus:outline-none dark:text-zinc-100 font-mono uppercase"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingWs(false)}
              className="px-4 py-2 rounded-none text-zinc-500 dark:text-zinc-400 text-xs font-black uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-none bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-black uppercase tracking-wider border-2 border-zinc-900 cursor-pointer"
            >
              Provision Tenant Space
            </button>
          </div>
        </form>
      )}

      {/* Workspace Listing and Telemetry stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workspace directory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">Active tenants</h2>
            <button onClick={loadWorkspaces} className="p-1 border-2 border-zinc-900 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 rounded-none cursor-pointer">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none p-4 shadow-none divide-y-2 divide-zinc-150/40 dark:divide-zinc-800 max-h-[300px] overflow-y-auto">
            {workspacesList.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">No workspaces active.</p>
            ) : (
              workspacesList.map(ws => {
                const isSelected = ws.id === selectedWsId;
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      setSelectedWsId(ws.id);
                      loadWorkspaceStats(ws.id);
                    }}
                    className={`w-full text-left py-3 px-3 rounded-none transition-all flex items-center gap-3 border-2 cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-50/10 border-indigo-500 text-indigo-950 dark:text-white shadow-none' 
                        : 'border-transparent text-zinc-700 hover:bg-zinc-50/50 dark:text-zinc-300 dark:hover:bg-zinc-900/30'
                    }`}
                  >
                    <Server className={`h-4.5 w-4.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div className="truncate">
                      <p className="font-black text-xs uppercase tracking-tight truncate">{ws.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">ID: {ws.id.slice(0, 8)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Workspace specific telemetry stats */}
        <div className="lg:col-span-2">
          {selectedWsId ? (
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none p-6 shadow-none space-y-6">
              <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-50 flex items-center gap-2 border-b-2 pb-3 border-zinc-900 dark:border-zinc-800 uppercase tracking-wide">
                <Server className="h-4 w-4 text-indigo-500" />
                Tenant Telemetry Dashboard — {selectedWsStats?.workspaceName || 'Loading...'}
              </h3>

              {isLoadingStats ? (
                <div className="py-8 text-center text-xs text-slate-400 font-mono animate-pulse uppercase">
                  Querying database statistics...
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800 text-xs">
                      <span className="text-[9px] text-zinc-400 uppercase font-black font-mono tracking-widest">Metrics Definition Pool</span>
                      <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 font-mono mt-1 uppercase tracking-tight">{selectedWsStats?.kpisCount} definitions</p>
                    </div>
                    <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800 text-xs">
                      <span className="text-[9px] text-zinc-400 uppercase font-black font-mono tracking-widest">Total Historic Entries</span>
                      <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 font-mono mt-1 uppercase tracking-tight">{selectedWsStats?.entriesCount} records</p>
                    </div>
                    <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800 text-xs">
                      <span className="text-[9px] text-zinc-400 uppercase font-black font-mono tracking-widest">Total Transactions Posted</span>
                      <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 font-mono mt-1 uppercase tracking-tight">{selectedWsStats?.transactionsCount} transactions</p>
                    </div>
                    <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800 text-xs">
                      <span className="text-[9px] text-zinc-400 uppercase font-black font-mono tracking-widest">Active Suggestions</span>
                      <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 font-mono mt-1 uppercase tracking-tight">{selectedWsStats?.suggestionsCount} suggestions</p>
                    </div>
                  </div>

                  {/* SaaS Subscription Controls */}
                  <form onSubmit={handleUpdateSubscription} className="pt-6 border-t-2 border-zinc-150/40 dark:border-zinc-800 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
                      SaaS Workspace Subscription Pack
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Package Plan</label>
                        <select
                          value={subPlan}
                          onChange={e => setSubPlan(e.target.value as any)}
                          className="w-full p-2 border-2 border-zinc-900 bg-white dark:bg-zinc-950 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-none cursor-pointer"
                        >
                          <option value="free">30-Day Free Trial</option>
                          <option value="6_months">6-Month Premium Pack</option>
                          <option value="1_year">1-Year Enterprise Pack</option>
                          <option value="unsubscribed">No Active Subscription</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Expiration Date</label>
                        <input
                          type="date"
                          required
                          value={subExpiry}
                          onChange={e => setSubExpiry(e.target.value)}
                          className="w-full p-2 border-2 border-zinc-900 bg-white dark:bg-zinc-950 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isUpdatingSub}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 text-xs font-black uppercase tracking-wider transition-colors border-2 border-indigo-600 cursor-pointer disabled:opacity-50"
                      >
                        {isUpdatingSub ? 'Saving...' : 'Update Workspace Plan'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[180px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none shadow-none text-center p-6 text-zinc-400 dark:text-zinc-500">
              <Clipboard className="h-10 w-10 text-zinc-300 dark:text-zinc-650 mb-2" />
              <p className="text-xs font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">No workspace selected</p>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono uppercase tracking-wide">Select an active tenant on the left to display its database and BI counts.</p>
            </div>
          )}
        </div>
      </div>

      {/* Global System Security & Compliance Audit Log */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none p-6 shadow-none space-y-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 pb-3 border-zinc-900 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2 uppercase tracking-wide">
              <FileLock className="h-4.5 w-4.5 text-indigo-500" />
              Global Security Audit Log Directory
            </h2>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wider mt-0.5">
              Searchable by Action, Operator email, details, or date & timestamp.
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 pointer-events-none">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white rounded-none"
              />
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="p-1.5 border-2 border-zinc-900 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 rounded-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-850 flex items-center gap-1.5 font-mono uppercase text-[10px] font-black h-[32px] transition-colors"
              title="Export filtered logs to CSV"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">Export CSV</span>
            </button>
            
            <button onClick={loadAuditLogs} className="p-1.5 border-2 border-zinc-900 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 rounded-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 h-[32px]" title="Refresh security logs">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="border-2 border-zinc-900 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-950 border-b-2 border-zinc-900 dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest font-mono text-zinc-500 dark:text-zinc-400">
                  <th 
                    onClick={() => handleSort('timestamp')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors whitespace-nowrap"
                  >
                    Timestamp {renderSortIcon('timestamp')}
                  </th>
                  <th 
                    onClick={() => handleSort('action')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors whitespace-nowrap"
                  >
                    Action/Trigger {renderSortIcon('action')}
                  </th>
                  <th 
                    onClick={() => handleSort('userEmail')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors whitespace-nowrap"
                  >
                    Operator/User {renderSortIcon('userEmail')}
                  </th>
                  <th 
                    onClick={() => handleSort('details')}
                    className="py-3 px-4 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-colors"
                  >
                    Security Event Details {renderSortIcon('details')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-zinc-100 dark:divide-zinc-800 text-xs font-mono">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500 dark:text-zinc-400 animate-pulse uppercase tracking-wider font-bold">
                      Querying security journals...
                    </td>
                  </tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500 dark:text-zinc-400 italic uppercase tracking-wider">
                      No security journals match the filter.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map(log => (
                    <motion.tr 
                      key={log.id} 
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-zinc-55/60 dark:hover:bg-zinc-950/40 transition-colors cursor-pointer group"
                      title="Click to view full event JSON payload"
                    >
                      <td className="py-3 px-4 text-[11px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap uppercase">
                        {new Date(log.timestamp).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-450 border border-indigo-500 uppercase tracking-wider">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-800 dark:text-zinc-200 font-bold whitespace-nowrap">
                        {log.userEmail || 'System'}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 dark:text-zinc-350 font-sans text-xs leading-relaxed max-w-md break-words">
                        {log.details}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-150 dark:border-zinc-800 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px]">Show:</span>
              <select
                value={itemsPerPage}
                onChange={e => setItemsPerPage(Number(e.target.value))}
                className="bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-850 py-1 px-2 text-xs font-bold rounded-none focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white"
              >
                <option value={10}>10 records</option>
                <option value={15}>15 records</option>
                <option value={25}>25 records</option>
                <option value={50}>50 records</option>
              </select>
              <span className="text-zinc-400">
                | Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalItems)} of {totalItems} logs
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border-2 border-zinc-900 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 rounded-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => {
                    return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsisBefore && <span className="px-1 text-zinc-400">...</span>}
                        <button
                          onClick={() => setCurrentPage(p)}
                          className={`min-w-[28px] h-[28px] text-center border-2 font-bold transition-all cursor-pointer ${
                            currentPage === p
                              ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100'
                              : 'bg-white text-zinc-800 border-zinc-900 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border-2 border-zinc-900 dark:border-zinc-850 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 rounded-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Detail Modal Overlay */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border-4 border-zinc-900 dark:border-zinc-800 rounded-none w-full max-w-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-zinc-900 dark:bg-zinc-950 text-white p-4 border-b-2 border-zinc-900">
              <div className="flex items-center gap-2">
                <FileLock className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="text-xs font-black uppercase tracking-widest font-mono">Event Payload Audit Journal</h3>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1 border-2 border-white/20 text-white/80 hover:text-white hover:border-white rounded-none cursor-pointer transition-colors"
                title="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Context Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800">
                  <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">Action Trigger</span>
                  <span className="px-2 py-0.5 inline-block text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500 uppercase tracking-widest mt-1">
                    {selectedLog.action}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800">
                  <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">Operator / User</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 mt-1 block truncate">
                    {selectedLog.userEmail || 'System'}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800">
                  <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">Timestamp</span>
                  <span className="text-zinc-700 dark:text-zinc-300 mt-1 block">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800">
                  <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">Database Record ID</span>
                  <span className="text-zinc-500 dark:text-zinc-400 mt-1 block truncate">
                    {selectedLog.id}
                  </span>
                </div>
              </div>

              {/* Description Detail Block */}
              <div className="space-y-1">
                <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-black font-mono uppercase tracking-widest block">Activity Description</span>
                <p className="text-xs text-zinc-800 dark:text-zinc-250 font-sans leading-relaxed p-3 bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-850">
                  {selectedLog.details}
                </p>
              </div>

              {/* JSON Payload Block */}
              <div className="space-y-2">
                <span className="text-[9px] text-zinc-450 dark:text-zinc-500 font-black font-mono uppercase tracking-widest block">Complete Event Object (JSON)</span>
                <pre className="text-[11px] font-mono p-4 bg-zinc-950 text-emerald-400 border-2 border-zinc-900 dark:border-zinc-800 overflow-x-auto max-h-60 rounded-none whitespace-pre scrollbar-thin">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t-2 border-zinc-900 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 border-2 border-zinc-900 text-xs font-black uppercase tracking-wider bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 cursor-pointer rounded-none active:translate-y-0.5 transition-transform"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

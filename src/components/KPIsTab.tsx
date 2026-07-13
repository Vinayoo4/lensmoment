import React, { useState } from 'react';
import { useApp } from './AppContext';
import { TrendingUp, Plus, Calendar, Disc, Trash2, Sliders, ShieldAlert, FileSpreadsheet, FileText, AlertTriangle, Edit2 } from 'lucide-react';
import TrendChart from './TrendChart';

export default function KPIsTab() {
  const { user, kpis, postKPIEntry, fetchKPIs, fetchDashboard, apiCall, showToast, dashboardData } = useApp();
  
  const allEntries = dashboardData?.entries || [];

  const [alertSettings, setAlertSettings] = useState<Record<string, 'drift' | 'below' | 'above'>>(() => {
    try {
      const saved = localStorage.getItem('quantify_kpi_alert_settings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const saveAlertSetting = (kpiId: string, type: 'drift' | 'below' | 'above') => {
    const updated = { ...alertSettings, [kpiId]: type };
    setAlertSettings(updated);
    localStorage.setItem('quantify_kpi_alert_settings', JSON.stringify(updated));
    showToast('KPI alert threshold criteria configured.', 'success');
  };

  const [isAddingKPI, setIsAddingKPI] = useState(false);
  const [newKPIName, setNewKPIName] = useState('');
  const [newKPIUnit, setNewKPIUnit] = useState('₹');
  const [newKPITarget, setNewKPITarget] = useState('');

  const [activeKpiId, setActiveKpiId] = useState<string | null>(null);
  const [isLoggingEntry, setIsLoggingEntry] = useState(false);
  const [logValue, setLogValue] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit KPI state
  const [isEditingDefinition, setIsEditingDefinition] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('₹');
  const [editTarget, setEditTarget] = useState('');

  const startEditingDefinition = (kpi: any) => {
    setEditName(kpi.name);
    setEditUnit(kpi.unit);
    setEditTarget(kpi.targetValue !== null && kpi.targetValue !== undefined ? String(kpi.targetValue) : '');
    setIsEditingDefinition(true);
  };

  const handleUpdateKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKpiId || !editName || !editUnit) {
      showToast('Please specify a name and measurement unit', 'error');
      return;
    }

    try {
      const targetVal = editTarget !== '' ? Number(editTarget) : null;
      await apiCall(`/api/kpis/${activeKpiId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          unit: editUnit,
          targetValue: targetVal
        })
      });
      showToast('KPI Definition updated successfully!', 'success');
      setIsEditingDefinition(false);
      fetchKPIs();
      fetchDashboard();
    } catch (err: any) {
      showToast('Failed to update KPI: ' + err.message, 'error');
    }
  };

  const isClientPortal = user?.role === 'Client Portal User';
  const canModifyDefinitions = user?.role === 'Workspace Admin' || user?.role === 'Financial Manager' || user?.role === 'superadmin';
  const canLogEntries = user?.role !== 'Client Portal User';

  // Export KPI trends and logs to structured CSV format
  const handleExportCSV = () => {
    try {
      const allEntries = useApp().dashboardData?.entries || [];
      const csvRows = [
        ['KPI ID', 'KPI Name', 'Unit', 'Target Value', 'Log Date', 'Logged Value', 'Variance', 'Compliance Status'].join(',')
      ];

      kpis.forEach(kpi => {
        const kpiEntries = allEntries.filter((e: any) => e.kpiId === kpi.id);
        if (kpiEntries.length === 0) {
          csvRows.push([
            kpi.id,
            `"${kpi.name.replace(/"/g, '""')}"`,
            kpi.unit,
            kpi.targetValue !== null ? kpi.targetValue : 'None',
            'No Entries',
            'N/A',
            'N/A',
            'N/A'
          ].join(','));
        } else {
          kpiEntries.forEach((entry: any) => {
            const val = Number(entry.value);
            const target = kpi.targetValue !== null ? Number(kpi.targetValue) : null;
            let variance = 'N/A';
            let status = 'N/A';
            if (target !== null) {
              variance = (val - target).toString();
              status = val >= target ? 'MET TARGET' : 'BELOW TARGET';
            }
            csvRows.push([
              kpi.id,
              `"${kpi.name.replace(/"/g, '""')}"`,
              kpi.unit,
              target !== null ? target : 'None',
              entry.date,
              val,
              variance,
              status
            ].join(','));
          });
        }
      });

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `kpi_performance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSV Compliance Report downloaded successfully.', 'success');
    } catch (err: any) {
      showToast('Failed to export CSV: ' + err.message, 'error');
    }
  };

  // Open high-contrast, Swiss-modern printable window that triggers native browser PDF save flow
  const handleExportPDF = () => {
    try {
      const allEntries = useApp().dashboardData?.entries || [];
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('Popup blocked! Please allow popups to print report.', 'error');
        return;
      }

      const rowsHtml = kpis.map(kpi => {
        const kpiEntries = allEntries.filter((e: any) => e.kpiId === kpi.id);
        const sortedEntries = [...kpiEntries].sort((a: any, b: any) => b.date.localeCompare(a.date));
        const latestEntry = sortedEntries[0];
        
        let statusText = 'No Data';
        let statusClass = 'color: #71717a; border-color: #71717a;';
        if (latestEntry && kpi.targetValue !== null) {
          const met = Number(latestEntry.value) >= Number(kpi.targetValue);
          statusText = met ? 'COMPLIANT' : 'NON-COMPLIANT';
          statusClass = met 
            ? 'color: #16a34a; background-color: #f0fdf4; border-color: #16a34a;' 
            : 'color: #dc2626; background-color: #fef2f2; border-color: #dc2626;';
        }

        const entriesRows = sortedEntries.map((e: any) => {
          const val = Number(e.value);
          const target = kpi.targetValue !== null ? Number(kpi.targetValue) : null;
          let varianceHtml = '-';
          if (target !== null) {
            const diff = val - target;
            const sign = diff >= 0 ? '+' : '';
            const color = diff >= 0 ? 'color: #16a34a;' : 'color: #dc2626;';
            varianceHtml = `<span style="font-weight: bold; ${color}">${sign}${diff.toLocaleString()}</span>`;
          }

          return `
            <tr style="border-bottom: 1px solid #e4e4e7;">
              <td style="padding: 10px 12px; font-family: monospace; font-size: 11px;">${e.date}</td>
              <td style="padding: 10px 12px; font-family: monospace; text-align: right; font-weight: bold;">${kpi.unit}${val.toLocaleString()}</td>
              <td style="padding: 10px 12px; font-family: monospace; text-align: right; color: #71717a;">
                ${target !== null ? `${kpi.unit}${target.toLocaleString()}` : '-'}
              </td>
              <td style="padding: 10px 12px; font-family: monospace; text-align: right;">${varianceHtml}</td>
            </tr>
          `;
        }).join('');

        return `
          <div style="margin-bottom: 35px; page-break-inside: avoid; border: 2px solid #18181b; padding: 20px; background-color: #ffffff;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #18181b; padding-bottom: 10px; margin-bottom: 15px;">
              <h3 style="margin: 0; font-size: 15px; font-weight: 900; text-transform: uppercase; font-family: monospace; letter-spacing: -0.01em;">${kpi.name}</h3>
              <span style="font-size: 9px; font-family: monospace; font-weight: bold; letter-spacing: 0.15em; border: 2px solid #18181b; padding: 4px 8px; text-transform: uppercase; ${statusClass}">
                ${statusText}
              </span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background-color: #f4f4f5; border-bottom: 2px solid #18181b; font-family: monospace; font-size: 10px; font-weight: bold;">
                  <th style="padding: 8px 12px; text-align: left; text-transform: uppercase; color: #52525b;">Record Date</th>
                  <th style="padding: 8px 12px; text-align: right; text-transform: uppercase; color: #52525b;">Value</th>
                  <th style="padding: 8px 12px; text-align: right; text-transform: uppercase; color: #52525b;">Target</th>
                  <th style="padding: 8px 12px; text-align: right; text-transform: uppercase; color: #52525b;">Variance</th>
                </tr>
              </thead>
              <tbody>
                ${kpiEntries.length === 0 
                  ? `<tr><td colspan="4" style="padding: 20px; text-align: center; font-style: italic; color: #a1a1aa; font-family: monospace; text-transform: uppercase; font-size: 11px;">No registered performance records found.</td></tr>`
                  : entriesRows
                }
              </tbody>
            </table>
          </div>
        `;
      }).join('');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>KPI Compliance & Trend Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;800;900&display=swap');
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              color: #18181b;
              margin: 40px;
              line-height: 1.5;
              background-color: #ffffff;
            }
            .header {
              border-bottom: 4px solid #18181b;
              padding-bottom: 15px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: -0.02em;
            }
            .header p {
              margin: 5px 0 0 0;
              font-size: 11px;
              font-family: monospace;
              text-transform: uppercase;
              color: #71717a;
              letter-spacing: 0.05em;
            }
            .meta {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-family: monospace;
              margin-bottom: 35px;
              background-color: #f4f4f5;
              padding: 12px;
              border: 2px solid #18181b;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KPI Performance & Compliance Audit Report</h1>
            <p>Enterprise Metric Ledger System</p>
          </div>
          <div class="meta">
            <div><strong>Operator Email:</strong> ${user?.email || 'System Account'}</div>
            <div><strong>Generation Date:</strong> ${new Date().toLocaleString()}</div>
          </div>
          ${rowsHtml}
          <div style="text-align: center; font-family: monospace; font-size: 9px; color: #a1a1aa; margin-top: 50px; text-transform: uppercase; letter-spacing: 0.1em; border-top: 1px solid #e4e4e7; padding-top: 15px;">
            Confidential Document - For Compliance & Regulatory Review Only
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      showToast('Compliance PDF generator opened.', 'success');
    } catch (err: any) {
      showToast('Failed to generate PDF: ' + err.message, 'error');
    }
  };

  // Handle KPI creation
  const handleCreateKPI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKPIName || !newKPIUnit) {
      showToast('Please specify a name and measurement unit', 'error');
      return;
    }

    try {
      const targetVal = newKPITarget ? Number(newKPITarget) : undefined;
      await apiCall('/api/kpis', {
        method: 'POST',
        body: JSON.stringify({
          name: newKPIName,
          unit: newKPIUnit,
          targetValue: targetVal
        })
      });
      showToast('Custom KPI registered successfully!', 'success');
      setNewKPIName('');
      setNewKPIUnit('₹');
      setNewKPITarget('');
      setIsAddingKPI(false);
      fetchKPIs();
      fetchDashboard();
    } catch (err: any) {
      showToast('Failed to create KPI: ' + err.message, 'error');
    }
  };

  // Handle KPI deletion
  const handleDeleteKPI = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this KPI definition? This will erase all historic records.')) return;
    try {
      await apiCall(`/api/kpis/${id}`, { method: 'DELETE' });
      showToast('KPI Definition deleted successfully', 'success');
      if (activeKpiId === id) setActiveKpiId(null);
      fetchKPIs();
      fetchDashboard();
    } catch (err: any) {
      showToast('Deletion failed: ' + err.message, 'error');
    }
  };

  // Handle Logging KPI entries
  const handleLogEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKpiId || !logValue || !logDate) {
      showToast('Please specify date and numerical entry value', 'error');
      return;
    }

    await postKPIEntry(activeKpiId, Number(logValue), logDate);
    setLogValue('');
    setIsLoggingEntry(false);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2 uppercase">
            <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            KPI Performance Manager
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-wider mt-1">
            Establish enterprise metric thresholds, register daily values, and inspect progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Report CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-100 rounded-none text-xs font-black uppercase tracking-wider border-2 border-zinc-900 dark:border-zinc-800 cursor-pointer transition-all active:translate-y-0.5"
            title="Download CSV Compliance Report"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>

          {/* Export Report PDF */}
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-100 rounded-none text-xs font-black uppercase tracking-wider border-2 border-zinc-900 dark:border-zinc-800 cursor-pointer transition-all active:translate-y-0.5"
            title="Print PDF Trend Summary"
          >
            <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Print PDF
          </button>

          {canModifyDefinitions && !isAddingKPI && (
            <button
              onClick={() => setIsAddingKPI(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-none text-xs font-black uppercase tracking-wider transition-colors border-2 border-zinc-900 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add KPI Definition
            </button>
          )}
        </div>
      </div>

      {isClientPortal && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500 text-zinc-900 dark:text-zinc-100 flex items-center gap-3 rounded-none">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-mono uppercase tracking-wide">
            <strong>Client Portal Restricted Mode:</strong> New KPI definition edits and entry logs are restricted to operations and managers.
          </p>
        </div>
      )}

      {/* Adding KPI definition drawer */}
      {isAddingKPI && (
        <form onSubmit={handleCreateKPI} className="p-6 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 space-y-4 shadow-none animate-fade-in">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Create New Custom KPI Definition</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">KPI Metric Name</label>
              <input
                type="text"
                placeholder="e.g. Gross Product Margin, Staff Morale"
                value={newKPIName}
                onChange={e => setNewKPIName(e.target.value)}
                className="w-full p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono uppercase tracking-wide"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Measurement Unit (Symbol)</label>
              <input
                type="text"
                placeholder="e.g. ₹, %, units"
                value={newKPIUnit}
                onChange={e => setNewKPIUnit(e.target.value)}
                className="w-full p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Target Value (Optional)</label>
              <input
                type="number"
                placeholder="e.g. 500000"
                value={newKPITarget}
                onChange={e => setNewKPITarget(e.target.value)}
                className="w-full p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingKPI(false)}
              className="px-4 py-2 rounded-none text-zinc-500 dark:text-zinc-400 text-xs font-black uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-none bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-black uppercase tracking-wider border-2 border-zinc-900 dark:border-zinc-800 cursor-pointer"
            >
              Register Definition
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: KPIs on left, history / logs on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* KPI Definitions lists */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">Active definitions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kpis.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-zinc-400 dark:text-zinc-500 border-2 border-dashed border-zinc-350 dark:border-zinc-700 rounded-none uppercase font-mono text-xs">
                No KPIs defined.
              </div>
            ) : (
              kpis.map((kpi: any) => {
                const isActive = activeKpiId === kpi.id;

                // Calculate drift and threshold status based on user config
                const kpiEntries = allEntries.filter((e: any) => e.kpiId === kpi.id);
                const sortedEntries = [...kpiEntries].sort((a: any, b: any) => b.date.localeCompare(a.date));
                const latestEntry = sortedEntries[0];
                const currentValue = latestEntry ? Number(latestEntry.value) : null;
                const targetValue = kpi.targetValue !== null && kpi.targetValue !== undefined && kpi.targetValue !== "" ? Number(kpi.targetValue) : null;
                
                const alertType = alertSettings[kpi.id] || 'drift';
                let isBreached = false;
                let driftPercentage = 0;
                let breachMessage = '';

                if (targetValue !== null && currentValue !== null) {
                  if (alertType === 'drift') {
                    if (targetValue !== 0) {
                      driftPercentage = (Math.abs(currentValue - targetValue) / Math.abs(targetValue)) * 100;
                      isBreached = driftPercentage > 20;
                      breachMessage = `Drift: ${driftPercentage.toFixed(1)}% (>20% threshold)`;
                    }
                  } else if (alertType === 'below') {
                    isBreached = currentValue < targetValue;
                    if (targetValue !== 0) {
                      driftPercentage = ((targetValue - currentValue) / targetValue) * 100;
                    }
                    breachMessage = `Deficit: -${driftPercentage.toFixed(1)}% (below target)`;
                  } else if (alertType === 'above') {
                    isBreached = currentValue > targetValue;
                    if (targetValue !== 0) {
                      driftPercentage = ((currentValue - targetValue) / targetValue) * 100;
                    }
                    breachMessage = `Surplus: +${driftPercentage.toFixed(1)}% (above target)`;
                  }
                }

                return (
                  <div
                    key={kpi.id}
                    onClick={() => {
                      setActiveKpiId(kpi.id);
                      setIsLoggingEntry(false);
                    }}
                    className={`p-5 rounded-none border-2 cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between ${
                      isBreached
                        ? isActive
                          ? 'bg-rose-500/10 border-rose-600 shadow-none'
                          : 'bg-rose-50/40 dark:bg-rose-950/10 border-rose-500/60 hover:border-rose-600'
                        : isActive 
                          ? 'bg-indigo-500/10 border-indigo-600 shadow-none' 
                          : 'bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-800 hover:border-zinc-600 dark:hover:border-zinc-650'
                    }`}
                  >
                    {/* Visual indicator stripe */}
                    {isBreached && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                    )}
 
                    <div>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1.5 flex-1 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-black text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">{kpi.name}</h3>
                            {isBreached && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black bg-rose-500 text-white uppercase tracking-wider font-mono rounded-none">
                                <AlertTriangle className="h-2.5 w-2.5 animate-pulse" />
                                BREACH
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wide">
                            Unit: {kpi.unit} {kpi.targetValue ? `| Target: ${kpi.unit}${Number(kpi.targetValue).toLocaleString()}` : ''}
                          </p>
  
                          <div className="flex items-center gap-2 mt-1 font-mono text-[11px]">
                            {currentValue !== null ? (
                              <div className="space-y-0.5">
                                <span className="text-zinc-450 dark:text-zinc-500 uppercase text-[9px] block">Current Value</span>
                                <span className={`font-black text-xs ${isBreached ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                  {kpi.unit}{currentValue.toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400 italic text-[10px] uppercase">No logs registered</span>
                            )}
  
                            {isBreached && breachMessage && (
                              <div className="border-l pl-2 border-rose-300 dark:border-rose-900/50 space-y-0.5">
                                <span className="text-rose-500 uppercase text-[9px] block font-black">Status Alert</span>
                                <span className="text-rose-600 dark:text-rose-400 font-black text-[10px] whitespace-nowrap">
                                  {breachMessage}
                                </span>
                              </div>
                            )}
                          </div>
  
                          {/* Target Progress Bar / Indicator */}
                          {targetValue !== null && targetValue !== 0 && (
                            <div className="mt-3 pt-2.5 border-t border-dashed border-zinc-200 dark:border-zinc-800 space-y-1">
                              <div className="flex justify-between items-center text-[9px] font-mono uppercase tracking-wider">
                                <span className="text-zinc-450 dark:text-zinc-500">Target Progress</span>
                                <span className={`font-black ${isBreached ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                  {currentValue !== null ? `${((currentValue / targetValue) * 100).toFixed(1)}%` : '0.0%'}
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
                                <div 
                                  className={`h-full transition-all duration-300 ${isBreached ? 'bg-rose-500' : 'bg-indigo-600 dark:bg-indigo-400'}`}
                                  style={{ width: `${Math.min(100, Math.max(0, currentValue !== null ? (currentValue / targetValue) * 100 : 0))}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Alert Mode Selector dropdown */}
                          {targetValue !== null && (
                            <div className="mt-3 pt-2.5 flex items-center justify-between gap-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-[10px] font-mono">
                              <span className="text-zinc-450 dark:text-zinc-500 uppercase font-black tracking-wider">Alert Type:</span>
                              <select
                                value={alertType}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => saveAlertSetting(kpi.id, e.target.value as any)}
                                className="bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 px-1.5 py-0.5 font-bold uppercase cursor-pointer focus:outline-none text-[9px] text-zinc-800 dark:text-zinc-200"
                              >
                                <option value="drift">20% Drift</option>
                                <option value="below">Below Target</option>
                                <option value="above">Above Target</option>
                              </select>
                            </div>
                          )}
                        </div>
  
                        {canModifyDefinitions && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteKPI(kpi.id);
                            }}
                            className={`p-1.5 rounded-none border transition-colors ${
                              isBreached
                                ? 'text-rose-500 border-rose-200 dark:border-rose-900/50 hover:border-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20'
                                : 'text-zinc-400 hover:text-rose-600 hover:border-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold'
                            }`}
                            title="Delete definition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected KPI details / log panel */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">Postings & History</h2>

          {activeKpiId ? (
            (() => {
              const selectedKpi = kpis.find(k => k.id === activeKpiId);
              if (!selectedKpi) return null;

              const allEntries = useApp().dashboardData?.entries || [];
              const kpiEntries = allEntries.filter((e: any) => e.kpiId === selectedKpi.id);
              const sortedHistoryEntries = [...kpiEntries].sort((a: any, b: any) => b.date.localeCompare(a.date));

              const latestEntry = sortedHistoryEntries[0];
              const currentValue = latestEntry ? Number(latestEntry.value) : null;
              const targetValue = selectedKpi.targetValue !== null && selectedKpi.targetValue !== undefined && selectedKpi.targetValue !== "" ? Number(selectedKpi.targetValue) : null;
              
              let isDrifted = false;
              let driftPercentage = 0;
              if (targetValue !== null && targetValue !== 0 && currentValue !== null) {
                driftPercentage = (Math.abs(currentValue - targetValue) / Math.abs(targetValue)) * 100;
                isDrifted = driftPercentage > 20;
              }

              return (
                <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none p-5 shadow-none space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{selectedKpi.name}</h3>
                      <p className="text-[9px] text-zinc-400 mt-1 uppercase font-mono tracking-widest">
                        ID: {selectedKpi.id.slice(0, 8)} {selectedKpi.targetValue ? `| Target: ${selectedKpi.unit}${Number(selectedKpi.targetValue).toLocaleString()}` : ''}
                      </p>
                    </div>
                    {canModifyDefinitions && !isEditingDefinition && (
                      <button
                        onClick={() => startEditingDefinition(selectedKpi)}
                        className="p-1 border border-zinc-300 hover:border-zinc-900 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                        title="Edit definition name, unit or target"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Edit KPI Definition Inline Form */}
                  {isEditingDefinition && (
                    <form onSubmit={handleUpdateKPI} className="space-y-4 p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-850 animate-fade-in">
                      <h4 className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">Edit KPI Definition</h4>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="w-full p-2.5 border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Unit</label>
                          <input
                            type="text"
                            required
                            value={editUnit}
                            onChange={e => setEditUnit(e.target.value)}
                            className="w-full p-2.5 border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Target Value</label>
                          <input
                            type="number"
                            value={editTarget}
                            onChange={e => setEditTarget(e.target.value)}
                            placeholder="Optional"
                            className="w-full p-2.5 border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingDefinition(false)}
                          className="px-3 py-1.5 rounded-none text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-none bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-black uppercase tracking-wider border-2 border-zinc-900 cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Target Comparison Progress Display */}
                  {targetValue !== null && targetValue !== 0 && (
                    <div className="p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-850 space-y-2.5">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider">
                        <span className="text-zinc-500 dark:text-zinc-450 font-bold">Actual vs Target</span>
                        <span className={`font-black ${isDrifted ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-indigo-650 dark:text-indigo-400'}`}>
                          {currentValue !== null ? `${((currentValue / targetValue) * 100).toFixed(1)}%` : '0.0%'}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 overflow-hidden relative">
                        <div 
                          className={`h-full transition-all duration-300 ${isDrifted ? 'bg-rose-500' : 'bg-indigo-650 dark:bg-indigo-400'}`}
                          style={{ width: `${Math.min(100, Math.max(0, currentValue !== null ? (currentValue / targetValue) * 100 : 0))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-450 dark:text-zinc-500">
                        <span>Current: {currentValue !== null ? `${selectedKpi.unit}${currentValue.toLocaleString()}` : 'None'}</span>
                        <span>Target: {selectedKpi.unit}{targetValue.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Performance Trend Chart */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Performance Trend</h4>
                    <TrendChart entries={kpiEntries} unit={selectedKpi.unit} targetValue={selectedKpi.targetValue} />
                  </div>

                  {/* Log new entry form */}
                  {canLogEntries && !isLoggingEntry && (
                    <button
                      onClick={() => setIsLoggingEntry(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-none text-xs font-black text-zinc-900 dark:text-zinc-200 transition-colors border-2 border-zinc-900 dark:border-zinc-850 uppercase tracking-widest cursor-pointer"
                    >
                      <Plus className="h-4 w-4" /> Log new value
                    </button>
                  )}

                  {isLoggingEntry && (
                    <form onSubmit={handleLogEntry} className="space-y-4 p-4 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-850 animate-fade-in">
                      <h4 className="text-[10px] font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">Log Metric Value</h4>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Value ({selectedKpi.unit})</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={logValue}
                          onChange={e => setLogValue(e.target.value)}
                          placeholder="e.g. 150.5"
                          className="w-full p-2.5 border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">Date</label>
                        <input
                          type="date"
                          required
                          value={logDate}
                          onChange={e => setLogDate(e.target.value)}
                          className="w-full p-2.5 border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono"
                        />
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setIsLoggingEntry(false)}
                          className="px-3 py-1.5 rounded-none text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1.5 rounded-none bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-black uppercase tracking-wider border-2 border-zinc-900 cursor-pointer"
                        >
                          Log Value
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Entry list history summary */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">Ledger History</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {sortedHistoryEntries.length === 0 ? (
                        <p className="text-xs text-zinc-450 italic text-center py-4 uppercase font-mono">No historic records entered.</p>
                      ) : (
                        sortedHistoryEntries.map((entry: any) => (
                          <div key={entry.id} className="flex justify-between items-center text-xs p-2 rounded-none bg-zinc-50 dark:bg-zinc-950 border-2 border-zinc-900 dark:border-zinc-800">
                            <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400 uppercase">{entry.date}</span>
                            <span className="font-mono font-black text-zinc-800 dark:text-zinc-200">
                              {selectedKpi.unit}{entry.value.toLocaleString()}
                              {entry.isSynced === false && (
                                <span className="ml-1 text-[9px] text-amber-500 font-mono font-normal uppercase tracking-wider">Offline</span>
                              )}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none shadow-none text-xs uppercase font-mono tracking-wider">
              Select an active KPI definition from the list to view historical records or log newly tracked values.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

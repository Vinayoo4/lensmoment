import React, { useState } from 'react';
import { useApp } from './AppContext';
import { api } from '../lib/api';
import { Receipt, Search, Filter, Plus, Check, X, Trash2, ShieldAlert, Edit2, Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';

export function getTransactionCategory(description: string): string {
  const desc = description.toLowerCase();
  if (desc.includes('salary') || desc.includes('payroll') || desc.includes('employee') || desc.includes('stipend')) {
    return 'Payroll';
  }
  if (desc.includes('rent') || desc.includes('lease') || desc.includes('office space')) {
    return 'Rent & Lease';
  }
  if (desc.includes('software') || desc.includes('subscription') || desc.includes('saas') || desc.includes('aws') || desc.includes('cloud')) {
    return 'Software SaaS';
  }
  if (desc.includes('invoice') || desc.includes('client') || desc.includes('revenue') || desc.includes('sales') || desc.includes('payment received')) {
    return 'Client Revenue';
  }
  if (desc.includes('marketing') || desc.includes('ads') || desc.includes('advertising') || desc.includes('campaign')) {
    return 'Marketing';
  }
  if (desc.includes('consulting') || desc.includes('advisor') || desc.includes('freelancer') || desc.includes('retainer')) {
    return 'Consulting & Legal';
  }
  if (desc.includes('hardware') || desc.includes('server') || desc.includes('laptop') || desc.includes('asset')) {
    return 'Hardware & Equipments';
  }
  if (desc.includes('utilities') || desc.includes('electricity') || desc.includes('internet') || desc.includes('water')) {
    return 'Office Utilities';
  }
  return 'Others';
}

export const CATEGORIES = [
  'Payroll',
  'Rent & Lease',
  'Software SaaS',
  'Client Revenue',
  'Marketing',
  'Consulting & Legal',
  'Hardware & Equipments',
  'Office Utilities',
  'Others'
];

export const getCategoryColor = (cat: string) => {
  switch(cat) {
    case 'Payroll': return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25';
    case 'Rent & Lease': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25';
    case 'Software SaaS': return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/25';
    case 'Client Revenue': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
    case 'Marketing': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/25';
    case 'Consulting & Legal': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/25';
    case 'Hardware & Equipments': return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/25';
    case 'Office Utilities': return 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/25';
    default: return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/25';
  }
};

export default function TransactionsTab() {
  const { 
    user, 
    transactions, 
    postTransaction, 
    changeTransactionStatus, 
    showToast, 
    fetchTransactions, 
    fetchDashboard 
  } = useApp();

  const { apiCall } = useApp();

  // CSV Import state
  const [isImporting, setIsImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState({
    dateCol: '',
    descCol: '',
    amountCol: '',
    statusCol: ''
  });
  const [importPhase, setImportPhase] = useState<'upload' | 'mapping' | 'validation'>('upload');
  const [validationReport, setValidationReport] = useState<{
    valid: any[];
    invalid: { rowNum: number; error: string; raw: string[] }[];
  }>({ valid: [], invalid: [] });
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Parse CSV Utility
  const parseCSVText = (text: string): string[][] => {
    const result: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentValue.trim());
        result.push(row);
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    if (currentValue || row.length > 0) {
      row.push(currentValue.trim());
      result.push(row);
    }
    return result.filter(r => r.length > 0 && r.some(cell => cell !== ''));
  };

  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        showToast('CSV file is empty.', 'error');
        return;
      }
      
      const parsed = parseCSVText(text);
      if (parsed.length < 2) {
        showToast('CSV must contain a header row and at least one data row.', 'error');
        return;
      }
      
      setCsvFile(file);
      setCsvRows(parsed);
      
      // Auto-mapping headers
      const headers = parsed[0];
      const mappingsObj = {
        dateCol: headers.find(h => /date/i.test(h)) || headers[0] || '',
        descCol: headers.find(h => /desc/i.test(h) || /title/i.test(h) || /name/i.test(h) || /memo/i.test(h)) || headers[1] || '',
        amountCol: headers.find(h => /amount/i.test(h) || /value/i.test(h) || /price/i.test(h) || /sum/i.test(h) || /charge/i.test(h)) || headers[2] || '',
        statusCol: headers.find(h => /status/i.test(h) || /state/i.test(h)) || ''
      };
      setMappings(mappingsObj);
      setImportPhase('mapping');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        handleCsvUpload(file);
      } else {
        showToast('Only CSV files are supported.', 'error');
      }
    }
  };

  const handleRunValidation = () => {
    const headers = csvRows[0];
    const dateIdx = headers.indexOf(mappings.dateCol);
    const descIdx = headers.indexOf(mappings.descCol);
    const amountIdx = headers.indexOf(mappings.amountCol);
    const statusIdx = mappings.statusCol ? headers.indexOf(mappings.statusCol) : -1;

    if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
      showToast('Date, Description, and Amount columns must be mapped.', 'error');
      return;
    }

    const valid: any[] = [];
    const invalid: any[] = [];

    for (let i = 1; i < csvRows.length; i++) {
      const row = csvRows[i];
      const rowNum = i + 1;

      const rawDate = row[dateIdx] || '';
      const rawDesc = row[descIdx] || '';
      const rawAmount = row[amountIdx] || '';
      const rawStatus = statusIdx !== -1 ? (row[statusIdx] || '') : 'unreconciled';

      if (!rawDate) {
        invalid.push({ rowNum, error: 'Missing Date value', raw: row });
        continue;
      }
      if (!rawDesc) {
        invalid.push({ rowNum, error: 'Missing Description value', raw: row });
        continue;
      }
      if (!rawAmount) {
        invalid.push({ rowNum, error: 'Missing Amount value', raw: row });
        continue;
      }

      let formattedDate = rawDate;
      if (rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length === 3) {
          let [p1, p2, p3] = parts;
          if (p1.length === 4) {
            formattedDate = `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
          } else if (p3.length === 4) {
            formattedDate = `${p3}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
          }
        }
      }

      const cleanAmt = rawAmount.replace(/[₹$,\s]/g, '');
      const parsedAmt = Number(cleanAmt);

      if (isNaN(parsedAmt)) {
        invalid.push({ rowNum, error: `Invalid amount format: "${rawAmount}"`, raw: row });
        continue;
      }

      let statusVal: 'reconciled' | 'unreconciled' = 'unreconciled';
      if (rawStatus && /reconcile/i.test(rawStatus)) {
        statusVal = 'reconciled';
      }

      valid.push({
        date: formattedDate,
        description: rawDesc,
        amount: parsedAmt,
        status: statusVal
      });
    }

    setValidationReport({ valid, invalid });
    setImportPhase('validation');
  };

  const handleSubmitImport = async () => {
    if (validationReport.valid.length === 0) {
      showToast('No valid transactions to import.', 'error');
      return;
    }
    setIsSubmittingImport(true);
    try {
      const response = await apiCall('/api/transactions/bulk', {
        method: 'POST',
        body: JSON.stringify({ transactions: validationReport.valid })
      });
      if (response.success) {
        showToast(`Successfully imported ${response.count} financial records!`, 'success');
        setIsImporting(false);
        setCsvFile(null);
        setCsvRows([]);
        setValidationReport({ valid: [], invalid: [] });
        await fetchTransactions();
        await fetchDashboard();
      }
    } catch (err: any) {
      showToast('Import failed: ' + err.message, 'error');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'reconciled' | 'unreconciled'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');

  // New advanced filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [isAddingTx, setIsAddingTx] = useState(false);
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txStatus, setTxStatus] = useState<'reconciled' | 'unreconciled'>('unreconciled');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');

  // Transaction Editing State Variables
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editStatus, setEditStatus] = useState<'reconciled' | 'unreconciled'>('unreconciled');

  const isClientPortal = user?.role === 'Client Portal User';
  const canModifyTxs = user?.role === 'Workspace Admin' || user?.role === 'Financial Manager' || user?.role === 'superadmin';
  const canCreateTxs = user?.role !== 'Client Portal User';

  // Handle transaction creation
  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription || !txAmount || !txDate) {
      showToast('Missing required transaction fields', 'error');
      return;
    }

    const numericAmount = Math.abs(Number(txAmount)) * (txType === 'expense' ? -1 : 1);
    
    await postTransaction({
      description: txDescription,
      amount: numericAmount,
      date: txDate,
      status: txStatus
    });

    setTxDescription('');
    setTxAmount('');
    setTxStatus('unreconciled');
    setIsAddingTx(false);
  };

  // Populate state to initiate editing flow
  const handleEditStart = (tx: any) => {
    setEditingId(tx.id);
    setEditDescription(tx.description);
    setEditAmount(Math.abs(tx.amount).toString());
    setEditDate(tx.date);
    setEditType(tx.amount < 0 ? 'expense' : 'income');
    setEditStatus(tx.status);
  };

  // Submit the transaction updates to backend
  const handleUpdateTx = async (id: string) => {
    if (!editDescription || !editAmount || !editDate) {
      showToast('Missing required transaction fields', 'error');
      return;
    }
    const numericAmount = Math.abs(Number(editAmount)) * (editType === 'expense' ? -1 : 1);
    try {
      await api.transactions.update(id, {
        description: editDescription,
        amount: numericAmount,
        date: editDate,
        status: editStatus
      });
      showToast('Transaction updated successfully', 'success');
      setEditingId(null);
      fetchTransactions();
      fetchDashboard();
    } catch (err: any) {
      showToast('Update failed: ' + err.message, 'error');
    }
  };

  // Handle transaction deletion
  const handleDeleteTx = async (id: string) => {
    if (!window.confirm('Delete this ledger record permanently? This cannot be undone.')) return;
    try {
      await api.transactions.delete(id);
      showToast('Transaction removed successfully', 'success');
      fetchTransactions();
      fetchDashboard();
    } catch (err: any) {
      showToast('Deletion failed: ' + err.message, 'error');
    }
  };

  // Filter computations
  const filteredTxs = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tx.status === statusFilter;
    
    let matchesType = true;
    if (typeFilter === 'income') matchesType = tx.amount > 0;
    else if (typeFilter === 'expense') matchesType = tx.amount < 0;

    // Date Range Filters
    let matchesStartDate = true;
    if (startDate) matchesStartDate = tx.date >= startDate;
    let matchesEndDate = true;
    if (endDate) matchesEndDate = tx.date <= endDate;

    // Category Filter
    let matchesCategory = true;
    if (categoryFilter !== 'all') {
      matchesCategory = getTransactionCategory(tx.description) === categoryFilter;
    }

    return matchesSearch && matchesStatus && matchesType && matchesStartDate && matchesEndDate && matchesCategory;
  });

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2 uppercase">
            <Receipt className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Financial Transactions Ledger
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-wider mt-1">
            Browse corporate cash flows, verify account postings, and synchronize outstandings.
          </p>
        </div>

        {canCreateTxs && !isAddingTx && !isImporting && (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsImporting(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-none text-xs font-black uppercase tracking-wider transition-colors border-2 border-zinc-900 dark:border-zinc-800 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              CSV Bulk Import
            </button>
            <button
              onClick={() => setIsAddingTx(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-none text-xs font-black uppercase tracking-wider transition-colors border-2 border-zinc-900 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="h-4 w-4" />
              Record Transaction
            </button>
          </div>
        )}
      </div>

      {isClientPortal && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500 text-zinc-900 dark:text-zinc-100 flex items-center gap-3 rounded-none">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-mono uppercase tracking-wide">
            <strong>Client Portal Restricted Mode:</strong> New transaction postings, deletions, and active ledger state changes are locked for portal users.
          </p>
        </div>
      )}

      {/* CSV Bulk Import Form Overlay */}
      {isImporting && (
        <div className="p-6 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 space-y-6 shadow-none animate-fade-in">
          <div className="flex justify-between items-center border-b-2 border-zinc-900 dark:border-zinc-850 pb-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
              <h2 className="text-base font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">CSV Secure Bulk Import Engine</h2>
            </div>
            <button
              onClick={() => {
                setIsImporting(false);
                setCsvFile(null);
                setCsvRows([]);
                setImportPhase('upload');
              }}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Phase 1: Upload */}
          {importPhase === 'upload' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-500 font-mono">Upload a spreadsheet export (.csv) containing date, amount, and description headers.</p>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-4 border-dashed p-10 flex flex-col items-center justify-center text-center gap-4 transition-all rounded-none cursor-pointer ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-500/5' 
                    : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-700'
                }`}
                onClick={() => document.getElementById('csvFileInput')?.click()}
              >
                <Upload className="h-10 w-10 text-zinc-400 dark:text-zinc-600" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Drag & Drop your CSV file here</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-1">or click to browse local files (max 5MB)</p>
                </div>
                <input
                  type="file"
                  id="csvFileInput"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleCsvUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Phase 2: Column Mapping */}
          {importPhase === 'mapping' && csvRows.length > 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 font-mono">Step 2: Map Headers</h3>
                <p className="text-xs text-zinc-500 font-mono mt-1">Align the columns of uploaded file <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">({csvFile?.name})</span> with standard ledger fields.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-zinc-50 dark:bg-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800">
                {/* Date Col */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Date (Required)</label>
                  <select
                    value={mappings.dateCol}
                    onChange={(e) => setMappings({ ...mappings, dateCol: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 text-xs font-mono"
                  >
                    <option value="">-- Select Column --</option>
                    {csvRows[0].map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Description Col */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Description (Required)</label>
                  <select
                    value={mappings.descCol}
                    onChange={(e) => setMappings({ ...mappings, descCol: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 text-xs font-mono"
                  >
                    <option value="">-- Select Column --</option>
                    {csvRows[0].map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Amount Col */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Amount (Required)</label>
                  <select
                    value={mappings.amountCol}
                    onChange={(e) => setMappings({ ...mappings, amountCol: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 text-xs font-mono"
                  >
                    <option value="">-- Select Column --</option>
                    {csvRows[0].map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {/* Status Col */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Status (Optional)</label>
                  <select
                    value={mappings.statusCol}
                    onChange={(e) => setMappings({ ...mappings, statusCol: e.target.value })}
                    className="w-full p-2 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 text-xs font-mono"
                  >
                    <option value="">-- Default to Unreconciled --</option>
                    {csvRows[0].map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Data Preview */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400">File Contents Sample (First 3 Rows)</h4>
                <div className="border border-zinc-200 dark:border-zinc-800 overflow-x-auto">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="bg-zinc-100 dark:bg-zinc-950 text-zinc-500">
                      <tr>
                        {csvRows[0].map((h, idx) => <th key={idx} className="p-2 border-r last:border-0 border-zinc-200 dark:border-zinc-800">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(1, 4).map((row, rIdx) => (
                        <tr key={rIdx} className="border-t border-zinc-200 dark:border-zinc-800">
                          {row.map((cell, cIdx) => <td key={cIdx} className="p-2 border-r last:border-0 border-zinc-200 dark:border-zinc-800 truncate max-w-[200px]">{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCsvFile(null);
                    setCsvRows([]);
                    setImportPhase('upload');
                  }}
                  className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-300 border-2 border-zinc-900 dark:border-zinc-800 text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Clear File
                </button>
                <button
                  type="button"
                  onClick={handleRunValidation}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 border-2 border-zinc-900 dark:border-zinc-100 text-xs font-black uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  Validate Columns & Data
                </button>
              </div>
            </div>
          )}

          {/* Phase 3: Validation and Confirmation */}
          {importPhase === 'validation' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 font-mono">Step 3: Validation Review</h3>
                <p className="text-xs text-zinc-500 font-mono mt-1">Audit verification results before committing records to the global database.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Valid Count */}
                <div className="p-4 border-2 border-emerald-500 bg-emerald-500/5 space-y-1">
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{validationReport.valid.length}</div>
                  <div className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider">Valid Entries Ready for Ledger Import</div>
                </div>

                {/* Invalid Count */}
                <div className={`p-4 border-2 space-y-1 ${validationReport.invalid.length > 0 ? 'border-rose-500 bg-rose-500/5' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-855 dark:bg-zinc-950'}`}>
                  <div className={`text-2xl font-black font-mono ${validationReport.invalid.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-400'}`}>
                    {validationReport.invalid.length}
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-wider ${validationReport.invalid.length > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-zinc-400'}`}>
                    Anomalous / Formatted Errors Skipped
                  </div>
                </div>
              </div>

              {/* Error logs if any */}
              {validationReport.invalid.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    <span>Rejected Row Specifications ({validationReport.invalid.length})</span>
                  </h4>
                  <div className="border-2 border-rose-500/30 max-h-32 overflow-y-auto bg-rose-500/5 font-mono text-[10px] divide-y divide-rose-500/10">
                    {validationReport.invalid.map((inv, idx) => (
                      <div key={idx} className="p-2 text-rose-700 dark:text-rose-400">
                        <span className="font-black">Row {inv.rowNum}:</span> {inv.error} <span className="text-zinc-400 italic">({inv.raw.join(',')})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview valid rows to import */}
              {validationReport.valid.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Valid Records Sample</h4>
                  <div className="border border-zinc-200 dark:border-zinc-800 max-h-44 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-zinc-150 dark:bg-zinc-950 text-zinc-500 sticky top-0 border-b-2 border-zinc-900 dark:border-zinc-800">
                        <tr>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800">Date</th>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800">Description</th>
                          <th className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right">Amount</th>
                          <th className="p-2 border-zinc-200 dark:border-zinc-800">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {validationReport.valid.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                            <td className="p-2 border-r border-zinc-200 dark:border-zinc-800">{row.date}</td>
                            <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 truncate max-w-[250px]">{row.description}</td>
                            <td className="p-2 border-r border-zinc-200 dark:border-zinc-800 text-right font-bold">₹{Math.abs(row.amount).toLocaleString('en-IN')}</td>
                            <td className={`p-2 font-black text-[9px] uppercase ${row.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {row.amount < 0 ? 'Expense' : 'Income'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {validationReport.valid.length > 10 && (
                    <p className="text-[9px] text-zinc-400 font-mono italic">Showing first 10 of {validationReport.valid.length} valid rows.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setImportPhase('mapping')}
                  className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-300 border-2 border-zinc-900 dark:border-zinc-800 text-xs font-black uppercase tracking-wider cursor-pointer"
                >
                  Adjust Mappings
                </button>
                <button
                  type="button"
                  disabled={validationReport.valid.length === 0 || isSubmittingImport}
                  onClick={handleSubmitImport}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border-2 border-indigo-600 text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  {isSubmittingImport ? 'Importing Ledger Records...' : `Upload ${validationReport.valid.length} Valid Records`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record transaction form overlay */}
      {isAddingTx && (
        <form onSubmit={handleCreateTx} className="p-6 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 space-y-4 shadow-none animate-fade-in">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Log New Financial Transaction</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Description</label>
              <input
                type="text"
                required
                placeholder="e.g. Acme Corp Consultant Retainer"
                value={txDescription}
                onChange={e => setTxDescription(e.target.value)}
                className="w-full p-3 rounded-none border-2 border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTxType('expense')}
                  className={`py-3 rounded-none text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    txType === 'expense'
                      ? 'bg-rose-500/20 text-rose-600 border-rose-600 dark:text-rose-400'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-900 dark:border-zinc-850 text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  Debit (Outflow)
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('income')}
                  className={`py-3 rounded-none text-xs font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    txType === 'income'
                      ? 'bg-emerald-500/20 text-emerald-600 border-emerald-600 dark:text-emerald-400'
                      : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-900 dark:border-zinc-850 text-zinc-500 hover:bg-zinc-100'
                  }`}
                >
                  Credit (Inflow)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Amount (₹)</label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                placeholder="0.00"
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                className="w-full p-3 rounded-none border-2 border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono font-black"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Date</label>
              <input
                type="date"
                required
                value={txDate}
                onChange={e => setTxDate(e.target.value)}
                className="w-full p-3 rounded-none border-2 border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900 text-xs focus:outline-none dark:text-zinc-100 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t-2 border-zinc-900 dark:border-zinc-800 pt-4 gap-4">
            <div className="flex items-center gap-4">
              <label className="text-[10px] text-zinc-450 uppercase font-black tracking-widest">Initial Reconciliation Status:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTxStatus('unreconciled')}
                  className={`px-3 py-1.5 rounded-none text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border-2 ${
                    txStatus === 'unreconciled' 
                      ? 'bg-amber-500/20 text-amber-600 border-amber-500 dark:text-amber-400' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-100 dark:border-zinc-800'
                  }`}
                >
                  Unreconciled
                </button>
                <button
                  type="button"
                  onClick={() => setTxStatus('reconciled')}
                  className={`px-3 py-1.5 rounded-none text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border-2 ${
                    txStatus === 'reconciled' 
                      ? 'bg-emerald-500/20 text-emerald-600 border-emerald-500 dark:text-emerald-400' 
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-100 dark:border-zinc-800'
                  }`}
                >
                  Reconciled
                </button>
              </div>
            </div>

            <div className="flex gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsAddingTx(false)}
                className="px-4 py-2 rounded-none text-zinc-500 dark:text-zinc-400 text-xs font-black uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-none bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-black uppercase tracking-wider border-2 border-zinc-900 cursor-pointer"
              >
                Log Ledger Entry
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-4 p-4 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 shadow-none">
        {/* Row 1: Search and Type/Status Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search transactions description..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-none bg-zinc-50/50 dark:bg-zinc-900/50 border-2 border-zinc-900 dark:border-zinc-800 text-xs focus:outline-none dark:text-zinc-100 uppercase tracking-wide font-mono"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0">
            <div className="flex items-center gap-1.5 px-3 border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 rounded-none">
              <Filter className="h-3.5 w-3.5 text-zinc-400 animate-pulse" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="text-xs font-black uppercase tracking-wider bg-transparent border-none text-zinc-700 dark:text-zinc-350 focus:outline-none py-2 cursor-pointer"
              >
                <option value="all" className="dark:bg-zinc-900">All Reconciled States</option>
                <option value="reconciled" className="dark:bg-zinc-900">Reconciled</option>
                <option value="unreconciled" className="dark:bg-zinc-900">Unreconciled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 px-3 border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 rounded-none">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="text-xs font-black uppercase tracking-wider bg-transparent border-none text-zinc-700 dark:text-zinc-350 focus:outline-none py-2 cursor-pointer"
              >
                <option value="all" className="dark:bg-zinc-900">All Flows</option>
                <option value="income" className="dark:bg-zinc-900">Credits (Inflow)</option>
                <option value="expense" className="dark:bg-zinc-900">Debits (Outflow)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Advanced Category & Date Range filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t-2 border-zinc-100 dark:border-zinc-800">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2 border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 px-3 py-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 font-mono">Category:</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs font-black uppercase bg-transparent border-none text-zinc-700 dark:text-zinc-350 focus:outline-none flex-1 cursor-pointer"
            >
              <option value="all" className="dark:bg-zinc-900">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="dark:bg-zinc-900">{cat}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-2 border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 px-3 py-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 font-mono whitespace-nowrap">From:</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-xs font-mono uppercase bg-transparent border-none text-zinc-700 dark:text-zinc-350 focus:outline-none flex-1 cursor-pointer"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-2 border-2 border-zinc-900 bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 px-3 py-1.5">
            <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400 font-mono whitespace-nowrap">To:</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="text-xs font-mono uppercase bg-transparent border-none text-zinc-700 dark:text-zinc-350 focus:outline-none flex-1 cursor-pointer"
            />
          </div>

          {/* Clear Filters Button */}
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setTypeFilter('all');
              setCategoryFilter('all');
              setStartDate('');
              setEndDate('');
            }}
            className="text-[10px] font-black uppercase font-mono tracking-wider border-2 border-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 py-1.5 px-3 transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 text-zinc-900 dark:text-zinc-100"
          >
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Dense Ledger Table */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none shadow-none overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b-2 border-zinc-900 dark:border-zinc-800 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-center">Status</th>
                {!isClientPortal && <th className="py-4 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-zinc-100 dark:divide-zinc-800 text-xs">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-zinc-500 dark:text-zinc-400 italic uppercase font-mono tracking-wider">
                    No matching transactions registered on this workspace tenant.
                  </td>
                </tr>
              ) : (
                filteredTxs.map(tx => {
                  const isEditing = tx.id === editingId;
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-colors">
                      {isEditing ? (
                        <>
                          <td className="py-2 px-4 whitespace-nowrap">
                            <input
                              type="date"
                              value={editDate}
                              onChange={e => setEditDate(e.target.value)}
                              className="p-1 rounded-none border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs font-mono w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={editDescription}
                              onChange={e => setEditDescription(e.target.value)}
                              className="p-1 rounded-none border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs font-mono uppercase w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 text-zinc-900 dark:text-white"
                            />
                          </td>
                          <td className="py-2 px-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1">
                              <select
                                value={editType}
                                onChange={e => setEditType(e.target.value as any)}
                                className="p-1 rounded-none border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs focus:outline-none text-zinc-900 dark:text-white"
                              >
                                <option value="expense">Debit</option>
                                <option value="income">Credit</option>
                              </select>
                              <input
                                type="number"
                                step="any"
                                value={editAmount}
                                onChange={e => setEditAmount(e.target.value)}
                                className="p-1 rounded-none border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs font-mono font-black w-24 focus:outline-none text-right text-zinc-900 dark:text-white"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-4 text-center whitespace-nowrap">
                            <select
                              value={editStatus}
                              onChange={e => setEditStatus(e.target.value as any)}
                              className="p-1 rounded-none border-2 border-zinc-900 bg-white dark:bg-zinc-900 text-xs focus:outline-none text-zinc-900 dark:text-white"
                            >
                              <option value="reconciled">Reconciled</option>
                              <option value="unreconciled">Unreconciled</option>
                            </select>
                          </td>
                          <td className="py-2 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleUpdateTx(tx.id)}
                                className="p-1.5 rounded-none border-2 border-zinc-900 bg-emerald-500/15 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/25 transition-all cursor-pointer"
                                title="Save changes"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 rounded-none border-2 border-zinc-900 bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 transition-all cursor-pointer"
                                title="Cancel editing"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-6 font-mono text-xs text-zinc-500 dark:text-zinc-450 whitespace-nowrap uppercase">
                            {tx.date}
                          </td>
                          <td className="py-4 px-6 font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{tx.description}</span>
                              <span className={`inline-block text-[9px] font-mono px-2 py-0.5 border font-black uppercase tracking-wider ${getCategoryColor(getTransactionCategory(tx.description))}`}>
                                {getTransactionCategory(tx.description)}
                              </span>
                              {tx.id.toString().startsWith('optimistic_') && (
                                <span className="inline-block text-[9px] font-mono bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-none border border-amber-500">
                                  Offline
                                </span>
                              )}
                            </div>
                          </td>
                          <td className={`py-4 px-6 text-right font-mono font-black whitespace-nowrap ${
                            tx.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {tx.amount < 0 ? '-' : '+'}₹{Math.abs(tx.amount).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none text-[10px] font-black uppercase tracking-widest leading-none border-2 border-zinc-900 ${
                              tx.status === 'reconciled' 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-none ${tx.status === 'reconciled' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {tx.status}
                            </span>
                          </td>
                          {!isClientPortal && (
                            <td className="py-4 px-6 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                {/* Quick Reconciliation Status Toggle */}
                                <button
                                  onClick={() => changeTransactionStatus(tx.id, tx.status === 'reconciled' ? 'unreconciled' : 'reconciled')}
                                  className={`p-1.5 rounded-none border-2 border-zinc-900 transition-all cursor-pointer ${
                                    tx.status === 'reconciled'
                                      ? 'bg-rose-500/15 text-rose-600 hover:bg-rose-500/25'
                                      : 'bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25'
                                  }`}
                                  title={tx.status === 'reconciled' ? 'Mark as Unreconciled' : 'Mark as Reconciled'}
                                >
                                  {tx.status === 'reconciled' ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                                </button>
    
                                {/* Edit Transaction */}
                                {canModifyTxs && (
                                  <button
                                    onClick={() => handleEditStart(tx)}
                                    className="p-1.5 rounded-none border-2 border-zinc-900 text-zinc-550 dark:text-zinc-350 hover:text-indigo-600 hover:bg-indigo-500/10 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                                    title="Edit transaction"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
    
                                {/* Delete Transaction */}
                                {canModifyTxs && (
                                  <button
                                    onClick={() => handleDeleteTx(tx.id)}
                                    className="p-1.5 rounded-none border-2 border-zinc-900 text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:bg-rose-900/30 transition-colors cursor-pointer"
                                    title="Delete transaction record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useApp } from './AppContext';
import { FileText, Sparkles, Plus, Calendar, ShieldAlert, Download } from 'lucide-react';

// A lightweight, 100% robust zero-dependency Markdown parser using safe regex replacements
function renderMarkdown(md: string) {
  if (!md) return '';
  let html = md;

  // Headers: # Header
  html = html.replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-black text-zinc-950 dark:text-zinc-50 mt-6 mb-3 border-b-2 border-zinc-900 dark:border-zinc-800 pb-2 tracking-tight uppercase">$1</h1>');
  // Subheaders: ## Sub
  html = html.replace(/^##\s+(.+)$/gm, '<h2 class="text-lg font-black text-zinc-900 dark:text-zinc-100 mt-5 mb-2 uppercase tracking-wide">$1</h2>');
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-zinc-950 dark:text-white">$1</strong>');
  // Unordered list items: * item
  html = html.replace(/^\*\s+(.+)$/gm, '<li class="ml-4 list-disc text-zinc-700 dark:text-zinc-300 mt-1 uppercase font-mono text-xs">$1</li>');
  // Newlines to line breaks
  html = html.replace(/\n/g, '<br/>');

  return <div dangerouslySetInnerHTML={{ __html: html }} className="space-y-1 text-sm text-zinc-750 dark:text-zinc-300 leading-relaxed font-sans" />;
}

export default function ReportsTab() {
  const { user, reports, createReport, isLoading } = useApp();
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportTitle, setReportTitle] = useState('');

  const isClientPortal = user?.role === 'Client Portal User';

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle) return;

    await createReport(reportTitle);
    setReportTitle('');
    setIsGenerating(false);
  };

  const selectedReport = reports.find(r => r.id === activeReportId);

  const handleExportCSV = () => {
    if (!selectedReport) return;
    
    const lines = selectedReport.content.split('\n');
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    csvContent += `"Report Parameter","Value"\r\n`;
    csvContent += `"Report Title","${selectedReport.title.replace(/"/g, '""')}"\r\n`;
    csvContent += `"Report Date","${new Date(selectedReport.createdAt).toLocaleString().replace(/"/g, '""')}"\r\n`;
    csvContent += `\r\n`;
    csvContent += `"Line Detail"\r\n`;

    lines.forEach((line) => {
      if (line.trim()) {
        const cleanedLine = line.replace(/^\*\s+/g, '').replace(/\*\*/g, '').trim();
        csvContent += `"${cleanedLine.replace(/"/g, '""')}"\r\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReport.title.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2 uppercase">
            <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Workspace Reports & Intelligence
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono uppercase tracking-wider mt-1">
            Generate executive summaries, review historical analytics digests, and inspect BI records.
          </p>
        </div>

        {!isClientPortal && !isGenerating && (
          <button
            onClick={() => setIsGenerating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-none text-xs font-black uppercase tracking-wider transition-colors border-2 border-zinc-900 cursor-pointer shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            Generate Intelligence Digest
          </button>
        )}
      </div>

      {isClientPortal && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500 text-zinc-900 dark:text-zinc-100 flex items-center gap-3 rounded-none">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <p className="text-xs font-mono uppercase tracking-wide">
            <strong>Client Portal Restricted Mode:</strong> Access to generate custom financial summaries is limited. You are granted full access to read completed reports.
          </p>
        </div>
      )}

      {/* Generating Form modal/overlay */}
      {isGenerating && (
        <form onSubmit={handleGenerateReport} className="p-6 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 space-y-4 shadow-none animate-fade-in max-w-xl">
          <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5 uppercase tracking-wide">
            <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
            Specify Digest Title
          </h2>
          <p className="text-xs text-zinc-500 uppercase font-mono tracking-wide leading-relaxed">
            Quantify AI's analytics engine will aggregate all active workspace KPIs, target metrics, unreconciled discrepant balances, and log statements to compose a formatted executive Markdown brief.
          </p>
          <div>
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Report Document Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Q3 Fiscal Performance Brief"
              value={reportTitle}
              onChange={e => setReportTitle(e.target.value)}
              className="w-full p-3 rounded-none border-2 border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900 text-sm focus:outline-none dark:text-zinc-100 font-mono uppercase"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsGenerating(false)}
              className="px-4 py-2 rounded-none text-zinc-500 dark:text-zinc-400 text-xs font-black uppercase tracking-wider hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-none bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-black uppercase tracking-wider border-2 border-zinc-900 cursor-pointer"
            >
              {isLoading ? 'Compiling statistics...' : 'Compile & Generate Report'}
            </button>
          </div>
        </form>
      )}

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Reports Archive List */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight uppercase">Reports Archive</h2>
          <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none p-4 shadow-none divide-y-2 divide-zinc-150/40 dark:divide-zinc-800 max-h-[500px] overflow-y-auto">
            {reports.length === 0 ? (
              <p className="text-xs text-zinc-400 italic text-center py-8 uppercase font-mono tracking-wider">
                No historical intelligence reports compiled for this workspace. Click the top-right button to generate your first summary.
              </p>
            ) : (
              reports.map(r => {
                const isActive = r.id === activeReportId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveReportId(r.id)}
                    className={`w-full text-left py-4 px-3 rounded-none transition-all flex items-start gap-3 border-2 cursor-pointer ${
                      isActive 
                        ? 'bg-indigo-50/10 border-indigo-500 text-indigo-950 dark:text-white shadow-none' 
                        : 'border-transparent text-zinc-700 hover:bg-zinc-50/50 dark:text-zinc-300 dark:hover:bg-zinc-900/30'
                    }`}
                  >
                    <FileText className={`h-5 w-5 shrink-0 mt-0.5 ${isActive ? 'text-indigo-600' : 'text-zinc-400'}`} />
                    <div className="truncate">
                      <p className="font-black text-xs uppercase tracking-tight truncate">{r.title}</p>
                      <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono mt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detailed Report Reader */}
        <div className="lg:col-span-2">
          {selectedReport ? (
            <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none p-8 shadow-none space-y-6">
              <div className="flex items-center justify-between border-b-2 pb-4 border-zinc-900 dark:border-zinc-800">
                <div>
                  <h3 className="font-black text-xl text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">{selectedReport.title}</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-1">Compiled: {new Date(selectedReport.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-zinc-900 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-black uppercase font-mono cursor-pointer text-zinc-900 dark:text-zinc-200"
                    title="Export report as CSV"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export CSV</span>
                  </button>
                  <div className="h-10 w-10 rounded-none bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border-2 border-indigo-500">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Renders beautifully parsed custom markdown structure */}
              <div className="prose dark:prose-invert max-w-none">
                {renderMarkdown(selectedReport.content)}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 rounded-none shadow-none text-center p-8 text-zinc-400 dark:text-zinc-500">
              <FileText className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-3" />
              <p className="text-sm font-black text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">No report selected</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto font-mono uppercase tracking-wide">Click on any compiled summary in the historical archive directory on the left to view financial details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

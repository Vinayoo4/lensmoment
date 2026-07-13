import React from 'react';
import { useApp } from './AppContext';
import { useTheme } from './ThemeContext';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Receipt, 
  Scale, 
  FileText, 
  ShieldAlert, 
  LogOut, 
  Sun, 
  Moon, 
  Wifi, 
  WifiOff, 
  User as UserIcon,
  CloudLightning
} from 'lucide-react';

export default function Sidebar() {
  const { user, activeTab, setActiveTab, logout, isOnline, offlineQueue, failedQueue, currentWorkspace } = useApp();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const totalPending = offlineQueue.length;
  const totalFailed = failedQueue.length;

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Workspace Admin', 'Financial Manager', 'Operations Staff', 'Client Portal User', 'superadmin'] },
    { id: 'kpis', name: 'KPIs', icon: TrendingUp, roles: ['Workspace Admin', 'Financial Manager', 'Operations Staff', 'Client Portal User', 'superadmin'] },
    { id: 'transactions', name: 'Transactions', icon: Receipt, roles: ['Workspace Admin', 'Financial Manager', 'Operations Staff', 'Client Portal User', 'superadmin'] },
    { id: 'reconciliation', name: 'Reconciliation', icon: Scale, roles: ['Workspace Admin', 'Financial Manager', 'Operations Staff', 'Client Portal User', 'superadmin'] },
    { id: 'reports', name: 'Intelligence Reports', icon: FileText, roles: ['Workspace Admin', 'Financial Manager', 'Operations Staff', 'Client Portal User', 'superadmin'] },
    { id: 'settings', name: 'Settings / Profile', icon: UserIcon, roles: ['Workspace Admin', 'Financial Manager', 'Operations Staff', 'Client Portal User', 'superadmin'] },
    { id: 'admin', name: 'Superadmin Portal', icon: ShieldAlert, roles: ['superadmin'] }
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-80 bg-zinc-50 dark:bg-zinc-950 border-r-2 border-zinc-900 dark:border-zinc-800 flex flex-col justify-between h-screen sticky top-0 font-sans">
      {/* Brand Header */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-none bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center border-2 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-950 font-mono font-black text-xl">
            Q
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 font-sans uppercase">
              Quantify AI
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-zinc-500 font-bold">
              Enterprise BI
            </p>
          </div>
        </div>

        {/* Tenant Information Badge */}
        <div className="mt-6 p-4 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800">
          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-[0.2em] font-bold">
            Workspace Tenant
          </div>
          <div className="font-black text-sm text-zinc-900 dark:text-zinc-200 truncate mt-1">
            {user.role === 'superadmin' ? 'Global Administration' : currentWorkspace?.name || 'My Business Workspace'}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            {user.role}
          </div>

          {user.role !== 'superadmin' && currentWorkspace && (
            <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800/60 text-[10px] font-mono space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Subscription:</span>
                <span className={`px-1.5 py-0.5 font-bold uppercase text-[9px] ${
                  currentWorkspace.subscriptionExpiresAt && currentWorkspace.subscriptionExpiresAt < '2026-07-13'
                    ? 'bg-rose-500/15 text-rose-600 border border-rose-500/30 animate-pulse'
                    : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                }`}>
                  {currentWorkspace.subscriptionExpiresAt && currentWorkspace.subscriptionExpiresAt < '2026-07-13' ? 'Lapsed' : 'Active'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Plan Pack:</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300 uppercase">
                  {currentWorkspace.subscriptionPlan === '1_year' ? '1 Year Pack' : currentWorkspace.subscriptionPlan === '6_months' ? '6 Month Pack' : currentWorkspace.subscriptionPlan === 'free' ? '30d Trial' : 'None'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Valid Until:</span>
                <span className="font-bold text-zinc-500 dark:text-zinc-400">{currentWorkspace.subscriptionExpiresAt || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
        {filteredItems.map(item => {
          const Icon = item.icon;
          const isSelected = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-none text-xs font-black tracking-widest uppercase transition-all duration-150 group border-2 ${
                isSelected 
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 shadow-[4px_4px_0px_0px_rgba(99,102,241,1)]' 
                  : 'text-zinc-700 dark:text-zinc-400 border-transparent hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`} />
                <span>{item.name}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Sync Ledger & Profile footer */}
      <div className="p-4 border-t-2 border-zinc-900 dark:border-zinc-800 space-y-4">
        {/* Offline Sync State Badge */}
        <div className="flex items-center justify-between p-3 rounded-none bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-emerald-500 animate-pulse" />
            ) : (
              <WifiOff className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              {isOnline ? 'ONLINE SYNC' : 'OFFLINE MODE'}
            </span>
          </div>

          {/* Pending operations counter */}
          {(totalPending > 0 || totalFailed > 0) && (
            <div className="flex gap-1">
              {totalPending > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-none text-[9px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {totalPending} PND
                </span>
              )}
              {totalFailed > 0 && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-none text-[9px] font-bold font-mono bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {totalFailed} ERR
                </span>
              )}
            </div>
          )}
        </div>

        {/* Theme + Profile Controls */}
        <div className="flex items-center justify-between gap-2">
          {/* User profile card */}
          <div className="flex items-center gap-3 truncate">
            <div className="h-9 w-9 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-300">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-black text-zinc-900 dark:text-zinc-200 truncate uppercase">
                {user.name}
              </div>
              <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono truncate">
                ID: {user.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-none border-2 border-transparent hover:border-zinc-900 dark:hover:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 rounded-none border-2 border-transparent hover:border-rose-600 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-600 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

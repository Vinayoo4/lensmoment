import React, { useState } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { AppProvider, useApp } from './components/AppContext';
import Sidebar from './components/Sidebar';
import DashboardTab from './components/DashboardTab';
import KPIsTab from './components/KPIsTab';
import TransactionsTab from './components/TransactionsTab';
import ReconciliationTab from './components/ReconciliationTab';
import ReportsTab from './components/ReportsTab';
import AdminTab from './components/AdminTab';
import SettingsTab from './components/SettingsTab';
import { Shield, Sparkles, LogIn, Key, Compass } from 'lucide-react';

function AppContent() {
  const { user, login, registerUser, activeTab, isLoading, currentWorkspace, renewSubscription, logout } = useApp();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'Workspace Admin' | 'Financial Manager' | 'Operations Staff' | 'Client Portal User'>('Workspace Admin');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Quick click handler to prefill credentials
  const fillDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsRegistering(false);
    setLoginError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (isRegistering) {
      if (!name || !email) {
        setLoginError('Please specify name and email');
        return;
      }
      const success = await registerUser(name, email, role);
      if (success) {
        // Registered and automatically logged in
      } else {
        setLoginError('Registration failed. Email might already be registered.');
      }
    } else {
      if (!email || !password) {
        setLoginError('Please specify email and password');
        return;
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
          setLoginError(data.error || 'Login failed');
          return;
        }
        login(data.token, data.user);
      } catch (err: any) {
        setLoginError('Failed to connect to authentication server: ' + err.message);
      }
    }
  };

  // If user is unauthenticated, render the Login/Registration layout
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col lg:flex-row justify-center items-stretch font-sans transition-colors duration-200">
        {/* Left Hero side */}
        <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 dark:bg-zinc-900 text-zinc-100 p-16 flex-col justify-between relative overflow-hidden border-r-4 border-zinc-900">
          <div className="z-10">
            <div className="h-12 w-12 rounded-none bg-zinc-100 text-zinc-900 flex items-center justify-center font-mono font-black text-2xl border-2 border-zinc-900">
              Q
            </div>
            <h2 className="text-5xl font-black tracking-tight mt-16 leading-none max-w-lg uppercase">
              Empower your ledger with rules-based business intelligence.
            </h2>
            <p className="text-zinc-400 text-sm mt-6 leading-relaxed max-w-md">
              Quantify AI integrates KPI logs, offline outstandings, and custom compliance rule evaluations into a high-fidelity B2B SaaS dashboard.
            </p>
          </div>

          <div className="z-10 flex items-center gap-2 text-xs text-zinc-400 font-mono tracking-wider uppercase">
            <Compass className="h-4 w-4 animate-spin-slow text-indigo-400" />
            <span>Quantify AI — Built for High-Performance Finance Teams</span>
          </div>
        </div>

        {/* Right Form side */}
        <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 bg-white dark:bg-zinc-950 overflow-y-auto">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                {isRegistering ? 'Provision Workspace' : 'Sign In To Quantify'}
              </h2>
              <p className="text-zinc-400 mt-2 text-xs font-mono uppercase tracking-wider">
                {isRegistering ? 'Create a new multi-tenant space and administrator.' : 'Enter your credentials to access your company dashboard.'}
              </p>
            </div>

            {/* Error notifications */}
            {loginError && (
              <div className="p-4 rounded-none border-2 border-rose-600 bg-rose-500/10 text-rose-800 dark:text-rose-400 text-xs font-black leading-relaxed">
                ✕ {loginError}
              </div>
            )}

            {/* Authentications Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vinay Verma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-zinc-50"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Corporate Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-zinc-50"
                />
              </div>

              {!isRegistering && (
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:bg-zinc-50"
                  />
                </div>
              )}

              {isRegistering && (
                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Initial Administrative Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 text-sm font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="Workspace Admin">Workspace Admin (Full access)</option>
                    <option value="Financial Manager">Financial Manager (Ledger / KPIs)</option>
                    <option value="Operations Staff">Operations Staff (Log metrics / Txs)</option>
                    <option value="Client Portal User">Client Portal User (Read-only)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 hover:text-white border-2 border-zinc-900 dark:border-zinc-100 rounded-none text-xs font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(99,102,241,1)] cursor-pointer"
              >
                <LogIn className="h-4 w-4" />
                {isLoading ? 'Processing account...' : isRegistering ? 'Create Administrative Account' : 'Sign In to Ledger'}
              </button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setLoginError(null);
                }}
                className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
              >
                {isRegistering ? 'Already have an account? Sign in' : 'Register a new tenant company workspace'}
              </button>
            </div>

            {/* Preseeded Demo credentials quick access panel */}
            <div className="p-5 rounded-none bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                <Key className="h-3.5 w-3.5 text-indigo-500" />
                Seeded Demo Accs (Fast Testing)
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                The database is seeded with known test roles. Click any to prefill credentials:
              </p>
              
              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin@acme.com', 'admin123')}
                  className="flex items-center justify-between p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-left text-xs transition-colors"
                >
                  <div>
                    <div className="font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-200">Workspace Admin</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">admin@acme.com / admin123</div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 px-1.5 py-0.5 rounded-none border border-zinc-900">Acme Corp</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoCredentials('finance@acme.com', 'finance123')}
                  className="flex items-center justify-between p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-left text-xs transition-colors"
                >
                  <div>
                    <div className="font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-200">Financial Manager</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">finance@acme.com / finance123</div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 px-1.5 py-0.5 rounded-none border border-zinc-900">Acme Corp</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoCredentials('ops@acme.com', 'ops123')}
                  className="flex items-center justify-between p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-left text-xs transition-colors"
                >
                  <div>
                    <div className="font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-200">Operations Staff</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">ops@acme.com / ops123</div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 px-1.5 py-0.5 rounded-none border border-zinc-900">Acme Corp</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoCredentials('client@acme.com', 'client123')}
                  className="flex items-center justify-between p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-left text-xs transition-colors"
                >
                  <div>
                    <div className="font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-200">Client Portal User</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">client@acme.com / client123</div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 px-1.5 py-0.5 rounded-none border border-zinc-900">Acme Corp</span>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoCredentials('superadmin@quantify.com', 'superadmin123')}
                  className="flex items-center justify-between p-3 rounded-none border-2 border-zinc-900 dark:border-zinc-800 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-left text-xs transition-colors"
                >
                  <div>
                    <div className="font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-200">Superadmin</div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">superadmin@quantify.com / superadmin123</div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-white dark:text-zinc-900 bg-zinc-900 dark:bg-zinc-100 px-1.5 py-0.5 rounded-none border border-zinc-900">Global</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSubscriptionExpired = user?.role !== 'superadmin' && currentWorkspace && 
    currentWorkspace.subscriptionExpiresAt && currentWorkspace.subscriptionExpiresAt < '2026-07-13';

  if (isSubscriptionExpired) {
    return (
      <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex transition-colors duration-200">
        <Sidebar />
        <main className="flex-1 p-10 bg-zinc-100 dark:bg-zinc-950 min-h-screen flex items-center justify-center max-w-7xl mx-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 p-8 shadow-none space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-none bg-rose-500/10 text-rose-600 border-2 border-rose-500 animate-pulse">
                <Shield className="h-7 w-7" />
              </div>
              <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight">Workspace Lapsed</h2>
              <p className="text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                Your workspace subscription for <span className="font-bold text-zinc-800 dark:text-zinc-200">{currentWorkspace?.name}</span> expired on <span className="font-bold text-rose-600">{currentWorkspace?.subscriptionExpiresAt}</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 6 months plan */}
              <div className="border-2 border-zinc-900 dark:border-zinc-800 p-6 space-y-4 bg-zinc-50 dark:bg-zinc-900 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Standard Pack</span>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 uppercase mt-1">6-Month Access</h3>
                  <p className="text-xs text-zinc-400 mt-2 font-mono">Best for growing business ledgers requiring standard validation engines.</p>
                  <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-4 font-mono">₹19,999</div>
                  <span className="text-[9px] text-zinc-400 font-mono">one-time payment</span>
                </div>
                <button
                  onClick={() => renewSubscription('6_months')}
                  disabled={isLoading}
                  className="w-full mt-4 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-black uppercase tracking-wider hover:opacity-90 border-2 border-zinc-900 dark:border-zinc-100 cursor-pointer"
                >
                  Buy 6-Month Pack
                </button>
              </div>

              {/* 1 year plan */}
              <div className="border-2 border-indigo-500 p-6 space-y-4 bg-indigo-500/5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-2 right-2 bg-indigo-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-none tracking-widest font-mono">Best Value</div>
                <div>
                  <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">Enterprise Pack</span>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 uppercase mt-1">1-Year Premium</h3>
                  <p className="text-xs text-zinc-400 mt-2 font-mono">Full-scale corporate intelligence, persistent audit histories, and priority support.</p>
                  <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-4 font-mono">₹34,999</div>
                  <span className="text-[9px] text-zinc-400 font-mono">save over 15%</span>
                </div>
                <button
                  onClick={() => renewSubscription('1_year')}
                  disabled={isLoading}
                  className="w-full mt-4 py-2.5 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-700 border-2 border-indigo-600 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  Buy 1-Year Pack
                </button>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={logout}
                className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-rose-600 hover:underline cursor-pointer"
              >
                Sign out of account
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render the authenticated application structure
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 flex transition-colors duration-200">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Primary content area */}
      <main className="flex-1 p-10 bg-zinc-100 dark:bg-zinc-950 min-h-screen overflow-y-auto max-w-7xl mx-auto">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'kpis' && <KPIsTab />}
        {activeTab === 'transactions' && <TransactionsTab />}
        {activeTab === 'reconciliation' && <ReconciliationTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'admin' && <AdminTab />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}

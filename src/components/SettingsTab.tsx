import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { 
  User, 
  Lock, 
  Bell, 
  Building, 
  Users, 
  Save, 
  Key, 
  UserCheck, 
  AlertCircle 
} from 'lucide-react';
import { motion } from 'motion/react';

export default function SettingsTab() {
  const { user, apiCall, showToast, currentWorkspace, fetchCurrentWorkspace } = useApp();

  const [activeSection, setActiveSection] = useState<'profile' | 'security' | 'workspace'>('profile');

  // Profile states
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || user?.name || '');
  const [prefs, setPrefs] = useState({
    emailBreaches: user?.notificationPreferences?.emailBreaches ?? true,
    emailDigest: user?.notificationPreferences?.emailDigest ?? false,
    pushAnomalies: user?.notificationPreferences?.pushAnomalies ?? true,
    marketing: user?.notificationPreferences?.marketing ?? false,
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Workspace settings states
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || '');
  const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const isWorkspaceAdmin = user?.role === 'Workspace Admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || user.name);
      if (user.notificationPreferences) {
        setPrefs({
          emailBreaches: user.notificationPreferences.emailBreaches,
          emailDigest: user.notificationPreferences.emailDigest,
          pushAnomalies: user.notificationPreferences.pushAnomalies,
          marketing: user.notificationPreferences.marketing,
        });
      }
    }
  }, [user]);

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
    }
  }, [currentWorkspace]);

  // Load workspace users if admin
  const loadWorkspaceUsers = async () => {
    if (!isWorkspaceAdmin) return;
    setIsLoadingUsers(true);
    try {
      const data = await apiCall('/api/workspaces/current/users');
      setWorkspaceUsers(data);
    } catch (err: any) {
      showToast('Failed to load workspace users: ' + err.message, 'error');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'workspace' && isWorkspaceAdmin) {
      loadWorkspaceUsers();
    }
  }, [activeSection]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const data = await apiCall('/api/users/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          notificationPreferences: prefs
        })
      });
      if (data.success) {
        showToast('Profile updated successfully!', 'success');
        // AppContext should update locally via setter
      }
    } catch (err: any) {
      showToast('Failed to update profile: ' + err.message, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const data = await apiCall('/api/users/security', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (data.success) {
        showToast('Password updated successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWorkspace(true);
    try {
      const data = await apiCall('/api/workspaces/current', {
        method: 'PATCH',
        body: JSON.stringify({ name: workspaceName })
      });
      if (data.success) {
        showToast('Workspace settings updated successfully!', 'success');
        await fetchCurrentWorkspace();
      }
    } catch (err: any) {
      showToast('Failed to update workspace settings: ' + err.message, 'error');
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const data = await apiCall(`/api/workspaces/current/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      if (data.success) {
        showToast('User role updated successfully!', 'success');
        loadWorkspaceUsers();
      }
    } catch (err: any) {
      showToast('Failed to update user role: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="p-6 bg-zinc-900 text-white dark:bg-zinc-950 border-2 border-zinc-900 flex justify-between items-center rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Account Settings & Profile</h1>
          <p className="text-xs text-zinc-400 font-mono mt-1">Manage display details, credentials, and workspace settings.</p>
        </div>
        <div className="h-10 w-10 bg-zinc-800 border border-zinc-700 flex items-center justify-center">
          <User className="h-5 w-5 text-zinc-100" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          <button
            onClick={() => setActiveSection('profile')}
            className={`w-full flex items-center gap-3 p-3 text-xs font-black uppercase tracking-wider text-left border-2 transition-all rounded-none ${
              activeSection === 'profile'
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white hover:bg-zinc-50 border-zinc-900 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveSection('security')}
            className={`w-full flex items-center gap-3 p-3 text-xs font-black uppercase tracking-wider text-left border-2 transition-all rounded-none ${
              activeSection === 'security'
                ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-white hover:bg-zinc-50 border-zinc-900 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Security Credentials</span>
          </button>

          {isWorkspaceAdmin && (
            <button
              onClick={() => setActiveSection('workspace')}
              className={`w-full flex items-center gap-3 p-3 text-xs font-black uppercase tracking-wider text-left border-2 transition-all rounded-none ${
                activeSection === 'workspace'
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white hover:bg-zinc-50 border-zinc-900 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              <Building className="h-4 w-4" />
              <span>Workspace Settings</span>
            </button>
          )}
        </div>

        {/* Action Content Panel */}
        <div className="lg:col-span-3">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 p-6 shadow-none"
          >
            {/* PROFILE SECTION */}
            {activeSection === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Personal Profile</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">Define your account's public identity and interface preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Email Address</label>
                    <input
                      type="text"
                      disabled
                      value={email}
                      className="w-full p-2.5 bg-zinc-50 dark:bg-zinc-850 border border-zinc-300 dark:border-zinc-700 font-mono text-xs text-zinc-500 cursor-not-allowed rounded-none"
                    />
                    <p className="text-[9px] text-zinc-400 font-mono">Primary identifier cannot be altered.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Adit Kumar"
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 rounded-none"
                    />
                  </div>
                </div>

                {/* Notifications Panel */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-zinc-700 dark:text-zinc-300" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Notification Preferences</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Preference 1 */}
                    <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <input
                        type="checkbox"
                        id="emailBreaches"
                        checked={prefs.emailBreaches}
                        onChange={(e) => setPrefs({ ...prefs, emailBreaches: e.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-zinc-900 rounded-none cursor-pointer"
                      />
                      <div>
                        <label htmlFor="emailBreaches" className="text-xs font-black uppercase tracking-wide text-zinc-800 dark:text-zinc-200 cursor-pointer">
                          Threshold Breaches
                        </label>
                        <p className="text-[10px] text-zinc-400 mt-1">Receive email alerts immediately when a KPI drifts outside of its configured safe thresholds.</p>
                      </div>
                    </div>

                    {/* Preference 2 */}
                    <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <input
                        type="checkbox"
                        id="pushAnomalies"
                        checked={prefs.pushAnomalies}
                        onChange={(e) => setPrefs({ ...prefs, pushAnomalies: e.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-zinc-900 rounded-none cursor-pointer"
                      />
                      <div>
                        <label htmlFor="pushAnomalies" className="text-xs font-black uppercase tracking-wide text-zinc-800 dark:text-zinc-200 cursor-pointer">
                          Anomaly Alerts
                        </label>
                        <p className="text-[10px] text-zinc-400 mt-1">Receive push notification prompts when AI agents detect atypical financial trends or transaction drift.</p>
                      </div>
                    </div>

                    {/* Preference 3 */}
                    <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <input
                        type="checkbox"
                        id="emailDigest"
                        checked={prefs.emailDigest}
                        onChange={(e) => setPrefs({ ...prefs, emailDigest: e.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-zinc-900 rounded-none cursor-pointer"
                      />
                      <div>
                        <label htmlFor="emailDigest" className="text-xs font-black uppercase tracking-wide text-zinc-800 dark:text-zinc-200 cursor-pointer">
                          Weekly Intelligence Digest
                        </label>
                        <p className="text-[10px] text-zinc-400 mt-1">A comprehensive intelligence PDF report compiled and dispatched to your email on Sunday mornings.</p>
                      </div>
                    </div>

                    {/* Preference 4 */}
                    <div className="flex items-start gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                      <input
                        type="checkbox"
                        id="marketing"
                        checked={prefs.marketing}
                        onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                        className="mt-0.5 h-4 w-4 accent-zinc-900 rounded-none cursor-pointer"
                      />
                      <div>
                        <label htmlFor="marketing" className="text-xs font-black uppercase tracking-wide text-zinc-800 dark:text-zinc-200 cursor-pointer">
                          Product & Agent Releases
                        </label>
                        <p className="text-[10px] text-zinc-400 mt-1">Stay up to date with new features, model integrations, and workflow templates.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-900 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-zinc-900 dark:border-zinc-100 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isSavingProfile ? 'Saving...' : 'Save Preferences'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* SECURITY SECTION */}
            {activeSection === 'security' && (
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Security Credentials</h3>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">Manage password locks and verify compliance credentials.</p>
                </div>

                <div className="max-w-xl space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 rounded-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">New Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 rounded-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 rounded-none"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-900 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-zinc-900 dark:border-zinc-100 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                  >
                    <Key className="h-4 w-4" />
                    <span>{isUpdatingPassword ? 'Updating...' : 'Update Credentials'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* WORKSPACE SECTION */}
            {activeSection === 'workspace' && isWorkspaceAdmin && (
              <div className="space-y-8">
                <form onSubmit={handleUpdateWorkspace} className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Workspace Tenant Properties</h3>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">Control settings applicable to your entire enterprise tenant.</p>
                  </div>

                  <div className="max-w-xl space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Workspace / Org Name</label>
                      <input
                        type="text"
                        required
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 rounded-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingWorkspace}
                      className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 hover:opacity-90 text-white dark:text-zinc-900 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-zinc-900 dark:border-zinc-100 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                    >
                      <Building className="h-4 w-4" />
                      <span>{isSavingWorkspace ? 'Saving...' : 'Rename Workspace'}</span>
                    </button>
                  </div>
                </form>

                {/* Team Role modification subpanel */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                      <h4 className="text-sm font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Workspace User Directory & Role Controls</h4>
                    </div>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">Review tenant users and assign roles for compliance control access.</p>
                  </div>

                  {isLoadingUsers ? (
                    <div className="text-xs text-zinc-400 font-mono py-4">Synchronizing user lists...</div>
                  ) : (
                    <div className="border-2 border-zinc-900 dark:border-zinc-800 overflow-x-auto rounded-none">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-950 font-mono uppercase tracking-wider text-[10px] font-bold text-zinc-500 border-b-2 border-zinc-900 dark:border-zinc-800">
                            <th className="p-3">User Email / Account</th>
                            <th className="p-3">Display Name</th>
                            <th className="p-3">Assigned Access Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                          {workspaceUsers.map((wsUser) => (
                            <tr key={wsUser.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20">
                              <td className="p-3 font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                                {wsUser.name}
                                {wsUser.id === user?.id && (
                                  <span className="ml-2 text-[8px] bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono px-1 border border-indigo-500/20 uppercase font-black tracking-widest">
                                    YOU
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-zinc-700 dark:text-zinc-300">
                                {wsUser.displayName || <span className="text-zinc-400 italic">No Display Name set</span>}
                              </td>
                              <td className="p-3">
                                {wsUser.id === user?.id ? (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none text-[9px] font-black uppercase tracking-wider bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border border-zinc-900 dark:border-zinc-100">
                                    <UserCheck className="h-3 w-3" />
                                    <span>{wsUser.role}</span>
                                  </div>
                                ) : (
                                  <select
                                    value={wsUser.role}
                                    onChange={(e) => handleUpdateUserRole(wsUser.id, e.target.value)}
                                    className="p-1 bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-700 text-xs font-mono font-bold uppercase"
                                  >
                                    <option value="Workspace Admin">Workspace Admin</option>
                                    <option value="Financial Manager">Financial Manager</option>
                                    <option value="Operations Staff">Operations Staff</option>
                                    <option value="Client Portal User">Client Portal User</option>
                                  </select>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

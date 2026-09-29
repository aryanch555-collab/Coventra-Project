import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { LeadRecord, UserRole, UserProfile } from '../types';
import { parseCSV, exportLeadsToCSV, SAMPLE_CSV_DATA } from '../utils/csvUtils';
import { 
  Upload, 
  Download, 
  BarChart3, 
  Users, 
  CheckCircle2, 
  FileSpreadsheet, 
  Search, 
  Trash2, 
  Database, 
  UserPlus, 
  TrendingUp, 
  AlertCircle, 
  FlaskConical, 
  RefreshCw, 
  LayoutDashboard,
  UserX
} from 'lucide-react';

export const ManagerDashboardView: React.FC = () => {
  const { token, provisionUserAccount, removeUser, fetchManagedUsers } = useAuth();
  
  // Navigation: Dashboard vs Users Page
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users'>('dashboard');

  // Leads state
  const [allLeads, setAllLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // CSV Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSampleMode, setIsSampleMode] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ parsedRows: number; headers: string[] } | null>(null);

  // Users Page state
  const [managedUsers, setManagedUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('agent');
  const [provisioning, setProvisioning] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // Confirmation before removal modal
  const [userToRemove, setUserToRemove] = useState<UserProfile | null>(null);
  const [removingUser, setRemovingUser] = useState(false);

  // Filters for Data Table & Test Separation
  const [filterType, setFilterType] = useState<'all' | 'production' | 'sample_test'>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch leads securely through server-side verified manager API
  const fetchLeads = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/manager/leads', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setAllLeads(data.leads);
      }
    } catch (err) {
      console.error('Error fetching leads from server:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load and live polling for dashboard
  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 3000);
    return () => clearInterval(interval);
  }, [fetchLeads]);

  // Refresh managed users list
  const refreshUsersList = useCallback(async () => {
    setLoadingUsers(true);
    const users = await fetchManagedUsers();
    setManagedUsers(users);
    setLoadingUsers(false);
  }, [fetchManagedUsers]);

  useEffect(() => {
    refreshUsersList();
  }, [refreshUsersList]);

  // Compute real-time dashboard analytics
  const scopedLeads = allLeads.filter(l => {
    if (filterType === 'all') return true;
    return (l.datasetType || 'production') === filterType;
  });

  const totalLeads = scopedLeads.length;
  const completedLeads = scopedLeads.filter(l => l.status === 'completed');
  const inProgressLeads = scopedLeads.filter(l => l.status === 'in_progress');
  const unassignedLeads = scopedLeads.filter(l => l.status === 'unassigned');
  
  const completionRate = totalLeads > 0 ? Math.round((completedLeads.length / totalLeads) * 100) : 0;

  // Breakdown by outcome
  const outcomeCounts: Record<string, number> = {};
  completedLeads.forEach(l => {
    if (l.outcome) {
      outcomeCounts[l.outcome] = (outcomeCounts[l.outcome] || 0) + 1;
    }
  });

  // Calculate positive conversion (interested / meeting)
  const qualifiedCount = (outcomeCounts['Interested / Lead Qualified'] || 0) + (outcomeCounts['Meeting Scheduled'] || 0);
  const conversionRate = completedLeads.length > 0 ? ((qualifiedCount / completedLeads.length) * 100).toFixed(1) : '0';

  // Agent productivity breakdown
  const agentPerformance: Record<string, { calls: number; qualified: number }> = {};
  completedLeads.forEach(l => {
    const agent = l.processedByName || 'Unassigned';
    if (!agentPerformance[agent]) {
      agentPerformance[agent] = { calls: 0, qualified: 0 };
    }
    agentPerformance[agent].calls += 1;
    if (l.outcome === 'Interested / Lead Qualified' || l.outcome === 'Meeting Scheduled') {
      agentPerformance[agent].qualified += 1;
    }
  });

  // Handle CSV file selection for production data
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSampleMode(false);
    if (!campaignName) {
      setCampaignName(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvContent(text);
      const parsed = parseCSV(text);
      setUploadStats({
        parsedRows: parsed.rows.length,
        headers: parsed.headers
      });
    };
    reader.readAsText(file);
  };

  // Load sample dataset
  const handleLoadSample = () => {
    setIsSampleMode(true);
    setCampaignName('Sample Test Dataset');
    setCsvContent(SAMPLE_CSV_DATA);
    const parsed = parseCSV(SAMPLE_CSV_DATA);
    setUploadStats({
      parsedRows: parsed.rows.length,
      headers: parsed.headers
    });
  };

  // Ingest dataset through server-side verified manager endpoint
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim() || !token) return;

    setUploading(true);
    try {
      const { rows } = parseCSV(csvContent);
      if (rows.length === 0) {
        alert('No data rows found in the CSV.');
        setUploading(false);
        return;
      }

      const activeCampaign = campaignName.trim() || (isSampleMode ? 'Sample Test Campaign' : 'Production Campaign');
      const now = new Date().toISOString();
      const datasetType: 'production' | 'sample_test' = isSampleMode ? 'sample_test' : 'production';
      const datasetId = `ds_${Date.now()}`;

      const parsedLeads: LeadRecord[] = rows.map((row, idx) => {
        const findVal = (keywords: string[]) => {
          for (const key of Object.keys(row)) {
            const lower = key.toLowerCase();
            if (keywords.some(k => lower.includes(k))) {
              return row[key];
            }
          }
          return '';
        };

        const fullName = findVal(['name', 'contact', 'lead', 'person']) || `Contact #${idx + 1}`;
        const phoneNumber = findVal(['phone', 'tel', 'mobile', 'cell', 'number']) || '+1 (555) 000-0000';
        const company = findVal(['company', 'organization', 'account', 'firm', 'business']);
        const title = findVal(['title', 'role', 'position', 'job']);
        const email = findVal(['email', 'mail']);
        const location = findVal(['location', 'city', 'state', 'country', 'address']);
        const industry = findVal(['industry', 'sector', 'vertical']);
        const estimatedRevenue = findVal(['revenue', 'size', 'arr', 'budget']);
        const notes = findVal(['note', 'comment', 'detail', 'summary', 'remark']);

        const extraFields: Record<string, string> = {};
        Object.entries(row).forEach(([col, val]) => {
          const lower = col.toLowerCase();
          const isStandard = ['name', 'phone', 'company', 'title', 'email', 'location', 'industry', 'revenue', 'note'].some(k => lower.includes(k));
          if (!isStandard && val) {
            extraFields[col] = val;
          }
        });

        return {
          id: `lead_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          datasetId: datasetId,
          datasetName: activeCampaign,
          datasetType: datasetType,
          rowNumber: idx + 1,
          fullName,
          phoneNumber,
          company,
          title,
          email,
          location,
          industry,
          estimatedRevenue,
          notes,
          extraFields,
          status: 'unassigned',
          createdAt: now
        };
      });

      const res = await fetch('/api/manager/sync-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leads: parsedLeads, replaceAll: false })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload dataset.');
      }

      await fetchLeads();
      setIsUploadModalOpen(false);
      setCsvContent('');
      setCampaignName('');
      setUploadStats(null);
      setIsSampleMode(false);
    } catch (err: unknown) {
      console.error('Failed to upload CSV:', err);
      alert(err instanceof Error ? err.message : 'Failed to upload dataset.');
    } finally {
      setUploading(false);
    }
  };

  // Export dataset with recorded outcomes as CSV
  const handleExportCSV = () => {
    const filename = `call-outcomes-${filterType}-${new Date().toISOString().slice(0, 10)}`;
    exportLeadsToCSV(filteredLeads, filename);
  };

  // Delete ONLY sample test records without touching real production datasets
  const handleClearTestData = async () => {
    if (!token) return;
    if (!confirm('Clear all sample test records? Real production datasets will not be affected.')) return;
    try {
      setLoading(true);
      const res = await fetch('/api/manager/clear-test-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        await fetchLeads();
      }
    } catch (err) {
      console.error('Error clearing test data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add user account
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);
    setProvisioning(true);

    const res = await provisionUserAccount(newUserName, newUserEmail, newUserPassword, newUserRole);
    setProvisioning(false);

    if (res.success) {
      setUserSuccess(`User account created for ${newUserName} (${newUserRole === 'manager' ? 'Manager' : 'Agent'}).`);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setIsAddUserModalOpen(false);
      refreshUsersList();
      setTimeout(() => setUserSuccess(null), 4000);
    } else {
      setUserError(res.error || 'Failed to add user account.');
    }
  };

  // Remove user account with confirmation
  const handleConfirmRemoveUser = async () => {
    if (!userToRemove) return;
    setRemovingUser(true);
    setUserError(null);
    setUserSuccess(null);

    const res = await removeUser(userToRemove.uid);
    setRemovingUser(false);

    if (res.success) {
      setUserSuccess(res.message || `Account "${userToRemove.displayName}" has been removed.`);
      setUserToRemove(null);
      refreshUsersList();
      fetchLeads(); // Refresh leads in case an active lead was released back to queue
      setTimeout(() => setUserSuccess(null), 4000);
    } else {
      setUserError(res.error || 'Failed to remove user account.');
    }
  };

  // Filtered leads
  const filteredLeads = scopedLeads.filter(lead => {
    if (filterStatus !== 'all' && lead.status !== filterStatus) return false;
    if (filterOutcome !== 'all' && lead.outcome !== filterOutcome) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.fullName?.toLowerCase().includes(q);
      const matchCompany = lead.company?.toLowerCase().includes(q);
      const matchPhone = lead.phoneNumber?.toLowerCase().includes(q);
      const matchAgent = lead.processedByName?.toLowerCase().includes(q);
      if (!matchName && !matchCompany && !matchPhone && !matchAgent) return false;
    }
    return true;
  });

  const testRecordsCount = allLeads.filter(l => l.datasetType === 'sample_test').length;
  const prodRecordsCount = allLeads.filter(l => (l.datasetType || 'production') === 'production').length;

  return (
    <div className="space-y-6">
      {/* Top Manager Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'dashboard'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mr-1.5" />
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4 mr-1.5" />
          Users ({managedUsers.length})
        </button>
      </div>

      {userSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{userSuccess}</span>
          </div>
          <button onClick={() => setUserSuccess(null)} className="text-emerald-700 font-bold ml-2">✕</button>
        </div>
      )}

      {userError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{userError}</span>
          </div>
          <button onClick={() => setUserError(null)} className="text-rose-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* ================= USERS PAGE ================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Users</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Add and remove user accounts. Only managers can manage accounts.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={refreshUsersList}
                className="p-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 transition"
                title="Refresh user list"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setUserError(null);
                  setIsAddUserModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Add User
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                Accounts ({managedUsers.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Removing an agent automatically releases their active lead back to the queue.
              </span>
            </div>

            {loadingUsers ? (
              <div className="p-10 text-center text-xs text-slate-400">Loading accounts...</div>
            ) : managedUsers.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Login Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {managedUsers.map(u => (
                      <tr key={u.uid} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{u.displayName}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                            u.role === 'manager'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {u.role === 'manager' ? 'Manager' : 'Agent'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setUserToRemove(u)}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold transition"
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            Remove
                          </button>
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

      {/* ================= DASHBOARD & LEADS PAGE ================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Supervisor Command Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Manager Portal
                </span>
                <span className="text-xs text-slate-500">Overview</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">Outbound Calling Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload CSV datasets, monitor live call outcomes, and export results.
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setIsSampleMode(false);
                  setIsUploadModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Upload CSV
              </button>

              <button
                onClick={handleExportCSV}
                disabled={filteredLeads.length === 0}
                className={`inline-flex items-center px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                  filteredLeads.length === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'
                }`}
              >
                <Download className="w-4 h-4 mr-1.5 text-slate-500" />
                Export CSV ({filteredLeads.length})
              </button>

              {testRecordsCount > 0 && (
                <button
                  onClick={handleClearTestData}
                  className="inline-flex items-center px-3 py-2 rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Clear Test Data ({testRecordsCount})
                </button>
              )}
            </div>
          </div>

          {/* Dataset Scope Tabs */}
          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-1.5">
              <span className="font-semibold text-slate-600 px-2 uppercase text-[11px]">Scope:</span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  filterType === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Leads ({allLeads.length})
              </button>
              <button
                onClick={() => setFilterType('production')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center ${
                  filterType === 'production' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Database className="w-3.5 h-3.5 mr-1" />
                Production Leads ({prodRecordsCount})
              </button>
              <button
                onClick={() => setFilterType('sample_test')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center ${
                  filterType === 'sample_test' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5 mr-1" />
                Sample Test Leads ({testRecordsCount})
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Total Leads</span>
                <Database className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">{totalLeads}</div>
              <div className="mt-2 text-xs text-slate-500">
                <span className="text-amber-600 font-semibold">{unassignedLeads.length} queued</span>
                <span className="mx-1.5">•</span>
                <span className="text-blue-600 font-semibold">{inProgressLeads.length} on call</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Completed Calls</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 mt-2">{completedLeads.length}</div>
              <div className="mt-2 text-xs text-slate-500 flex items-center">
                <div className="w-full bg-slate-100 rounded-full h-1.5 mr-2">
                  <div 
                    className="bg-emerald-500 h-1.5 rounded-full" 
                    style={{ width: `${Math.min(completionRate, 100)}%` }}
                  ></div>
                </div>
                <span className="font-semibold text-slate-700">{completionRate}%</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Qualified Leads</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-extrabold text-indigo-600 mt-2">{qualifiedCount}</div>
              <div className="mt-2 text-xs text-slate-500">
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {conversionRate}% conversion
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Active Agents</span>
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mt-2">
                {Object.keys(agentPerformance).length}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Logged call outcomes
              </div>
            </div>
          </div>

          {/* Outcome Distribution & Agent Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center text-sm mb-4">
                <BarChart3 className="w-4 h-4 mr-2 text-indigo-600" />
                Call Outcomes ({completedLeads.length} completed)
              </h3>

              {completedLeads.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No calls completed in this scope yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(outcomeCounts).map(([outcome, count]) => {
                    const pct = Math.round((count / completedLeads.length) * 100);
                    let barColor = 'bg-slate-400';
                    if (outcome.includes('Interested') || outcome.includes('Meeting')) barColor = 'bg-emerald-500';
                    else if (outcome.includes('Follow Up') || outcome.includes('Busy')) barColor = 'bg-blue-500';
                    else if (outcome.includes('Not Interested')) barColor = 'bg-rose-500';
                    else if (outcome.includes('Voicemail')) barColor = 'bg-purple-500';

                    return (
                      <div key={outcome} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-800">{outcome}</span>
                          <span className="text-slate-500">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 flex items-center text-sm mb-4">
                <Users className="w-4 h-4 mr-2 text-indigo-600" />
                Agent Activity
              </h3>

              {Object.keys(agentPerformance).length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No agent call activity recorded yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(agentPerformance).map(([agent, stats]) => (
                    <div key={agent} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{agent}</div>
                        <div className="text-[11px] text-emerald-600 font-semibold">{stats.qualified} qualified</div>
                      </div>
                      <div className="font-bold text-slate-800">{stats.calls} calls</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Master Dataset View */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Leads</h3>
                <p className="text-xs text-slate-500">All campaign leads and recorded outcomes.</p>
              </div>

              {/* Table Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, company, phone..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="unassigned">Queued</option>
                  <option value="in_progress">On Call</option>
                  <option value="completed">Completed</option>
                </select>

                <select
                  value={filterOutcome}
                  onChange={(e) => setFilterOutcome(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none"
                >
                  <option value="all">All Outcomes</option>
                  <option value="Interested / Lead Qualified">Interested / Qualified</option>
                  <option value="Follow Up / Callback">Follow Up / Callback</option>
                  <option value="Meeting Scheduled">Meeting Scheduled</option>
                  <option value="Busy / Call Later">Busy / Call Later</option>
                  <option value="No Answer / Voicemail">No Answer</option>
                  <option value="Gatekeeper Refusal">Gatekeeper Refusal</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Wrong Number / Disconnected">Wrong Number</option>
                </select>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              {filteredLeads.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {allLeads.length === 0 ? (
                    <div>
                      <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">No leads in database</p>
                      <p className="text-slate-400 mt-1 mb-3">Upload your CSV dataset or load sample test data.</p>
                      <div className="space-x-2">
                        <button
                          onClick={() => {
                            setIsSampleMode(false);
                            setIsUploadModalOpen(true);
                          }}
                          className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1" />
                          Upload CSV
                        </button>
                        <button
                          onClick={() => {
                            setIsUploadModalOpen(true);
                            handleLoadSample();
                          }}
                          className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                        >
                          <FlaskConical className="w-3.5 h-3.5 mr-1" />
                          Load Sample Data
                        </button>
                      </div>
                    </div>
                  ) : (
                    'No records match the active search criteria.'
                  )}
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-4">Contact Name</th>
                      <th className="py-2.5 px-4">Company</th>
                      <th className="py-2.5 px-4">Phone Number</th>
                      <th className="py-2.5 px-4">Scope</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Recorded Outcome</th>
                      <th className="py-2.5 px-4">Agent</th>
                      <th className="py-2.5 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{lead.fullName}</td>
                        <td className="py-2.5 px-4 text-slate-600">{lead.company || '—'}</td>
                        <td className="py-2.5 px-4 font-mono font-medium text-indigo-700">{lead.phoneNumber}</td>
                        <td className="py-2.5 px-4">
                          {lead.datasetType === 'sample_test' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Test
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Production
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {lead.status === 'completed' && (
                            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Completed
                            </span>
                          )}
                          {lead.status === 'in_progress' && (
                            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              On Call
                            </span>
                          )}
                          {lead.status === 'unassigned' && (
                            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                              Queued
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {lead.outcome ? (
                            <span className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                              lead.outcome.includes('Interested') || lead.outcome.includes('Scheduled')
                                ? 'bg-emerald-100 text-emerald-800'
                                : lead.outcome.includes('Follow Up')
                                ? 'bg-blue-100 text-blue-800'
                                : lead.outcome.includes('Not Interested')
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {lead.outcome}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Pending</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{lead.processedByName || lead.claimedByName || '—'}</td>
                        <td className="py-2.5 px-4 text-slate-500 max-w-xs truncate">{lead.outcomeNotes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD USER MODAL ================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add User Account</h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              Enter the user’s name, login email, and separate password. Choose whether their role is Manager or Agent.
            </p>

            <form onSubmit={handleAddUserSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Login Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@callflow.internal"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Set separate password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition"
                >
                  {provisioning ? 'Adding...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CONFIRM REMOVE USER MODAL ================= */}
      {userToRemove && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Remove Account</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to remove <strong className="text-slate-900">{userToRemove.displayName}</strong> ({userToRemove.email})?
              {userToRemove.role === 'agent' && (
                <span className="block mt-2 text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  Note: Any active lead currently assigned to this agent will be released back to the queue.
                </span>
              )}
            </p>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                disabled={removingUser}
                onClick={() => setUserToRemove(null)}
                className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removingUser}
                onClick={handleConfirmRemoveUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs transition"
              >
                {removingUser ? 'Removing...' : 'Remove Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CSV UPLOAD MODAL ================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {isSampleMode ? 'Load Sample Data' : 'Upload CSV'}
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Outbound Campaign"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Select CSV File
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="text-xs text-amber-700 font-semibold hover:underline flex items-center"
                  >
                    <FlaskConical className="w-3 h-3 mr-1" />
                    Load Sample CSV (10 leads)
                  </button>
                </div>

                <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-indigo-400 transition bg-slate-50/50">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-file-input"
                  />
                  <label htmlFor="csv-file-input" className="cursor-pointer block text-xs">
                    <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-1.5" />
                    <span className="font-semibold text-slate-700 block">Click to select CSV file</span>
                    <span className="text-slate-400 text-[11px]">Columns like Name, Phone, Company are auto-detected</span>
                  </label>
                </div>
              </div>

              {uploadStats && (
                <div className="p-2.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {uploadStats.parsedRows} records detected.
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CSV Content
                </label>
                <textarea
                  rows={4}
                  value={csvContent}
                  onChange={(e) => {
                    setCsvContent(e.target.value);
                    const parsed = parseCSV(e.target.value);
                    setUploadStats({ parsedRows: parsed.rows.length, headers: parsed.headers });
                  }}
                  className="w-full font-mono text-[11px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !csvContent.trim()}
                  className={`px-4 py-2 rounded-lg font-bold text-xs text-white ${
                    uploading || !csvContent.trim()
                      ? 'bg-slate-300 cursor-not-allowed'
                      : isSampleMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Upload Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

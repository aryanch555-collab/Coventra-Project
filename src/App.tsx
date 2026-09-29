import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { AgentDialerView } from './components/AgentDialerView';
import { ManagerDashboardView } from './components/ManagerDashboardView';
import { 
  PhoneCall, 
  ShieldCheck, 
  LogOut, 
  LayoutDashboard, 
  Lock, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const { 
    user, 
    profile, 
    role, 
    loading, 
    signIn,
    signOut 
  } = useAuth();

  const [emailInput, setEmailInput] = useState('manager@callflow.internal');
  const [passwordInput, setPasswordInput] = useState('ManagerPass2026!');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const res = await signIn(emailInput, passwordInput);
      if (!res.success) {
        setAuthError(res.error || 'Authentication failed.');
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <h2 className="text-base font-bold">CallFlow Portal</h2>
          <p className="text-xs text-slate-400 mt-1">Connecting to authenticated calling system...</p>
        </div>
      </div>
    );
  }

  // Not signed in: Email/Password Sign-In
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 sm:p-8">
        <div className="max-w-4xl mx-auto w-full pt-6 sm:pt-12">
          {/* Header Branding */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CallFlow Portal</h1>
              <span className="text-xs text-slate-400">Authenticated Outbound Calling & Operations</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Column: Scope & Overview */}
            <div className="md:col-span-7 space-y-4">
              <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                Private Cold-Calling Operations & Supervision
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Supervisors manage lead datasets, monitor live conversion metrics, export outcomes, and provision accounts. 
                Agents are denied all direct queries and receive one assigned record at a time via atomic server-side dispatch.
              </p>

              <div className="space-y-2 pt-2 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span><strong>Verified Authentication:</strong> Secure credentials with server-verified role enforcement.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span><strong>Zero Direct Leads Access for Agents:</strong> Direct reads/lists on /leads denied by database rules.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span><strong>Server-Side Atomic Assignment:</strong> Agents receive strictly one record per call.</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                  <span><strong>Continuous Manager Session:</strong> Provisioning accounts does not log out the manager.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Sign In Form */}
            <div className="md:col-span-5 bg-white text-slate-900 rounded-2xl p-6 shadow-xl border border-slate-100">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">Sign In to Portal</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter your assigned credentials. Your role is determined by manager setup.
                </p>
              </div>

              {authError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@callflow.internal"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-lg font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition flex items-center justify-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <span>Authenticating...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Preconfigured Credentials Helper */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">
                  Select Account to Auto-Fill:
                </span>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput('manager@callflow.internal');
                      setPasswordInput('ManagerPass2026!');
                      setAuthError(null);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">Eleanor Sterling</span>
                      <span className="text-slate-400 block font-mono text-[10px]">manager@callflow.internal</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      Manager
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput('sarah.agent@callflow.internal');
                      setPasswordInput('AgentPass2026!');
                      setAuthError(null);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">Sarah Jenkins</span>
                      <span className="text-slate-400 block font-mono text-[10px]">sarah.agent@callflow.internal</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Agent
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput('david.agent@callflow.internal');
                      setPasswordInput('AgentPass2026!');
                      setAuthError(null);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition text-[11px] flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">David Miller</span>
                      <span className="text-slate-400 block font-mono text-[10px]">david.agent@callflow.internal</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Agent
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 py-4">
          CallFlow System • Server-Enforced RBAC & Database Isolation
        </div>
      </div>
    );
  }

  // Signed In Experience
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center space-x-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                role === 'manager' ? 'bg-indigo-600' : 'bg-emerald-600'
              }`}>
                {role === 'manager' ? <LayoutDashboard className="w-4 h-4" /> : <PhoneCall className="w-4 h-4" />}
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-slate-900 block leading-tight">
                  CallFlow
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {role === 'manager' ? 'Manager Dashboard' : 'Agent Calling Console'}
                </span>
              </div>
            </div>

            {/* Authenticated User Status & Sign Out */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {profile?.displayName || user.displayName || 'User'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {user.email}
                </span>
              </div>

              {/* Protected Role Badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                role === 'manager'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {role === 'manager' ? (
                  <>
                    <ShieldCheck className="w-3 h-3 mr-1 text-indigo-600" />
                    Manager
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 mr-1 text-emerald-600" />
                    Agent (Single-Record)
                  </>
                )}
              </span>

              <button
                onClick={() => signOut()}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main View: Strictly RBAC guarded */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {role === 'agent' ? (
          <AgentDialerView />
        ) : (
          <ManagerDashboardView />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-400">
        CallFlow Portal • Strict single-record processing & manager supervision
      </footer>
    </div>
  );
}

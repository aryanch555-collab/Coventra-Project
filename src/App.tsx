import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { AgentDialerView } from './components/AgentDialerView';
import { ManagerDashboardView } from './components/ManagerDashboardView';
import { 
  PhoneCall, 
  LayoutDashboard, 
  LogOut, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  const { 
    user, 
    profile, 
    role, 
    loading, 
    signIn,
    requestPasswordReset,
    signOut 
  } = useAuth();

  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simple password reset state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<{ message?: string; error?: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const res = await signIn(emailInput, passwordInput);
      if (!res.success) {
        setAuthError(res.error || 'Invalid email or password.');
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    setResetLoading(true);
    try {
      const res = await requestPasswordReset(resetEmail);
      if (res.success) {
        setResetStatus({ message: res.message || 'Password reset request submitted. Please check with your manager.' });
      } else {
        setResetStatus({ error: res.error || 'Failed to submit request.' });
      }
    } catch {
      setResetStatus({ error: 'Failed to submit request.' });
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium text-slate-300">Loading CallFlow...</p>
        </div>
      </div>
    );
  }

  // Simplified Sign-In Screen
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <PhoneCall className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            CallFlow
          </h1>
          <p className="mt-1 text-center text-sm text-slate-600">
            Sign in to your account
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
          <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-8">
            {authError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(emailInput);
                      setResetStatus(null);
                      setShowForgotModal(true);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Simple Password Reset Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500 my-3">
                Enter your account email address below. Your system manager can help you update your password.
              </p>

              {resetStatus?.message && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{resetStatus.message}</span>
                </div>
              )}

              {resetStatus?.error && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{resetStatus.error}</span>
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs transition"
                  >
                    {resetLoading ? 'Submitting...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Signed In Application View
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
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
                <span className="text-[11px] text-slate-500">
                  {role === 'manager' ? 'Manager Portal' : 'Agent Calling Console'}
                </span>
              </div>
            </div>

            {/* Authenticated User Status & Sign Out */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {profile?.displayName || user.displayName || 'User'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {user.email}
                </span>
              </div>

              {/* Role Badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                role === 'manager'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}>
                {role === 'manager' ? 'Manager' : 'Agent'}
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

      {/* Main View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {role === 'agent' ? (
          <AgentDialerView />
        ) : (
          <ManagerDashboardView />
        )}
      </main>
    </div>
  );
}

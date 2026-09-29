import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LeadRecord, CallOutcome } from '../types';
import { 
  PhoneCall, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Mail, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  FileText, 
  RotateCcw,
  Lock,
  AlertCircle
} from 'lucide-react';

const OUTCOME_OPTIONS: CallOutcome[] = [
  'Interested / Lead Qualified',
  'Follow Up / Callback',
  'Meeting Scheduled',
  'Busy / Call Later',
  'No Answer / Voicemail',
  'Gatekeeper Refusal',
  'Not Interested',
  'Wrong Number / Disconnected'
];

export const AgentDialerView: React.FC = () => {
  const { user, token } = useAuth();
  const [currentLead, setCurrentLead] = useState<LeadRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [noLeadsLeft, setNoLeadsLeft] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Call Outcome State
  const [selectedOutcome, setSelectedOutcome] = useState<CallOutcome | ''>('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  // Server-side action: Requests next lead atomically
  // The server verifies agent role, claims 1 lead, and returns ONLY that single lead.
  const fetchNextLead = async () => {
    if (!token) return;
    setLoading(true);
    setSelectedOutcome('');
    setOutcomeNotes('');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/agent/next-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to claim next lead.');
        setLoading(false);
        return;
      }

      if (data.lead) {
        setCurrentLead(data.lead);
        setNoLeadsLeft(false);
      } else {
        setCurrentLead(null);
        setNoLeadsLeft(true);
      }
    } catch (err: unknown) {
      console.error('Error fetching lead from server:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Server communication error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNextLead();
  }, [token]);

  // Server-side action: Save outcome and receive next assigned record
  const handleSaveAndNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLead || !selectedOutcome || !token) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/agent/complete-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          leadId: currentLead.id,
          outcome: selectedOutcome,
          outcomeNotes: outcomeNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Failed to save outcome.');
        setSubmitting(false);
        return;
      }

      // Automatically display the next atomically assigned lead
      if (data.nextLead) {
        setCurrentLead(data.nextLead);
        setSelectedOutcome('');
        setOutcomeNotes('');
        setNoLeadsLeft(false);
      } else {
        setCurrentLead(null);
        setNoLeadsLeft(true);
      }
    } catch (err: unknown) {
      console.error('Error completing lead:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save outcome.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Isolation Notice Banner */}
      <div className="bg-slate-900 text-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-xs border border-slate-800">
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">Isolated Agent Dialing Station:</span>
          <span className="text-slate-400">Direct dataset queries denied. Records are dispatched atomically by the server.</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-indigo-600 border-t-transparent mb-3"></div>
          <p className="text-slate-600 font-medium text-sm">Server is assigning your next eligible lead...</p>
        </div>
      ) : noLeadsLeft ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">Queue Complete</h3>
          <p className="text-slate-500 mt-1 text-sm max-w-sm mx-auto">
            All leads in the queue have been processed. Contact your operations manager when a new dataset is uploaded.
          </p>
          <button
            onClick={fetchNextLead}
            className="mt-5 inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Check for Available Leads
          </button>
        </div>
      ) : currentLead ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Record Header */}
          <div className="bg-slate-800 text-white px-6 py-3 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-300">Assigned Record ID: {currentLead.id}</span>
            {currentLead.datasetName && (
              <span className="text-slate-300">Campaign: {currentLead.datasetName}</span>
            )}
          </div>

          {/* Lead Contact Info */}
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {currentLead.fullName || 'Lead Contact'}
                </h2>
                {currentLead.title && (
                  <p className="text-sm font-medium text-slate-600 mt-0.5">{currentLead.title}</p>
                )}
                {currentLead.company && (
                  <div className="flex items-center text-slate-500 text-sm mt-1">
                    <Building2 className="w-4 h-4 mr-1 text-slate-400" />
                    <span>{currentLead.company}</span>
                  </div>
                )}
              </div>

              {/* Direct Click-to-Call */}
              <div>
                <a
                  href={`tel:${currentLead.phoneNumber}`}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-xs transition"
                >
                  <PhoneCall className="w-4 h-4 mr-2" />
                  <span>{currentLead.phoneNumber}</span>
                </a>
              </div>
            </div>

            {/* Available Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-100 text-xs">
              {currentLead.email && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-500">Email:</span>
                  <a href={`mailto:${currentLead.email}`} className="text-indigo-600 hover:underline">
                    {currentLead.email}
                  </a>
                </div>
              )}

              {currentLead.location && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-500">Location:</span>
                  <span>{currentLead.location}</span>
                </div>
              )}

              {currentLead.industry && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-500">Industry:</span>
                  <span>{currentLead.industry}</span>
                </div>
              )}

              {currentLead.estimatedRevenue && (
                <div className="flex items-center space-x-2 text-slate-700">
                  <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-500">Est. Size:</span>
                  <span>{currentLead.estimatedRevenue}</span>
                </div>
              )}

              {currentLead.extraFields && Object.entries(currentLead.extraFields).map(([key, val]) => (
                val ? (
                  <div key={key} className="flex items-center space-x-2 text-slate-700">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-500">{key}:</span>
                    <span>{val}</span>
                  </div>
                ) : null
              ))}
            </div>

            {currentLead.notes && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">Account Notes:</span>
                <span className="text-slate-600">{currentLead.notes}</span>
              </div>
            )}
          </div>

          {/* Outcome Form */}
          <form onSubmit={handleSaveAndNext} className="p-6 sm:p-8 bg-slate-50/50">
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Call Outcome <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OUTCOME_OPTIONS.map(outcome => {
                  const isSelected = selectedOutcome === outcome;
                  return (
                    <button
                      key={outcome}
                      type="button"
                      onClick={() => setSelectedOutcome(outcome)}
                      className={`text-left px-3.5 py-2.5 rounded-lg border text-xs font-medium transition flex items-center justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-1 ring-indigo-600 font-semibold'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{outcome}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Outcome Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="Brief conversation notes..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                Atomically marks completed and requests next record.
              </span>
              <button
                type="submit"
                disabled={!selectedOutcome || submitting}
                className={`inline-flex items-center px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition ${
                  !selectedOutcome || submitting
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {submitting ? 'Saving...' : 'Save Outcome & Next Lead'}
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
};

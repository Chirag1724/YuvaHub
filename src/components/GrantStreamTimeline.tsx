import React from 'react';
import { Activity, ShieldCheck, CheckCircle2, Award } from 'lucide-react';

const RECENT_GRANT_LOGS = [
  {
    id: 'fel-log-1',
    fellowshipTitle: 'PMRF DeepTech AI',
    action: 'Monthly Stipend Direct Benefit Transfer (₹80,000 Disbursed)',
    status: 'DBT_COMPLETED',
    timestampAgo: '12 mins ago',
  },
  {
    id: 'fel-log-2',
    fellowshipTitle: 'YuvaHub Innovation Seed Grant',
    action: 'Shortlisted for Final Interview Panel',
    status: 'INTERVIEW_SCHEDULED',
    timestampAgo: '45 mins ago',
  },
  {
    id: 'fel-log-3',
    fellowshipTitle: 'Global STEM Women Leadership',
    action: 'Proposal Review Verified by UNESCO Committee',
    status: 'PROPOSAL_APPROVED',
    timestampAgo: '1 hour ago',
  },
];

export default function GrantStreamTimeline() {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" /> Live Research Grant & DBT Telemetry Stream
          </h3>
          <p className="text-slate-400 text-xs mt-1">Real-time monthly research stipend disbursements, PFMS portal tracking, and proposal peer reviews.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-purple-300 font-semibold font-mono">
          <Award className="w-4 h-4 text-purple-400" /> DBT Portal Online
        </div>
      </div>

      <div className="space-y-4">
        {RECENT_GRANT_LOGS.map((log) => (
          <div
            key={log.id}
            className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 hover:border-purple-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-purple-500/10 text-purple-400 text-[11px] font-mono px-2 py-0.5 rounded border border-purple-500/20 font-bold">
                  {log.status}
                </span>
                <span className="text-slate-500 text-xs font-mono">{log.timestampAgo}</span>
              </div>
              <h4 className="text-base font-bold text-slate-100">{log.action}</h4>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Fellowship: <span className="text-slate-200">{log.fellowshipTitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Disbursed
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { Activity, ShieldCheck, CheckCircle2, Rocket } from 'lucide-react';

const RECENT_INCUBATION_LOGS = [
  {
    id: 'inc-log-1',
    startupName: 'Nexus AI',
    action: 'Milestone 2 Seed Grant Disbursed (₹10 Lakhs)',
    status: 'DISBURSED',
    timestampAgo: '10 mins ago',
  },
  {
    id: 'inc-log-2',
    startupName: 'GreenGrid Mobility',
    action: 'TIDE 2.0 Incubation Audit Passed',
    status: 'MILESTONE_VERIFIED',
    timestampAgo: '35 mins ago',
  },
  {
    id: 'inc-log-3',
    startupName: 'FinNova',
    action: 'Venture Capital Demo Day Matched with Sequoia Capital',
    status: 'DEMO_DAY_READY',
    timestampAgo: '1 hour ago',
  },
];

export default function IncubationStreamTimeline() {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" /> Live Incubation Grant & VC Matching Stream
          </h3>
          <p className="text-slate-400 text-xs mt-1">Real-time seed capital releases, institutional VC demo day scheduling, and TIDE 2.0 compliance audits.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-emerald-300 font-semibold font-mono">
          <Rocket className="w-4 h-4 text-emerald-400" /> YuvaHub Accelerator Active
        </div>
      </div>

      <div className="space-y-4">
        {RECENT_INCUBATION_LOGS.map((log) => (
          <div
            key={log.id}
            className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 hover:border-emerald-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-emerald-500/10 text-emerald-400 text-[11px] font-mono px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                  {log.status}
                </span>
                <span className="text-slate-500 text-xs font-mono">{log.timestampAgo}</span>
              </div>
              <h4 className="text-base font-bold text-slate-100">{log.action}</h4>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Startup Ref: <span className="text-slate-200">{log.startupName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Grant Verified
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

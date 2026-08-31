import React from 'react';
import { Activity, ShieldCheck, CheckCircle2, Headset } from 'lucide-react';

const RECENT_TICKET_LOGS = [
  {
    id: 'tkt-log-1',
    ticketNumber: 'YUH-2026-8901',
    action: 'PFMS Bank Mandate Verified',
    status: 'IN_PROGRESS',
    timestampAgo: '5 mins ago',
  },
  {
    id: 'tkt-log-2',
    ticketNumber: 'YUH-2026-8902',
    action: 'GitHub Code Audit Verified for Milestone 2',
    status: 'PENDING_ADMIN',
    timestampAgo: '20 mins ago',
  },
  {
    id: 'tkt-log-3',
    ticketNumber: 'YUH-2026-8903',
    action: 'Mentorship Calendar Rescheduled',
    status: 'RESOLVED',
    timestampAgo: '1 hour ago',
  },
];

export default function TicketStreamTimeline() {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" /> Live Support Resolution & SLA Stream
          </h3>
          <p className="text-slate-400 text-xs mt-1">Real-time ticket routing, auto-escalation triggers, and AI response telemetry.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-blue-300 font-semibold font-mono">
          <Headset className="w-4 h-4 text-blue-400" /> YuvaHub Desk Online
        </div>
      </div>

      <div className="space-y-4">
        {RECENT_TICKET_LOGS.map((log) => (
          <div
            key={log.id}
            className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 hover:border-blue-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-blue-500/10 text-blue-400 text-[11px] font-mono px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                  {log.status}
                </span>
                <span className="text-slate-500 text-xs font-mono">{log.timestampAgo}</span>
              </div>
              <h4 className="text-base font-bold text-slate-100">{log.action}</h4>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Ticket Ref: <span className="text-slate-200">{log.ticketNumber}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> SLA Active
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

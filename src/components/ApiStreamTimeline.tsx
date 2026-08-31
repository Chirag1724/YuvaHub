import React from 'react';
import { Activity, ShieldCheck, CheckCircle2, Terminal } from 'lucide-react';

const RECENT_API_LOGS = [
  {
    id: 'api-log-1',
    endpoint: 'POST /v1/ai/match-scholarships',
    keyName: 'Production AI Matcher',
    statusCode: 200,
    latencyMs: 18.4,
    timestampAgo: 'Just now',
  },
  {
    id: 'api-log-2',
    endpoint: 'GET /v1/incubation/cohorts',
    keyName: 'Staging Scraper Webhook',
    statusCode: 200,
    latencyMs: 32.1,
    timestampAgo: '12 mins ago',
  },
  {
    id: 'api-log-3',
    endpoint: 'POST /v1/opportunities/bulk-sync',
    keyName: 'Legacy Student Portal',
    statusCode: 429,
    latencyMs: 5.2,
    timestampAgo: '45 mins ago',
  },
];

export default function ApiStreamTimeline() {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" /> Live Endpoint Request & Rate Limit Telemetry
          </h3>
          <p className="text-slate-400 text-xs mt-1">Real-time REST/GraphQL request logging, status code distributions, and rate-limit breach telemetry.</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-cyan-300 font-semibold font-mono">
          <Terminal className="w-4 h-4 text-cyan-400" /> Gateway Edge Router Active
        </div>
      </div>

      <div className="space-y-4">
        {RECENT_API_LOGS.map((log) => (
          <div
            key={log.id}
            className="bg-slate-950/90 border border-slate-800/90 rounded-2xl p-5 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-mono px-2 py-0.5 rounded border font-bold ${
                  log.statusCode === 200
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  HTTP {log.statusCode}
                </span>
                <span className="text-slate-500 text-xs font-mono">{log.timestampAgo}</span>
              </div>
              <h4 className="text-base font-bold text-slate-100">{log.endpoint}</h4>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Key Ref: <span className="text-slate-200">{log.keyName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-cyan-400 font-mono font-extrabold text-xs bg-cyan-500/10 px-3 py-1.5 rounded-xl border border-cyan-500/20">
                {log.latencyMs} ms
              </div>
              <div className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Logged
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { Key, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { DeveloperApiKeyItem } from '../pages/DeveloperApiPortalPage';

interface ApiKeyCardProps {
  keyItem: DeveloperApiKeyItem;
  onInspect: () => void;
}

export default function ApiKeyCard({ keyItem, onInspect }: ApiKeyCardProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:shadow-cyan-500/10 flex flex-col justify-between group">
      <div>
        {/* Header Key Name & Status */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition">
              {keyItem.keyName}
            </h3>
            <p className="text-xs text-slate-400 font-medium">Environment: {keyItem.environment}</p>
          </div>

          <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs px-2.5 py-1 rounded-lg font-mono font-semibold">
            {keyItem.status}
          </span>
        </div>

        {/* Token Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 mb-4 font-mono">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Masked API Key</div>
          <div className="text-sm font-black text-cyan-300 truncate">
            {keyItem.apiKeyMasked}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            Quota Usage: {keyItem.monthlyQuotaUsagePercent}% | Limit: {keyItem.rateLimitReqSec} req/sec
          </div>
        </div>

        {/* IP Whitelist */}
        <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-xl text-xs font-mono mb-5">
          <span className="text-slate-500 block mb-1">Allowed IP Restrictions:</span>
          <span className="text-white font-medium">{keyItem.allowedIpRanges}</span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">Last Used: {keyItem.lastUsedAgo}</span>
        <button
          onClick={onInspect}
          className="bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-cyan-500/30 transition flex items-center gap-1"
        >
          <span>Key Metrics</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

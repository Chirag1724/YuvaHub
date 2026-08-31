import React from 'react';
import { Rocket, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { StartupCohortItem } from '../pages/IncubationAcceleratorPage';

interface IncubationStartupCardProps {
  startup: StartupCohortItem;
  onInspect: () => void;
}

export default function IncubationStartupCard({ startup, onInspect }: IncubationStartupCardProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:shadow-emerald-500/10 flex flex-col justify-between group">
      <div>
        {/* Header Startup Name & Status */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition">
              {startup.startupName}
            </h3>
            <p className="text-xs text-slate-400 font-medium">Founding Lead: {startup.foundingLead}</p>
          </div>

          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-lg font-mono font-semibold">
            {startup.status}
          </span>
        </div>

        {/* Grant Disbursed Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 mb-4 font-mono">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Seed Capital Disbursed</div>
          <div className="text-2xl font-black text-white">
            ₹{(startup.totalGrantDisbursedINR / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-xs text-emerald-400 mt-1 font-semibold">
            Stage: {startup.milestoneStage}
          </div>
        </div>

        {/* Key Traction */}
        <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-xl text-xs font-mono mb-5">
          <span className="text-slate-500 block mb-1">Verified Traction Metric:</span>
          <span className="text-teal-300 font-medium">"{startup.keyTractionMetric}"</span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">Investor Score: {startup.investorReadinessScore}%</span>
        <button
          onClick={onInspect}
          className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-emerald-500/30 transition flex items-center gap-1"
        >
          <span>Cohort Deck</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

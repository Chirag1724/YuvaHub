import React from 'react';
import { Award, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { StudentFellowshipItem } from '../pages/FellowshipGrantStudioPage';

interface FellowshipGrantCardProps {
  grant: StudentFellowshipItem;
  onInspect: () => void;
}

export default function FellowshipGrantCard({ grant, onInspect }: FellowshipGrantCardProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:shadow-purple-500/10 flex flex-col justify-between group">
      <div>
        {/* Header Title & Status */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 group-hover:text-purple-300 transition">
              {grant.fellowshipTitle}
            </h3>
            <p className="text-xs text-slate-400 font-medium">Provider: {grant.grantProvider}</p>
          </div>

          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs px-2.5 py-1 rounded-lg font-mono font-semibold">
            {grant.status}
          </span>
        </div>

        {/* Stipend Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 mb-4 font-mono">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Monthly Research Stipend</div>
          <div className="text-2xl font-black text-white">
            ₹{grant.stipendAmountMonthlyINR.toLocaleString('en-IN')} / mo
          </div>
          <div className="text-xs text-purple-400 mt-1 font-semibold">
            Tenure: {grant.durationMonths} Months | Deadline: {grant.applicationDeadline}
          </div>
        </div>

        {/* Key Requirement */}
        <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-xl text-xs font-mono mb-5">
          <span className="text-slate-500 block mb-1">Mandatory Criterion:</span>
          <span className="text-indigo-300 font-medium">"{grant.keyRequirement}"</span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">AI Eligibility Match: {grant.aiEligibilityMatchScore}%</span>
        <button
          onClick={onInspect}
          className="bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-purple-500/30 transition flex items-center gap-1"
        >
          <span>Fellowship Proposal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

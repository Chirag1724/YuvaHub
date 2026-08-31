import React from 'react';
import { Award, ArrowRight, ShieldCheck, CheckCircle2, Star } from 'lucide-react';
import { HackathonSubmissionItem } from '../pages/HackathonJudgeStudioPage';

interface SubmissionEvaluationCardProps {
  submission: HackathonSubmissionItem;
  onInspect: () => void;
}

export default function SubmissionEvaluationCard({ submission, onInspect }: SubmissionEvaluationCardProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:shadow-amber-500/10 flex flex-col justify-between group">
      <div>
        {/* Header Project Name & Status */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 group-hover:text-amber-300 transition">
              {submission.projectName}
            </h3>
            <p className="text-xs text-slate-400 font-medium">Track: {submission.trackName} | {submission.teamLead}</p>
          </div>

          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-2.5 py-1 rounded-lg font-mono font-semibold">
            {submission.judgeStatus}
          </span>
        </div>

        {/* Weighted Score Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 mb-4 font-mono">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Total Weighted Jury Score</div>
          <div className="text-2xl font-black text-white flex items-center gap-2">
            <span>{submission.totalWeightedScore} / 100</span>
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-xs text-amber-400 mt-1 font-semibold">
            Tech: {submission.technicalComplexityScore} | Code: {submission.codeQualityScore}
          </div>
        </div>

        {/* GitHub Repository */}
        <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-xl text-xs font-mono mb-5">
          <span className="text-slate-500 block mb-1">Repository Audit Ref:</span>
          <span className="text-orange-300 font-medium">"{submission.githubRepoUrl}"</span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">AST Plagiarism Verified</span>
        <button
          onClick={onInspect}
          className="bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-amber-500/30 transition flex items-center gap-1"
        >
          <span>Score Rubric</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

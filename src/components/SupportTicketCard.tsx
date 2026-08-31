import React from 'react';
import { HelpCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  studentName: string;
  priority: string;
  status: string;
  createdAtAgo: string;
  aiSuggestedSolution: string;
}

interface SupportTicketCardProps {
  ticket: SupportTicket;
  onInspect: () => void;
}

export default function SupportTicketCard({ ticket, onInspect }: SupportTicketCardProps) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 shadow-xl transition-all duration-300 hover:shadow-blue-500/10 flex flex-col justify-between group">
      <div>
        {/* Header Ticket Subject & Priority */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-300 transition">
              {ticket.subject}
            </h3>
            <p className="text-xs text-slate-400 font-medium">Ticket #: {ticket.ticketNumber} | {ticket.studentName}</p>
          </div>

          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-1 rounded-lg font-mono font-semibold">
            {ticket.priority} PRIORITY
          </span>
        </div>

        {/* Category Box */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 mb-4 font-mono">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Ticket Category & SLA</div>
          <div className="text-sm font-bold text-white">
            {ticket.category}
          </div>
          <div className="text-xs text-blue-400 mt-1 font-semibold">
            Status: {ticket.status}
          </div>
        </div>

        {/* AI Suggested Solution */}
        <div className="p-3 bg-slate-900 border border-slate-800/60 rounded-xl text-xs font-mono mb-5">
          <span className="text-slate-500 block mb-1">AI Resolution Path:</span>
          <span className="text-blue-300 font-medium">"{ticket.aiSuggestedSolution}"</span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">YuvaHub Support SLA Guaranteed</span>
        <button
          onClick={onInspect}
          className="bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-blue-500/30 transition flex items-center gap-1"
        >
          <span>Ticket Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

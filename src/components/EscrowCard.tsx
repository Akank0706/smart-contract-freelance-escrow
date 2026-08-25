import React, { useState } from 'react';
import { EscrowRecord, EscrowState, Web3Account } from '../types';
import { shortenAddress, getStateMetadata, formatETH } from '../utils/web3Helper';
import { Copy, Check, ArrowRight, UserCheck, Briefcase, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';

interface EscrowCardProps {
  escrow: EscrowRecord;
  currentAccount: Web3Account;
  onOpenDetails: (escrow: EscrowRecord) => void;
  onQuickFund?: (escrow: EscrowRecord) => void;
  onQuickStartWork?: (escrow: EscrowRecord) => void;
}

export const EscrowCard: React.FC<EscrowCardProps> = ({
  escrow,
  currentAccount,
  onOpenDetails,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const stateMeta = getStateMetadata(escrow.state);

  const isClient = currentAccount.address.toLowerCase() === escrow.client.toLowerCase();
  const isFreelancer = currentAccount.address.toLowerCase() === escrow.freelancer.toLowerCase();
  const isArbitrator = currentAccount.address.toLowerCase() === escrow.arbitrator.toLowerCase();

  const handleCopy = (text: string, key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div
      onClick={() => onOpenDetails(escrow)}
      className="bento-card p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group bg-white"
    >
      <div>
        {/* Top bar: Escrow ID & Status */}
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
          <span className="font-mono font-semibold text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
            ESC-{String(escrow.id).padStart(3, '0')}
          </span>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${stateMeta.badgeBg} ${stateMeta.textColor} ${stateMeta.borderColor}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${stateMeta.dotColor}`}></span>
            <span>{stateMeta.label}</span>
          </div>
        </div>

        {/* Project Title & Description */}
        <div className="mt-3.5">
          <h3 className="font-bold text-base text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {escrow.title}
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {escrow.description}
          </p>
        </div>

        {/* Parties Bento Grid */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 gap-2.5 text-xs font-mono">
          {/* Client Block */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-sans">
              <span>Client</span>
              {isClient && (
                <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[9px]">YOU</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">{shortenAddress(escrow.client)}</span>
              <button
                onClick={(e) => handleCopy(escrow.client, `client-${escrow.id}`, e)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                title="Copy client address"
              >
                {copiedKey === `client-${escrow.id}` ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Freelancer Block */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-sans">
              <span>Freelancer</span>
              {isFreelancer && (
                <span className="bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded text-[9px]">YOU</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">{shortenAddress(escrow.freelancer)}</span>
              <button
                onClick={(e) => handleCopy(escrow.freelancer, `freelancer-${escrow.id}`, e)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                title="Copy freelancer address"
              >
                {copiedKey === `freelancer-${escrow.id}` ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* User Role Banner if involved */}
        {(isClient || isFreelancer || isArbitrator) && (
          <div className="mt-2.5 text-[11px] font-medium text-indigo-700 bg-indigo-50/70 border border-indigo-100 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="truncate">
              {isClient && 'You are the Client (Funder / Reviewer)'}
              {isFreelancer && 'You are the Assigned Freelancer'}
              {isArbitrator && 'You are the Designated Arbitrator'}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Value & Action */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Escrow Value</span>
          <span className="font-bold text-lg text-slate-900">
            {formatETH(escrow.amount)}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(escrow);
          }}
          className="btn-secondary text-xs py-1.5 px-3 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200"
        >
          <span>Manage</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

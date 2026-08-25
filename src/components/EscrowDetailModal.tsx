import React, { useState } from 'react';
import { EscrowRecord, EscrowState, Web3Account } from '../types';
import { shortenAddress, getStateMetadata, formatETH } from '../utils/web3Helper';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Play,
  Upload,
  ThumbsUp,
  XCircle,
  Gavel,
  Lock,
  ArrowRight,
  Info,
  Calendar,
  Layers
} from 'lucide-react';

interface EscrowDetailModalProps {
  escrow: EscrowRecord | null;
  currentAccount: Web3Account;
  onClose: () => void;
  onFundEscrow: (id: number, amountETH: string) => void;
  onStartWork: (id: number) => void;
  onSubmitWork: (id: number, proof: string) => void;
  onApprovePayment: (id: number) => void;
  onCancelEscrow: (id: number) => void;
  onRaiseDispute: (id: number, reason: string) => void;
  onResolveDispute: (id: number, freelancerPercent: number, rulingNote: string) => void;
}

export const EscrowDetailModal: React.FC<EscrowDetailModalProps> = ({
  escrow,
  currentAccount,
  onClose,
  onFundEscrow,
  onStartWork,
  onSubmitWork,
  onApprovePayment,
  onCancelEscrow,
  onRaiseDispute,
  onResolveDispute,
}) => {
  if (!escrow) return null;

  // Form states for modal actions
  const [submissionProofInput, setSubmissionProofInput] = useState('');
  const [disputeReasonInput, setDisputeReasonInput] = useState('');
  const [arbFreelancerPercent, setArbFreelancerPercent] = useState<number>(70);
  const [arbRulingNote, setArbRulingNote] = useState('');
  const [activeForm, setActiveForm] = useState<'submit' | 'dispute' | 'arbitrate' | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const stateMeta = getStateMetadata(escrow.state);

  const isClient = currentAccount.address.toLowerCase() === escrow.client.toLowerCase();
  const isFreelancer = currentAccount.address.toLowerCase() === escrow.freelancer.toLowerCase();
  const isArbitrator =
    currentAccount.address.toLowerCase() === escrow.arbitrator.toLowerCase() ||
    currentAccount.role === 'arbitrator';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(label);
    setTimeout(() => setCopiedAddress(null), 1800);
  };

  const workflowSteps = [
    { name: '1. Created', state: EscrowState.CREATED, done: escrow.state > EscrowState.CREATED },
    { name: '2. Funded', state: EscrowState.FUNDED, done: escrow.state > EscrowState.FUNDED && escrow.state !== EscrowState.CANCELLED },
    { name: '3. Started', state: EscrowState.IN_PROGRESS, done: escrow.state > EscrowState.IN_PROGRESS && escrow.state !== EscrowState.CANCELLED },
    { name: '4. Submitted', state: EscrowState.SUBMITTED, done: escrow.state === EscrowState.COMPLETED },
    { name: '5. Settled', state: EscrowState.COMPLETED, done: escrow.state === EscrowState.COMPLETED },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono font-semibold text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
              ESC-{String(escrow.id).padStart(3, '0')}
            </span>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${stateMeta.badgeBg} ${stateMeta.textColor} ${stateMeta.borderColor}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${stateMeta.dotColor}`}></span>
              <span>{stateMeta.label}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Title & Description Bento Box */}
          <div className="bento-card p-4 sm:p-5 bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-900">{escrow.title}</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {escrow.description}
            </p>
          </div>

          {/* Workflow Pipeline Bento Box */}
          <div className="bento-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                On-Chain Lifecycle Stage
              </span>
              <span className="text-xs font-medium text-slate-600">
                Current Status: <strong className="text-slate-900">{stateMeta.label}</strong>
              </span>
            </div>

            {/* Workflow steps bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              {workflowSteps.map((step) => {
                const isCurrent = escrow.state === step.state;
                const isPassed = step.done;

                return (
                  <div
                    key={step.name}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                      isCurrent
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold shadow-xs'
                        : isPassed
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium'
                        : 'bg-slate-50 border-slate-200/80 text-slate-400'
                    }`}
                  >
                    <span>{step.name}</span>
                    {isCurrent && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-semibold">Active</span>}
                    {isPassed && <span className="text-[10px] text-emerald-700 font-semibold">✓ Completed</span>}
                  </div>
                );
              })}
            </div>

            {/* Special notices for CANCELLED / DISPUTED / REFUNDED */}
            {escrow.state === EscrowState.DISPUTED && (
              <div className="mt-3.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2.5 text-xs">
                <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                <div>
                  <div className="font-bold text-sm">Dispute Pending Arbitration</div>
                  <div className="mt-0.5 text-rose-700">
                    Reason: "{escrow.disputeReason || 'Terms not met'}"
                  </div>
                </div>
              </div>
            )}

            {escrow.state === EscrowState.CANCELLED && (
              <div className="mt-3.5 p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs font-medium">
                ✓ Escrow cancelled prior to work start. Deposit returned to client.
              </div>
            )}

            {escrow.state === EscrowState.COMPLETED && (
              <div className="mt-3.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
                ✓ Project completed successfully. Full payment released to freelancer.
              </div>
            )}
          </div>

          {/* Financial & Address Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Summary Box */}
            <div className="bento-card p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Financial Settlement Specs
              </span>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Total Escrow Value:</span>
                  <span className="font-bold text-sm text-slate-900">{formatETH(escrow.amount)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Contract Vault Status:</span>
                  <span className="font-semibold text-slate-800">
                    {escrow.state === EscrowState.CREATED || escrow.state === EscrowState.CANCELLED || escrow.state === EscrowState.COMPLETED || escrow.state === EscrowState.REFUNDED
                      ? '0.00 ETH (Released)'
                      : `${escrow.amount} ETH (Locked)`}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Freelancer Payout:</span>
                  <span className="font-semibold text-emerald-700">
                    {escrow.freelancerPayout ? formatETH(escrow.freelancerPayout) : 'Pending approval'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Client Refund:</span>
                  <span className="font-semibold text-slate-700">
                    {escrow.clientRefund ? formatETH(escrow.clientRefund) : '0.00 ETH'}
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Contract Parties Box */}
            <div className="bento-card p-4 sm:p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Contract Participant Wallets
              </span>
              <div className="space-y-2 text-xs font-mono">
                {/* Client item */}
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                      Client {isClient && <span className="text-indigo-600 font-bold">(YOU)</span>}
                    </span>
                    <span className="font-medium text-slate-800">{shortenAddress(escrow.client, 6)}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(escrow.client, 'client')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Copy full address"
                  >
                    {copiedAddress === 'client' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Freelancer item */}
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                      Freelancer {isFreelancer && <span className="text-indigo-600 font-bold">(YOU)</span>}
                    </span>
                    <span className="font-medium text-slate-800">{shortenAddress(escrow.freelancer, 6)}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(escrow.freelancer, 'freelancer')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Copy full address"
                  >
                    {copiedAddress === 'freelancer' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Arbitrator item */}
                <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                      Arbitrator {isArbitrator && <span className="text-indigo-600 font-bold">(YOU)</span>}
                    </span>
                    <span className="font-medium text-slate-800">{shortenAddress(escrow.arbitrator, 6)}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(escrow.arbitrator, 'arbitrator')}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                    title="Copy full address"
                  >
                    {copiedAddress === 'arbitrator' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Deliverables / Submission Proof Block */}
          {escrow.submissionProof && (
            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block mb-1">
                Submitted Work Deliverables
              </span>
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                <span className="font-medium text-slate-800 break-all">{escrow.submissionProof}</span>
                {escrow.submissionProof.startsWith('http') && (
                  <a
                    href={escrow.submissionProof}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs py-1 px-3 text-indigo-700 font-sans"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Link</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Arbitrator Ruling Notes if settled */}
          {escrow.arbitrationRuling && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-900 block mb-1">
                Arbitration Settlement Decision
              </span>
              <p className="text-xs text-slate-800">{escrow.arbitrationRuling}</p>
            </div>
          )}

          {/* Sub-form for Submitting Work */}
          {activeForm === 'submit' && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
              <div className="font-bold text-sm text-slate-900 flex items-center justify-between">
                <span>Submit Deliverable Proof</span>
                <button onClick={() => setActiveForm(null)} className="text-slate-500 hover:text-slate-800 font-medium text-xs">Cancel</button>
              </div>
              <p className="text-xs text-slate-600">
                Provide IPFS hash, GitHub Pull Request link, or live staging URL as proof of completion.
              </p>
              <input
                type="text"
                placeholder="e.g. https://github.com/my-repo/pull/12 or ipfs://Qm..."
                value={submissionProofInput}
                onChange={(e) => setSubmissionProofInput(e.target.value)}
                className="bento-input text-xs"
              />
              <button
                disabled={!submissionProofInput.trim()}
                onClick={() => {
                  onSubmitWork(escrow.id, submissionProofInput.trim());
                  setActiveForm(null);
                }}
                className="btn-primary w-full text-xs"
              >
                <Upload className="w-4 h-4" />
                <span>Confirm On-Chain Work Submission</span>
              </button>
            </div>
          )}

          {/* Sub-form for Raising Dispute */}
          {activeForm === 'dispute' && (
            <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-3">
              <div className="font-bold text-sm text-rose-900 flex items-center justify-between">
                <span>Raise On-Chain Dispute</span>
                <button onClick={() => setActiveForm(null)} className="text-slate-500 hover:text-slate-800 font-medium text-xs">Cancel</button>
              </div>
              <p className="text-xs text-slate-600">
                Opening a dispute halts automatic release and assigns the escrow to the designated arbitrator for review.
              </p>
              <textarea
                placeholder="Explain what terms were breached or deliverables missing..."
                value={disputeReasonInput}
                onChange={(e) => setDisputeReasonInput(e.target.value)}
                rows={3}
                className="bento-input text-xs"
              />
              <button
                disabled={!disputeReasonInput.trim()}
                onClick={() => {
                  onRaiseDispute(escrow.id, disputeReasonInput.trim());
                  setActiveForm(null);
                }}
                className="w-full inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Submit Dispute to Arbitrator</span>
              </button>
            </div>
          )}

          {/* Sub-form for Arbitrator Resolution */}
          {activeForm === 'arbitrate' && (
            <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3.5">
              <div className="font-bold text-sm text-slate-900 flex items-center justify-between">
                <span>Arbitrator Dispute Settlement Panel</span>
                <button onClick={() => setActiveForm(null)} className="text-slate-500 hover:text-slate-800 font-medium text-xs">Cancel</button>
              </div>
              <div className="text-xs space-y-2">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Freelancer Payout:</span>
                  <span className="text-indigo-700 font-bold">{arbFreelancerPercent}% ({((parseFloat(escrow.amount) * arbFreelancerPercent) / 100).toFixed(3)} ETH)</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Client Refund:</span>
                  <span className="text-slate-800 font-bold">{100 - arbFreelancerPercent}% ({((parseFloat(escrow.amount) * (100 - arbFreelancerPercent)) / 100).toFixed(3)} ETH)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={arbFreelancerPercent}
                  onChange={(e) => setArbFreelancerPercent(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Arbitration Ruling Justification Note:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 70% paid for verified backend API, 30% refunded for missing documentation."
                  value={arbRulingNote}
                  onChange={(e) => setArbRulingNote(e.target.value)}
                  className="bento-input text-xs"
                />
              </div>

              <button
                disabled={!arbRulingNote.trim()}
                onClick={() => {
                  onResolveDispute(escrow.id, arbFreelancerPercent, arbRulingNote.trim());
                  setActiveForm(null);
                }}
                className="btn-primary w-full text-xs font-semibold"
              >
                <Gavel className="w-4 h-4" />
                <span>Execute Final Smart Contract Ruling</span>
              </button>
            </div>
          )}

          {/* Action Control Panel Bento Box */}
          <div className="bento-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Play className="w-4 h-4 text-slate-400" /> Available Smart Contract Actions
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Active Role: <strong className="uppercase text-slate-900">{currentAccount.role}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {/* Client Action 1: Fund Escrow */}
              {isClient && escrow.state === EscrowState.CREATED && (
                <button
                  onClick={() => onFundEscrow(escrow.id, escrow.amount)}
                  className="btn-primary text-xs sm:text-sm py-2 px-4"
                >
                  <Lock className="w-4 h-4" />
                  <span>Deposit & Fund ({formatETH(escrow.amount)})</span>
                </button>
              )}

              {/* Client Action 2: Approve & Release Payment */}
              {isClient && escrow.state === EscrowState.SUBMITTED && (
                <button
                  onClick={() => onApprovePayment(escrow.id)}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm py-2 px-4 rounded-xl shadow-xs transition-all"
                >
                  <ThumbsUp className="w-4 h-4" />
                  <span>Approve Deliverables & Release Payout</span>
                </button>
              )}

              {/* Client Action 3: Cancel & Refund */}
              {isClient && (escrow.state === EscrowState.CREATED || escrow.state === EscrowState.FUNDED) && (
                <button
                  onClick={() => onCancelEscrow(escrow.id)}
                  className="btn-secondary text-xs sm:text-sm py-2 px-3.5"
                >
                  <XCircle className="w-4 h-4 text-slate-400" />
                  <span>Cancel Project & Refund</span>
                </button>
              )}

              {/* Freelancer Action 1: Start Work */}
              {isFreelancer && escrow.state === EscrowState.FUNDED && (
                <button
                  onClick={() => onStartWork(escrow.id)}
                  className="btn-primary text-xs sm:text-sm py-2 px-4"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Work On Escrow</span>
                </button>
              )}

              {/* Freelancer Action 2: Submit Work */}
              {isFreelancer && (escrow.state === EscrowState.FUNDED || escrow.state === EscrowState.IN_PROGRESS) && (
                <button
                  onClick={() => setActiveForm(activeForm === 'submit' ? null : 'submit')}
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs sm:text-sm py-2 px-4 rounded-xl shadow-xs transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Submit Deliverable Proof</span>
                </button>
              )}

              {/* Dispute Action (Either Client or Freelancer on active escrows) */}
              {(isClient || isFreelancer) &&
                (escrow.state === EscrowState.FUNDED ||
                  escrow.state === EscrowState.IN_PROGRESS ||
                  escrow.state === EscrowState.SUBMITTED) && (
                  <button
                    onClick={() => setActiveForm(activeForm === 'dispute' ? null : 'dispute')}
                    className="inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs sm:text-sm py-2 px-3.5 rounded-xl shadow-xs transition-all"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>Raise Dispute</span>
                  </button>
                )}

              {/* Arbitrator Action: Resolve Dispute */}
              {isArbitrator && escrow.state === EscrowState.DISPUTED && (
                <button
                  onClick={() => setActiveForm(activeForm === 'arbitrate' ? null : 'arbitrate')}
                  className="btn-primary text-xs sm:text-sm py-2 px-4"
                >
                  <Gavel className="w-4 h-4" />
                  <span>Open Arbitration Settlement</span>
                </button>
              )}

              {/* Notice if user has no pending action */}
              {!isClient && !isFreelancer && !isArbitrator && (
                <div className="text-xs text-slate-500 flex items-center gap-2 py-1 font-medium">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Observer Mode: Switch persona in the header bar to interact with this contract.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Created: {new Date(escrow.createdAt).toLocaleDateString()}
          </span>
          <button onClick={onClose} className="btn-secondary text-xs py-1.5 px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

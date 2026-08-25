import React, { useState } from 'react';
import { Web3Account } from '../types';
import { X, Plus, AlertCircle, Sparkles, Shield, User, DollarSign, FileText } from 'lucide-react';

interface CreateEscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: Web3Account;
  accounts: Web3Account[];
  onCreateEscrow: (
    freelancer: string,
    arbitrator: string,
    title: string,
    description: string,
    amountETH: string,
    fundImmediately: boolean
  ) => void;
}

export const CreateEscrowModal: React.FC<CreateEscrowModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  accounts,
  onCreateEscrow,
}) => {
  if (!isOpen) return null;

  const [freelancer, setFreelancer] = useState('');
  const [arbitrator, setArbitrator] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountETH, setAmountETH] = useState('');
  const [fundImmediately, setFundImmediately] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Sample freelancers from accounts
  const freelancerAccounts = accounts.filter(
    (a) => a.address.toLowerCase() !== currentAccount.address.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Project title is required.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Project description is required.');
      return;
    }

    const cleanFreelancer = freelancer.trim();
    if (!cleanFreelancer || !/^0x[a-fA-F0-9]{40}$/.test(cleanFreelancer)) {
      setErrorMsg('Please enter a valid 42-character Ethereum address (0x...) for the freelancer.');
      return;
    }

    if (cleanFreelancer.toLowerCase() === currentAccount.address.toLowerCase()) {
      setErrorMsg('Client cannot be the freelancer for their own escrow.');
      return;
    }

    const parsedAmt = parseFloat(amountETH);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setErrorMsg('Please enter a valid escrow amount greater than 0 ETH.');
      return;
    }

    if (fundImmediately && parsedAmt > parseFloat(currentAccount.balanceETH)) {
      setErrorMsg(`Insufficient balance. Your wallet has ${currentAccount.balanceETH} ETH.`);
      return;
    }

    onCreateEscrow(
      cleanFreelancer,
      arbitrator.trim() || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      title.trim(),
      description.trim(),
      amountETH.trim(),
      fundImmediately
    );

    // Reset and close
    setTitle('');
    setDescription('');
    setFreelancer('');
    setAmountETH('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900">
                Create New Escrow
              </h2>
              <p className="text-xs text-slate-500">
                Deploy an immutable on-chain payment vault
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Connected Client Notice */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5 font-sans">
              Deploying Client
            </span>
            <span className="font-mono text-slate-800 font-medium break-all">{currentAccount.address}</span>
            <span className="block text-[11px] text-slate-500 mt-1">
              Available Balance: <strong className="text-slate-900">{currentAccount.balanceETH} ETH</strong>
            </span>
          </div>

          {/* Project Title */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Project Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Full-Stack Web3 DApp Development"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bento-input"
              required
            />
          </div>

          {/* Project Description */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Deliverables & Scope <span className="text-rose-500">*</span>
            </label>
            <textarea
              placeholder="Describe milestones, expected source code repository, deadlines, and deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bento-input"
              required
            />
          </div>

          {/* Freelancer Address with Quick Selector */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Freelancer Wallet Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
              value={freelancer}
              onChange={(e) => setFreelancer(e.target.value)}
              className="bento-input font-mono text-xs"
              required
            />
            {/* Quick autofill buttons */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-medium">Quick Select:</span>
              {freelancerAccounts.slice(0, 3).map((acc) => (
                <button
                  type="button"
                  key={acc.address}
                  onClick={() => setFreelancer(acc.address)}
                  className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 border border-slate-200 px-2 py-0.5 rounded-md text-slate-600 font-medium transition-colors"
                >
                  {acc.name.split(' ')[0]} ({acc.role})
                </button>
              ))}
            </div>
          </div>

          {/* Escrow Amount */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Escrow Amount (ETH) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="1.50"
                value={amountETH}
                onChange={(e) => setAmountETH(e.target.value)}
                className="bento-input pr-12 font-mono"
                required
              />
              <span className="absolute right-3 top-2.5 font-semibold text-slate-400">ETH</span>
            </div>
          </div>

          {/* Arbitrator (Optional) */}
          <div>
            <label className="block font-semibold text-slate-500 mb-1.5">
              Designated Arbitrator (Optional — defaults to platform arbitrator)
            </label>
            <input
              type="text"
              placeholder="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Platform Arb)"
              value={arbitrator}
              onChange={(e) => setArbitrator(e.target.value)}
              className="bento-input font-mono text-xs"
            />
          </div>

          {/* Immediate funding checkbox */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3">
            <input
              type="checkbox"
              id="fundImmediately"
              checked={fundImmediately}
              onChange={(e) => setFundImmediately(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="fundImmediately" className="cursor-pointer text-xs">
              <span className="font-semibold text-slate-900 block">Deposit & Lock ETH immediately</span>
              <span className="text-[11px] text-slate-500 block mt-0.5">
                Transfers the agreed amount into the smart contract vault in the deployment transaction.
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="btn-primary w-full py-3 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Deploy Escrow Contract</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React from 'react';
import { TransactionStatus } from '../types';
import { shortenAddress } from '../utils/web3Helper';
import { Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface TransactionBannerProps {
  txStatus: TransactionStatus;
  onDismiss: () => void;
}

export const TransactionBanner: React.FC<TransactionBannerProps> = ({ txStatus, onDismiss }) => {
  if (txStatus.status === 'idle') return null;

  return (
    <div
      className={`p-3.5 mb-6 text-xs rounded-xl border flex items-center justify-between gap-3 shadow-xs transition-all ${
        txStatus.status === 'pending'
          ? 'bg-amber-50/90 text-amber-900 border-amber-200'
          : txStatus.status === 'confirmed'
          ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200'
          : 'bg-rose-50/90 text-rose-900 border-rose-200'
      }`}
    >
      <div className="flex items-center gap-3">
        {txStatus.status === 'pending' && <Loader2 className="w-5 h-5 animate-spin shrink-0 text-amber-600" />}
        {txStatus.status === 'confirmed' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />}
        {txStatus.status === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />}

        <div>
          <div className="font-semibold text-sm">
            {txStatus.title ||
              (txStatus.status === 'pending'
                ? 'Blockchain Transaction Pending...'
                : txStatus.status === 'confirmed'
                ? 'Transaction Confirmed on Block'
                : 'Transaction Reverted / Failed')}
          </div>
          <div className="text-xs opacity-90 mt-0.5">
            {txStatus.message}
            {txStatus.txHash && (
              <span className="ml-2 font-mono font-medium underline">
                Tx: {shortenAddress(txStatus.txHash, 6)}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

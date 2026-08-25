import React from 'react';
import { Web3Account } from '../types';
import { shortenAddress } from '../utils/web3Helper';
import { Wallet, Plus, BookOpen, RefreshCw, Shield, ArrowRightLeft } from 'lucide-react';

interface HeaderProps {
  accounts: Web3Account[];
  currentAccount: Web3Account;
  onSelectAccount: (account: Web3Account) => void;
  isMetaMaskConnected: boolean;
  onConnectMetaMask: () => void;
  onOpenCreateModal: () => void;
  onOpenDocsModal: () => void;
  onAddFaucetEth: () => void;
  contractBalanceETH: string;
}

export const Header: React.FC<HeaderProps> = ({
  accounts,
  currentAccount,
  onSelectAccount,
  isMetaMaskConnected,
  onConnectMetaMask,
  onOpenCreateModal,
  onOpenDocsModal,
  onAddFaucetEth,
  contractBalanceETH,
}) => {
  const getRoleBadge = (role: Web3Account['role']) => {
    switch (role) {
      case 'client':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'freelancer':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'arbitrator':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5">
          {/* Logo and Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-xs tracking-tight">
              Ξ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  EscrowChain
                </span>
                <span className="bg-slate-100 text-slate-600 text-[11px] font-mono font-medium px-2 py-0.5 rounded-md border border-slate-200">
                  v1.0.4
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal hidden sm:block">
                Trust-minimized smart contract payment & dispute settlement protocol
              </p>
            </div>
          </div>

          {/* Action buttons & Network control */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Hardhat local network pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-slate-700">Hardhat Local #31337</span>
            </div>

            {/* View Docs & Code Button */}
            <button
              onClick={onOpenDocsModal}
              className="btn-secondary text-xs sm:text-sm py-2 px-3.5"
              title="View Smart Contract, Tests, and Documentation"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>Contracts & Docs</span>
            </button>

            {/* Quick Faucet Button */}
            <button
              onClick={onAddFaucetEth}
              className="btn-secondary text-xs py-2 px-3 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
              title="Add 1.0 virtual ETH to active wallet"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>+1.0 ETH</span>
            </button>

            {/* Create New Escrow Button */}
            <button
              onClick={onOpenCreateModal}
              className="btn-primary text-xs sm:text-sm py-2 px-4"
            >
              <Plus className="w-4 h-4" />
              <span>Create Escrow</span>
            </button>
          </div>
        </div>

        {/* Account Selector & Role Switcher Bento Row */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-medium text-slate-500 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" /> Active Persona:
            </span>

            <select
              value={currentAccount.address}
              onChange={(e) => {
                const found = accounts.find((a) => a.address.toLowerCase() === e.target.value.toLowerCase());
                if (found) onSelectAccount(found);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {accounts.map((acc) => (
                <option key={acc.address} value={acc.address}>
                  [{acc.role.toUpperCase()}] {acc.name} — {shortenAddress(acc.address)} ({acc.balanceETH} ETH)
                </option>
              ))}
            </select>

            <span className={`px-2.5 py-0.5 font-medium text-[11px] rounded-md border ${getRoleBadge(currentAccount.role)}`}>
              Role: <strong className="uppercase">{currentAccount.role}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-2">
              <span className="text-slate-500 font-medium text-[11px]">Vault TVL:</span>
              <span className="font-bold text-slate-900 text-xs">{contractBalanceETH} ETH</span>
            </div>

            {/* MetaMask connect if browser has window.ethereum */}
            {typeof window !== 'undefined' && (window as any).ethereum && (
              <button
                onClick={onConnectMetaMask}
                className={`text-xs py-1 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-colors ${
                  isMetaMaskConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{isMetaMaskConnected ? 'MetaMask Linked' : 'Connect MetaMask'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

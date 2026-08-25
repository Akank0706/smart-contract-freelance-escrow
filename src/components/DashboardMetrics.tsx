import React from 'react';
import { EscrowRecord, EscrowState } from '../types';
import { Layers, Lock, CheckCircle2, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

interface DashboardMetricsProps {
  escrows: EscrowRecord[];
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({ escrows }) => {
  const totalEscrows = escrows.length;
  
  const activeEscrows = escrows.filter(
    (e) => e.state === EscrowState.FUNDED || e.state === EscrowState.IN_PROGRESS || e.state === EscrowState.SUBMITTED
  ).length;

  const completedEscrows = escrows.filter((e) => e.state === EscrowState.COMPLETED).length;

  const disputedEscrows = escrows.filter((e) => e.state === EscrowState.DISPUTED).length;

  // Calculate TVL (Total value locked in FUNDED, IN_PROGRESS, SUBMITTED, DISPUTED)
  const lockedEth = escrows
    .filter(
      (e) =>
        e.state === EscrowState.FUNDED ||
        e.state === EscrowState.IN_PROGRESS ||
        e.state === EscrowState.SUBMITTED ||
        e.state === EscrowState.DISPUTED
    )
    .reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);

  const totalVolumeEth = escrows.reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0);

  const successRate = totalEscrows > 0 ? ((completedEscrows / (completedEscrows + disputedEscrows || 1)) * 100).toFixed(1) : '100.0';

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* Metric 1: Total Volume */}
      <div className="bento-card p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Total Volume</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Lock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {totalVolumeEth.toFixed(2)} <span className="text-sm font-medium text-slate-400">ETH</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            {lockedEth.toFixed(2)} ETH active locked in vault
          </div>
        </div>
      </div>

      {/* Metric 2: Active Escrows */}
      <div className="bento-card p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Escrows</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {activeEscrows} <span className="text-sm font-medium text-slate-400">jobs</span>
          </div>
          <div className="mt-1 text-xs text-blue-600 font-medium">
            In funding, progress & review
          </div>
        </div>
      </div>

      {/* Metric 3: Success Rate & Completed */}
      <div className="bento-card p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Success Rate</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600">
            {successRate}%
          </div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            {completedEscrows} contracts settled smoothly
          </div>
        </div>
      </div>

      {/* Metric 4: Pending Disputes */}
      <div className="bento-card p-4 sm:p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pending Disputes</span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${disputedEscrows > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {disputedEscrows}
          </div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            {disputedEscrows > 0 ? 'Awaiting arbitrator ruling' : 'Zero disputes pending'}
          </div>
        </div>
      </div>
    </section>
  );
};

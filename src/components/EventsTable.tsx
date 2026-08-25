import React, { useState } from 'react';
import { BlockchainEventLog } from '../types';
import { shortenAddress } from '../utils/web3Helper';
import { Activity, Filter, Copy, Check } from 'lucide-react';

interface EventsTableProps {
  events: BlockchainEventLog[];
}

export const EventsTable: React.FC<EventsTableProps> = ({ events }) => {
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const filteredEvents =
    filterEvent === 'all'
      ? events
      : events.filter((e) => e.eventName.toLowerCase() === filterEvent.toLowerCase());

  const handleCopy = (tx: string) => {
    navigator.clipboard.writeText(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 1800);
  };

  const getEventBadge = (name: string) => {
    switch (name) {
      case 'EscrowCreated':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'FundsDeposited':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'WorkStarted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'WorkSubmitted':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PaymentReleased':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EscrowCancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'DisputeRaised':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DisputeResolved':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <section className="bento-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              On-Chain Event Logs & Audit Trail
            </h3>
            <p className="text-xs text-slate-500">
              Live cryptographic event emissions from the EVM smart contract
            </p>
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">All Events ({events.length})</option>
            <option value="EscrowCreated">EscrowCreated</option>
            <option value="FundsDeposited">FundsDeposited</option>
            <option value="WorkStarted">WorkStarted</option>
            <option value="WorkSubmitted">WorkSubmitted</option>
            <option value="PaymentReleased">PaymentReleased</option>
            <option value="EscrowCancelled">EscrowCancelled</option>
            <option value="DisputeRaised">DisputeRaised</option>
            <option value="DisputeResolved">DisputeResolved</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="overflow-x-auto mt-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No events found matching this filter.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Event</th>
                <th className="py-2.5 px-3">Contract</th>
                <th className="py-2.5 px-3">Payload Summary</th>
                <th className="py-2.5 px-3">Caller</th>
                <th className="py-2.5 px-3">Block / Tx</th>
                <th className="py-2.5 px-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getEventBadge(
                        evt.eventName
                      )}`}
                    >
                      {evt.eventName}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                    ESC-{String(evt.escrowId).padStart(3, '0')}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={evt.dataSummary}>
                    {evt.dataSummary}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">{shortenAddress(evt.from, 4)}</td>
                  <td className="py-2.5 px-3 font-mono">
                    <button
                      onClick={() => handleCopy(evt.txHash)}
                      className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium group"
                      title="Copy transaction hash"
                    >
                      <span>#{evt.blockNumber}</span>
                      <span className="text-[11px] text-slate-400">({shortenAddress(evt.txHash, 3)})</span>
                      {copiedTx === evt.txHash ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                      )}
                    </button>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

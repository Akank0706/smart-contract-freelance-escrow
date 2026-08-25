import { EscrowState } from '../types';

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length < chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

export function formatETH(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00 ETH';
  return `${num.toFixed(num % 1 === 0 ? 2 : 4)} ETH`;
}

export function getStateMetadata(state: EscrowState): {
  label: string;
  badgeBg: string;
  textColor: string;
  dotColor: string;
  borderColor: string;
  description: string;
} {
  switch (state) {
    case EscrowState.CREATED:
      return {
        label: 'Awaiting Deposit',
        badgeBg: 'bg-slate-100',
        textColor: 'text-slate-700',
        dotColor: 'bg-slate-400',
        borderColor: 'border-slate-200',
        description: 'Escrow contract initialized. Awaiting deposit from client.',
      };
    case EscrowState.FUNDED:
      return {
        label: 'Funded & Ready',
        badgeBg: 'bg-amber-50',
        textColor: 'text-amber-700',
        dotColor: 'bg-amber-500',
        borderColor: 'border-amber-200',
        description: 'Payment locked in smart contract. Ready for freelancer to start work.',
      };
    case EscrowState.IN_PROGRESS:
      return {
        label: 'In Progress',
        badgeBg: 'bg-blue-50',
        textColor: 'text-blue-700',
        dotColor: 'bg-blue-500',
        borderColor: 'border-blue-200',
        description: 'Freelancer is actively working on the project deliverables.',
      };
    case EscrowState.SUBMITTED:
      return {
        label: 'Work Submitted',
        badgeBg: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        dotColor: 'bg-indigo-500',
        borderColor: 'border-indigo-200',
        description: 'Deliverables submitted. Awaiting client review and approval.',
      };
    case EscrowState.COMPLETED:
      return {
        label: 'Completed',
        badgeBg: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        dotColor: 'bg-emerald-500',
        borderColor: 'border-emerald-200',
        description: 'Work approved. Full payment released to freelancer.',
      };
    case EscrowState.CANCELLED:
      return {
        label: 'Cancelled',
        badgeBg: 'bg-slate-100',
        textColor: 'text-slate-600',
        dotColor: 'bg-slate-400',
        borderColor: 'border-slate-200',
        description: 'Cancelled before work started. Client deposit fully refunded.',
      };
    case EscrowState.DISPUTED:
      return {
        label: 'Disputed',
        badgeBg: 'bg-rose-50',
        textColor: 'text-rose-700',
        dotColor: 'bg-rose-500',
        borderColor: 'border-rose-200',
        description: 'Dispute opened. Locked funds pending arbitrator settlement.',
      };
    case EscrowState.REFUNDED:
      return {
        label: 'Refunded',
        badgeBg: 'bg-purple-50',
        textColor: 'text-purple-700',
        dotColor: 'bg-purple-500',
        borderColor: 'border-purple-200',
        description: 'Arbitrator ruled in favor of client refund or cancellation.',
      };
    default:
      return {
        label: 'Unknown',
        badgeBg: 'bg-slate-100',
        textColor: 'text-slate-700',
        dotColor: 'bg-slate-400',
        borderColor: 'border-slate-200',
        description: 'Unknown state',
      };
  }
}

export function generateMockTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

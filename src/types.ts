export enum EscrowState {
  CREATED = 0,
  FUNDED = 1,
  IN_PROGRESS = 2,
  SUBMITTED = 3,
  COMPLETED = 4,
  CANCELLED = 5,
  DISPUTED = 6,
  REFUNDED = 7,
}

export interface EscrowRecord {
  id: number;
  title: string;
  description: string;
  client: string;
  freelancer: string;
  arbitrator: string;
  amount: string; // in ETH (formatted)
  amountWei: string; // in Wei (raw)
  createdAt: number;
  fundedAt?: number;
  submittedAt?: number;
  completedAt?: number;
  state: EscrowState;
  submissionProof?: string;
  disputeReason?: string;
  arbitrationRuling?: string;
  freelancerPayout?: string;
  clientRefund?: string;
  txHash?: string;
}

export interface Web3Account {
  name: string;
  role: 'client' | 'freelancer' | 'arbitrator' | 'observer';
  address: string;
  privateKey?: string;
  balanceETH: string;
}

export interface BlockchainEventLog {
  id: string;
  eventName: string;
  escrowId: number;
  from: string;
  to?: string;
  amountETH?: string;
  dataSummary: string;
  timestamp: number;
  txHash: string;
  blockNumber: number;
}

export interface TransactionStatus {
  status: 'idle' | 'pending' | 'confirmed' | 'error';
  title?: string;
  message?: string;
  txHash?: string;
}

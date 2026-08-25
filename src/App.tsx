import React, { useState, useEffect } from 'react';
import { EscrowRecord, EscrowState, Web3Account, BlockchainEventLog, TransactionStatus } from './types';
import { DEFAULT_ACCOUNTS, INITIAL_ESCROWS, INITIAL_EVENT_LOGS } from './contract/mockData';
import { generateMockTxHash, formatETH, shortenAddress } from './utils/web3Helper';
import { Header } from './components/Header';
import { DashboardMetrics } from './components/DashboardMetrics';
import { EscrowCard } from './components/EscrowCard';
import { EscrowDetailModal } from './components/EscrowDetailModal';
import { CreateEscrowModal } from './components/CreateEscrowModal';
import { EventsTable } from './components/EventsTable';
import { DocumentationModal } from './components/DocumentationModal';
import { TransactionBanner } from './components/TransactionBanner';
import { Search, Plus, Filter, ShieldCheck, Sparkles, Layers, ArrowRight, Shield, Activity, Lock } from 'lucide-react';

export default function App() {
  // Application State
  const [accounts, setAccounts] = useState<Web3Account[]>(DEFAULT_ACCOUNTS);
  const [currentAccount, setCurrentAccount] = useState<Web3Account>(DEFAULT_ACCOUNTS[1]); // Default to Client Alice
  const [escrows, setEscrows] = useState<EscrowRecord[]>(INITIAL_ESCROWS);
  const [events, setEvents] = useState<BlockchainEventLog[]>(INITIAL_EVENT_LOGS);
  const [selectedEscrow, setSelectedEscrow] = useState<EscrowRecord | null>(null);

  // Filter and Search State
  const [filterState, setFilterState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyMyEscrows, setOnlyMyEscrows] = useState<boolean>(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);

  // MetaMask integration state
  const [isMetaMaskConnected, setIsMetaMaskConnected] = useState<boolean>(false);

  // Transaction banner notification
  const [txStatus, setTxStatus] = useState<TransactionStatus>({ status: 'idle' });

  // Calculate smart contract locked balance
  const contractBalanceETH = escrows
    .filter(
      (e) =>
        e.state === EscrowState.FUNDED ||
        e.state === EscrowState.IN_PROGRESS ||
        e.state === EscrowState.SUBMITTED ||
        e.state === EscrowState.DISPUTED
    )
    .reduce((acc, curr) => acc + parseFloat(curr.amount || '0'), 0)
    .toFixed(4);

  // Keep selectedEscrow synchronized with list state
  useEffect(() => {
    if (selectedEscrow) {
      const updated = escrows.find((e) => e.id === selectedEscrow.id);
      if (updated) {
        setSelectedEscrow(updated);
      }
    }
  }, [escrows]);

  // Handle MetaMask connection
  const handleConnectMetaMask = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const ethereum = (window as any).ethereum;
        const accts = await ethereum.request({ method: 'eth_requestAccounts' });
        if (accts.length > 0) {
          const metaAccount: Web3Account = {
            name: 'MetaMask Account',
            role: 'client',
            address: accts[0],
            balanceETH: '10.0000',
          };
          setAccounts((prev) => [metaAccount, ...prev.filter((a) => a.address.toLowerCase() !== accts[0].toLowerCase())]);
          setCurrentAccount(metaAccount);
          setIsMetaMaskConnected(true);
          showTxNotification({
            status: 'confirmed',
            title: 'MetaMask Connected',
            message: `Linked external wallet: ${shortenAddress(accts[0], 6)}`,
          });
        }
      } catch (err: any) {
        showTxNotification({
          status: 'error',
          title: 'MetaMask Connection Failed',
          message: err.message || 'User rejected wallet connection request.',
        });
      }
    }
  };

  // Quick virtual Faucet handler
  const handleAddFaucetEth = () => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.address.toLowerCase() === currentAccount.address.toLowerCase()
          ? { ...acc, balanceETH: (parseFloat(acc.balanceETH) + 1.0).toFixed(4) }
          : acc
      )
    );
    setCurrentAccount((prev) => ({
      ...prev,
      balanceETH: (parseFloat(prev.balanceETH) + 1.0).toFixed(4),
    }));
    showTxNotification({
      status: 'confirmed',
      title: 'Local Faucet +1.0 ETH',
      message: `Credited test ETH to ${shortenAddress(currentAccount.address)}`,
    });
  };

  // Helper for displaying real pending -> confirmed blockchain interaction animation
  const showTxNotification = (status: TransactionStatus, autoDismissMs = 6000) => {
    setTxStatus(status);
    if (status.status === 'confirmed' || status.status === 'error') {
      setTimeout(() => {
        setTxStatus({ status: 'idle' });
      }, autoDismissMs);
    }
  };

  // --- ESCROW TRANSACTION HANDLERS ---

  // 1. Create Escrow
  const handleCreateEscrow = (
    freelancer: string,
    arbitrator: string,
    title: string,
    description: string,
    amountETH: string,
    fundImmediately: boolean
  ) => {
    const txHash = generateMockTxHash();
    showTxNotification({
      status: 'pending',
      title: 'Creating Escrow Smart Contract...',
      message: 'Broadcasting transaction to EVM mempool...',
      txHash,
    });

    setTimeout(() => {
      const newId = escrows.length > 0 ? Math.max(...escrows.map((e) => e.id)) + 1 : 1;
      const initialStatus = fundImmediately ? EscrowState.FUNDED : EscrowState.CREATED;

      const newEscrow: EscrowRecord = {
        id: newId,
        title,
        description,
        client: currentAccount.address,
        freelancer,
        arbitrator: arbitrator || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: parseFloat(amountETH).toFixed(2),
        amountWei: (parseFloat(amountETH) * 1e18).toString(),
        createdAt: Date.now(),
        fundedAt: fundImmediately ? Date.now() : undefined,
        state: initialStatus,
        txHash,
      };

      // Deduct client balance if funded immediately
      if (fundImmediately) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.address.toLowerCase() === currentAccount.address.toLowerCase()
              ? { ...acc, balanceETH: Math.max(0, parseFloat(acc.balanceETH) - parseFloat(amountETH)).toFixed(4) }
              : acc
          )
        );
        setCurrentAccount((prev) => ({
          ...prev,
          balanceETH: Math.max(0, parseFloat(prev.balanceETH) - parseFloat(amountETH)).toFixed(4),
        }));
      }

      setEscrows((prev) => [newEscrow, ...prev]);

      // Emit events
      const newEvents: BlockchainEventLog[] = [
        {
          id: `evt-${Date.now()}-1`,
          eventName: 'EscrowCreated',
          escrowId: newId,
          from: currentAccount.address,
          to: freelancer,
          amountETH,
          dataSummary: `Created #${newId} "${title}" for ${amountETH} ETH`,
          timestamp: Date.now(),
          txHash,
          blockNumber: 1043300 + newId,
        },
      ];

      if (fundImmediately) {
        newEvents.push({
          id: `evt-${Date.now()}-2`,
          eventName: 'FundsDeposited',
          escrowId: newId,
          from: currentAccount.address,
          amountETH,
          dataSummary: `Deposited & locked ${amountETH} ETH into contract balance`,
          timestamp: Date.now(),
          txHash,
          blockNumber: 1043300 + newId,
        });
      }

      setEvents((prev) => [...newEvents, ...prev]);

      showTxNotification({
        status: 'confirmed',
        title: 'Escrow Contract Initialized',
        message: `Escrow #${newId} deployed ${fundImmediately ? 'and funded' : ''} on block #${1043300 + newId}`,
        txHash,
      });
    }, 1200);
  };

  // 2. Fund Escrow
  const handleFundEscrow = (id: number, amountETH: string) => {
    const txHash = generateMockTxHash();
    showTxNotification({
      status: 'pending',
      title: 'Depositing ETH into Escrow Vault...',
      message: 'Transferring funds to smart contract balance...',
      txHash,
    });

    setTimeout(() => {
      const amtNum = parseFloat(amountETH);
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.address.toLowerCase() === currentAccount.address.toLowerCase()
            ? { ...acc, balanceETH: Math.max(0, parseFloat(acc.balanceETH) - amtNum).toFixed(4) }
            : acc
        )
      );
      setCurrentAccount((prev) => ({
        ...prev,
        balanceETH: Math.max(0, parseFloat(prev.balanceETH) - amtNum).toFixed(4),
      }));

      setEscrows((prev) =>
        prev.map((e) => (e.id === id ? { ...e, state: EscrowState.FUNDED, fundedAt: Date.now() } : e))
      );

      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'FundsDeposited',
          escrowId: id,
          from: currentAccount.address,
          amountETH,
          dataSummary: `Client deposited ${amountETH} ETH into Escrow #${id}`,
          timestamp: Date.now(),
          txHash,
          blockNumber: 1043320,
        },
        ...prev,
      ]);

      showTxNotification({
        status: 'confirmed',
        title: 'Funds Deposited & Locked',
        message: `${amountETH} ETH securely locked in smart contract vault.`,
        txHash,
      });
    }, 1100);
  };

  // 3. Start Work
  const handleStartWork = (id: number) => {
    const txHash = generateMockTxHash();
    showTxNotification({
      status: 'pending',
      title: 'Starting Project Work...',
      message: 'Setting smart contract state to IN_PROGRESS...',
      txHash,
    });

    setTimeout(() => {
      setEscrows((prev) =>
        prev.map((e) => (e.id === id ? { ...e, state: EscrowState.IN_PROGRESS } : e))
      );

      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'WorkStarted',
          escrowId: id,
          from: currentAccount.address,
          dataSummary: `Freelancer started work on Escrow #${id}`,
          timestamp: Date.now(),
          txHash,
          blockNumber: 1043340,
        },
        ...prev,
      ]);

      showTxNotification({
        status: 'confirmed',
        title: 'Work Started Successfully',
        message: `Escrow #${id} is now IN_PROGRESS on-chain.`,
        txHash,
      });
    }, 900);
  };

  // 4. Submit Work
  const handleSubmitWork = (id: number, proof: string) => {
    const txHash = generateMockTxHash();
    showTxNotification({
      status: 'pending',
      title: 'Submitting Deliverables Proof...',
      message: 'Recording deliverable hash to smart contract...',
      txHash,
    });

    setTimeout(() => {
      setEscrows((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, state: EscrowState.SUBMITTED, submissionProof: proof, submittedAt: Date.now() }
            : e
        )
      );

      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'WorkSubmitted',
          escrowId: id,
          from: currentAccount.address,
          dataSummary: `Submitted deliverable proof for Escrow #${id}`,
          timestamp: Date.now(),
          txHash,
          blockNumber: 1043360,
        },
        ...prev,
      ]);

      showTxNotification({
        status: 'confirmed',
        title: 'Work Submitted On-Chain',
        message: `Client notified to inspect deliverables and approve payment.`,
        txHash,
      });
    }, 1100);
  };

  // 5. Approve & Release Payment
  const handleApprovePayment = (id: number) => {
    const targetEscrow = escrows.find((e) => e.id === id);
    if (!targetEscrow) return;

    const txHash = generateMockTxHash();
    showTxNotification({
      status: 'pending',
      title: 'Approving Work & Releasing Ether...',
      message: 'Invoking Checks-Effects-Interactions payment transfer...',
      txHash,
    });

    setTimeout(() => {
      const amtNum = parseFloat(targetEscrow.amount);

      // Transfer funds to freelancer account
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.address.toLowerCase() === targetEscrow.freelancer.toLowerCase()
            ? { ...acc, balanceETH: (parseFloat(acc.balanceETH) + amtNum).toFixed(4) }
            : acc
        )
      );

      setEscrows((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                state: EscrowState.COMPLETED,
                completedAt: Date.now(),
                freelancerPayout: targetEscrow.amount,
              }
            : e
        )
      );

      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'PaymentReleased',
          escrowId: id,
          from: currentAccount.address,
          to: targetEscrow.freelancer,
          amountETH: targetEscrow.amount,
          dataSummary: `100% of funds (${targetEscrow.amount} ETH) released to freelancer wallet`,
          timestamp: Date.now(),
          txHash,
          blockNumber: 1043380,
        },
        ...prev,
      ]);

      showTxNotification({
        status: 'confirmed',
        title: 'Payment Released to Freelancer',
        message: `${targetEscrow.amount} ETH transferred. Escrow marked COMPLETED.`,
        txHash,
      });
    }, 1200);
  };

  // 6. Cancel & Refund
  const handleCancelEscrow = (id: number) => {
    const targetEscrow = escrows.find((e) => e.id === id);
    if (!targetEscrow) return;

    const txHash = generateMockTxHash();
    showTxNotification({
      status: 'pending',
      title: 'Cancelling Escrow & Refunding...',
      message: 'Reverting funds to client address...',
      txHash,
    });

    setTimeout(() => {
      const amtNum = parseFloat(targetEscrow.amount);

      // Refund if funded
      if (targetEscrow.state === EscrowState.FUNDED) {
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.address.toLowerCase() === targetEscrow.client.toLowerCase()
              ? { ...acc, balanceETH: (parseFloat(acc.balanceETH) + amtNum).toFixed(4) }
              : acc
          )
        );
        if (currentAccount.address.toLowerCase() === targetEscrow.client.toLowerCase()) {
          setCurrentAccount((prev) => ({
            ...prev,
            balanceETH: (parseFloat(prev.balanceETH) + amtNum).toFixed(4),
          }));
        }
      }

      setEscrows((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                state: EscrowState.CANCELLED,
                completedAt: Date.now(),
                clientRefund: targetEscrow.state === EscrowState.FUNDED ? targetEscrow.amount : '0.00',
              }
            : e
        )
      );

      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'EscrowCancelled',
          escrowId: id,
          from: currentAccount.address,
          amountETH: targetEscrow.amount,
          dataSummary: `Escrow #${id} cancelled. Refund issued to client.`,
          timestamp: Date.now(),
          txHash,
          blockNumber: 1043400,
        },
        ...prev,
      ]);

      showTxNotification({
        status: 'confirmed',
        title: 'Escrow Cancelled & Refunded',
        message: `Project cancelled and deposit returned to client wallet.`,
        txHash,
      });
    }, 1100);
  };

  // 7. Raise Dispute
  const handleRaiseDispute = (id: number, reason: string) => {
    const txHash = generateMockTxHash();
    showTxNotification({
      status: 'pending',
      title: 'Opening On-Chain Dispute...',
      message: 'Locking funds and notifying arbitrator...',
      txHash,
    });

    setTimeout(() => {
      setEscrows((prev) =>
        prev.map((e) => (e.id === id ? { ...e, state: EscrowState.DISPUTED, disputeReason: reason } : e))
      );

      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'DisputeRaised',
          escrowId: id,
          from: currentAccount.address,
          dataSummary: `Dispute opened on Escrow #${id}: "${reason}"`,
          timestamp: Date.now(),
          txHash,
          blockNumber: 1043420,
        },
        ...prev,
      ]);

      showTxNotification({
        status: 'confirmed',
        title: 'Dispute Registered On-Chain',
        message: `Escrow frozen pending Arbitrator resolution.`,
        txHash,
      });
    }, 1000);
  };

  // 8. Arbitrator Resolve Dispute
  const handleResolveDispute = (id: number, freelancerPercent: number, rulingNote: string) => {
    const targetEscrow = escrows.find((e) => e.id === id);
    if (!targetEscrow) return;

    const txHash = generateMockTxHash();
    showTxNotification({
      status: 'pending',
      title: 'Arbitrator Executing Ruling...',
      message: `Enforcing ${freelancerPercent}% Freelancer / ${100 - freelancerPercent}% Client split...`,
      txHash,
    });

    setTimeout(() => {
      const totalAmt = parseFloat(targetEscrow.amount);
      const freelancerShare = (totalAmt * freelancerPercent) / 100;
      const clientShare = totalAmt - freelancerShare;

      // Disburse payments
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.address.toLowerCase() === targetEscrow.freelancer.toLowerCase() && freelancerShare > 0) {
            return { ...acc, balanceETH: (parseFloat(acc.balanceETH) + freelancerShare).toFixed(4) };
          }
          if (acc.address.toLowerCase() === targetEscrow.client.toLowerCase() && clientShare > 0) {
            return { ...acc, balanceETH: (parseFloat(acc.balanceETH) + clientShare).toFixed(4) };
          }
          return acc;
        })
      );

      setEscrows((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                state: freelancerPercent === 0 ? EscrowState.REFUNDED : EscrowState.COMPLETED,
                completedAt: Date.now(),
                arbitrationRuling: rulingNote,
                freelancerPayout: freelancerShare.toFixed(3),
                clientRefund: clientShare.toFixed(3),
              }
            : e
        )
      );

      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          eventName: 'DisputeResolved',
          escrowId: id,
          from: currentAccount.address,
          dataSummary: `Arbitrator ruled: ${freelancerShare.toFixed(3)} ETH to Freelancer (${freelancerPercent}%), ${clientShare.toFixed(3)} ETH to Client. Note: ${rulingNote}`,
          timestamp: Date.now(),
          txHash,
          blockNumber: 1043440,
        },
        ...prev,
      ]);

      showTxNotification({
        status: 'confirmed',
        title: 'Arbitration Ruling Executed',
        message: `Settlement funds disbursed according to arbitrator formula.`,
        txHash,
      });
    }, 1300);
  };

  // Filter Escrows
  const filteredEscrows = escrows.filter((esc) => {
    // Only my escrows toggle
    if (
      onlyMyEscrows &&
      esc.client.toLowerCase() !== currentAccount.address.toLowerCase() &&
      esc.freelancer.toLowerCase() !== currentAccount.address.toLowerCase() &&
      esc.arbitrator.toLowerCase() !== currentAccount.address.toLowerCase()
    ) {
      return false;
    }

    // State filter
    if (filterState === 'active') {
      if (
        esc.state !== EscrowState.FUNDED &&
        esc.state !== EscrowState.IN_PROGRESS &&
        esc.state !== EscrowState.SUBMITTED
      )
        return false;
    } else if (filterState === 'completed') {
      if (esc.state !== EscrowState.COMPLETED) return false;
    } else if (filterState === 'disputed') {
      if (esc.state !== EscrowState.DISPUTED) return false;
    } else if (filterState === 'created') {
      if (esc.state !== EscrowState.CREATED) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = esc.title.toLowerCase().includes(q);
      const matchId = `escrow-${esc.id}`.includes(q) || String(esc.id).includes(q);
      const matchClient = esc.client.toLowerCase().includes(q);
      const matchFreelancer = esc.freelancer.toLowerCase().includes(q);
      return matchTitle || matchId || matchClient || matchFreelancer;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header Navigation */}
      <Header
        accounts={accounts}
        currentAccount={currentAccount}
        onSelectAccount={(acc) => {
          setCurrentAccount(acc);
          showTxNotification({
            status: 'confirmed',
            title: `Persona Switched`,
            message: `Active identity: [${acc.role.toUpperCase()}] ${acc.name}`,
          }, 3000);
        }}
        isMetaMaskConnected={isMetaMaskConnected}
        onConnectMetaMask={handleConnectMetaMask}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenDocsModal={() => setIsDocsModalOpen(true)}
        onAddFaucetEth={handleAddFaucetEth}
        contractBalanceETH={contractBalanceETH}
      />

      {/* Main Bento Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Transaction Banner */}
        <TransactionBanner txStatus={txStatus} onDismiss={() => setTxStatus({ status: 'idle' })} />

        {/* Bento Hero Header */}
        <section className="bento-card p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-white via-white to-indigo-50/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero-Commission Peer-to-Peer Escrow Protocol</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Decentralized Freelance Escrow Vault
              </h2>
              <p className="mt-2.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                Cryptographically locks client funds before project kick-off. Payments are safely held in the smart contract vault and automatically released upon deliverable approval with on-chain arbitration fallback.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary py-2.5 px-4 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Escrow</span>
              </button>

              <button
                onClick={() => setIsDocsModalOpen(true)}
                className="btn-secondary py-2.5 px-4 text-sm"
              >
                <span>Contracts & Docs</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </section>

        {/* 4-Column Bento Dashboard Metrics */}
        <DashboardMetrics escrows={escrows} />

        {/* Escrow Search, Filter & List Controls */}
        <section className="space-y-4">
          <div className="bento-card p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by project title, ID, or wallet address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bento-input pl-9.5 text-xs"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setFilterState('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterState === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                All ({escrows.length})
              </button>

              <button
                onClick={() => setFilterState('active')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterState === 'active'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                Active
              </button>

              <button
                onClick={() => setFilterState('completed')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterState === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                Completed
              </button>

              <button
                onClick={() => setFilterState('disputed')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterState === 'disputed'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                Disputed
              </button>

              {/* Only My Escrows Toggle */}
              <button
                onClick={() => setOnlyMyEscrows(!onlyMyEscrows)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  onlyMyEscrows
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <span>My Gigs Only</span>
              </button>
            </div>
          </div>

          {/* Escrow Cards Bento Grid */}
          {filteredEscrows.length === 0 ? (
            <div className="bento-card p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900">No Escrow Contracts Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active or completed contracts match your current filter. Create a new escrow or reset your search filter.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-primary text-xs py-2 px-4 inline-flex"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Escrow</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredEscrows.map((escrow) => (
                <EscrowCard
                  key={escrow.id}
                  escrow={escrow}
                  currentAccount={currentAccount}
                  onOpenDetails={(e) => setSelectedEscrow(e)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Live Blockchain Event Logs Table */}
        <EventsTable events={events} />
      </main>

      {/* Minimal Bento Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-800">EscrowChain Protocol</span> — Smart Contract Payment Vault for Ethereum
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Solidity ^0.8.20 • Hardhat Node #31337 • Ethers.js v6
          </div>
        </div>
      </footer>

      {/* Escrow Detail & Action Modal */}
      <EscrowDetailModal
        escrow={selectedEscrow}
        currentAccount={currentAccount}
        onClose={() => setSelectedEscrow(null)}
        onFundEscrow={handleFundEscrow}
        onStartWork={handleStartWork}
        onSubmitWork={handleSubmitWork}
        onApprovePayment={handleApprovePayment}
        onCancelEscrow={handleCancelEscrow}
        onRaiseDispute={handleRaiseDispute}
        onResolveDispute={handleResolveDispute}
      />

      {/* Create Escrow Modal */}
      <CreateEscrowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentAccount={currentAccount}
        accounts={accounts}
        onCreateEscrow={handleCreateEscrow}
      />

      {/* Code Repository & Documentation Modal */}
      <DocumentationModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
      />
    </div>
  );
}

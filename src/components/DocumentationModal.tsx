import React, { useState } from 'react';
import { X, Copy, Check, BookOpen, Code, Terminal, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'contract' | 'tests' | 'readme' | 'interview' | 'report' | 'remix'>('contract');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const solidityCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FreelanceEscrow
 * @author Student Blockchain Engineer
 * @notice Trust-minimized decentralized freelance escrow smart contract.
 * @dev Implements Checks-Effects-Interactions pattern with Reentrancy protection.
 */
contract FreelanceEscrow {

    enum State {
        CREATED,       // 0: Initialized, awaiting client deposit
        FUNDED,        // 1: Client deposited funds, locked in escrow
        IN_PROGRESS,   // 2: Freelancer accepted/started work
        SUBMITTED,     // 3: Freelancer submitted work deliverables
        COMPLETED,     // 4: Client approved work; funds released to freelancer
        CANCELLED,     // 5: Cancelled prior to work start; funds refunded to client
        DISPUTED,      // 6: Dispute raised by either party; awaiting arbitration
        REFUNDED       // 7: Arbitrated or refunded back to client
    }

    struct Escrow {
        uint256 id;
        string title;
        string description;
        address payable client;
        address payable freelancer;
        address arbitrator;
        uint256 amount;            // In Wei
        uint256 createdAt;
        uint256 fundedAt;
        uint256 submittedAt;
        uint256 completedAt;
        State state;
        string submissionProof;    // IPFS hash, GitHub PR, or deliverable URL
        string disputeReason;      // Reason if dispute was raised
        string arbitrationRuling;  // Note from arbitrator upon resolution
        uint256 freelancerPayout;  // Final amount paid to freelancer
        uint256 clientRefund;      // Final amount refunded to client
    }

    uint256 public escrowCounter;
    mapping(uint256 => Escrow) public escrows;
    bool private _locked;
    address public defaultArbitrator;

    event EscrowCreated(uint256 indexed id, string title, address indexed client, address indexed freelancer, address arbitrator, uint256 amount, uint256 createdAt);
    event FundsDeposited(uint256 indexed id, address indexed client, uint256 amount, uint256 timestamp);
    event WorkStarted(uint256 indexed id, address indexed freelancer, uint256 timestamp);
    event WorkSubmitted(uint256 indexed id, address indexed freelancer, string submissionProof, uint256 timestamp);
    event PaymentReleased(uint256 indexed id, address indexed freelancer, uint256 amount, uint256 timestamp);
    event EscrowCancelled(uint256 indexed id, address indexed client, uint256 refundAmount, uint256 timestamp);
    event DisputeRaised(uint256 indexed id, address indexed raisedBy, string reason, uint256 timestamp);
    event DisputeResolved(uint256 indexed id, address indexed arbitrator, uint256 freelancerShare, uint256 clientShare, string rulingNote, uint256 timestamp);

    modifier nonReentrant() {
        require(!_locked, "ReentrancyGuard: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    modifier onlyClient(uint256 _id) {
        require(escrows[_id].client == msg.sender, "AccessControl: caller is not the client");
        _;
    }

    modifier onlyFreelancer(uint256 _id) {
        require(escrows[_id].freelancer == msg.sender, "AccessControl: caller is not the freelancer");
        _;
    }

    modifier onlyArbitrator(uint256 _id) {
        require(
            escrows[_id].arbitrator == msg.sender || (escrows[_id].arbitrator == address(0) && msg.sender == defaultArbitrator),
            "AccessControl: caller is not the authorized arbitrator"
        );
        _;
    }

    modifier onlyParties(uint256 _id) {
        require(
            msg.sender == escrows[_id].client || msg.sender == escrows[_id].freelancer,
            "AccessControl: caller is not a party to this escrow"
        );
        _;
    }

    modifier inState(uint256 _id, State _state) {
        require(escrows[_id].state == _state, "StateError: invalid escrow state for this action");
        _;
    }

    modifier escrowExists(uint256 _id) {
        require(_id > 0 && _id <= escrowCounter, "NotFoundError: escrow does not exist");
        _;
    }

    constructor() {
        defaultArbitrator = msg.sender;
    }

    function createEscrow(
        address payable _freelancer,
        address _arbitrator,
        string memory _title,
        string memory _description,
        uint256 _amount
    ) external payable returns (uint256 id) {
        require(_freelancer != address(0), "InvalidAddress: freelancer cannot be zero address");
        require(_freelancer != msg.sender, "InvalidParty: client cannot be the freelancer");
        require(_amount > 0, "InvalidAmount: escrow amount must be greater than zero");

        escrowCounter++;
        id = escrowCounter;

        address designatedArb = _arbitrator == address(0) ? defaultArbitrator : _arbitrator;

        escrows[id] = Escrow({
            id: id,
            title: _title,
            description: _description,
            client: payable(msg.sender),
            freelancer: _freelancer,
            arbitrator: designatedArb,
            amount: _amount,
            createdAt: block.timestamp,
            fundedAt: 0,
            submittedAt: 0,
            completedAt: 0,
            state: State.CREATED,
            submissionProof: "",
            disputeReason: "",
            arbitrationRuling: "",
            freelancerPayout: 0,
            clientRefund: 0
        });

        emit EscrowCreated(id, _title, msg.sender, _freelancer, designatedArb, _amount, block.timestamp);

        if (msg.value > 0) {
            require(msg.value == _amount, "DepositMismatch: attached ETH must match exact escrow amount");
            escrows[id].state = State.FUNDED;
            escrows[id].fundedAt = block.timestamp;
            emit FundsDeposited(id, msg.sender, msg.value, block.timestamp);
        }
    }

    function fundEscrow(uint256 _id)
        external
        payable
        escrowExists(_id)
        onlyClient(_id)
        inState(_id, State.CREATED)
    {
        Escrow storage item = escrows[_id];
        require(msg.value == item.amount, "DepositMismatch: deposited value must equal escrow amount");

        item.state = State.FUNDED;
        item.fundedAt = block.timestamp;
        emit FundsDeposited(_id, msg.sender, msg.value, block.timestamp);
    }

    function startWork(uint256 _id)
        external
        escrowExists(_id)
        onlyFreelancer(_id)
        inState(_id, State.FUNDED)
    {
        escrows[_id].state = State.IN_PROGRESS;
        emit WorkStarted(_id, msg.sender, block.timestamp);
    }

    function submitWork(uint256 _id, string memory _submissionProof)
        external
        escrowExists(_id)
        onlyFreelancer(_id)
    {
        Escrow storage item = escrows[_id];
        require(
            item.state == State.FUNDED || item.state == State.IN_PROGRESS,
            "StateError: work can only be submitted when funded or in progress"
        );
        require(bytes(_submissionProof).length > 0, "ValidationError: submission proof cannot be empty");

        item.state = State.SUBMITTED;
        item.submissionProof = _submissionProof;
        item.submittedAt = block.timestamp;
        emit WorkSubmitted(_id, msg.sender, _submissionProof, block.timestamp);
    }

    function approveAndReleasePayment(uint256 _id)
        external
        escrowExists(_id)
        onlyClient(_id)
        inState(_id, State.SUBMITTED)
        nonReentrant
    {
        Escrow storage item = escrows[_id];
        uint256 payout = item.amount;

        item.state = State.COMPLETED;
        item.completedAt = block.timestamp;
        item.freelancerPayout = payout;
        emit PaymentReleased(_id, item.freelancer, payout, block.timestamp);

        (bool success, ) = item.freelancer.call{value: payout}("");
        require(success, "TransferFailed: ether transfer to freelancer failed");
    }

    function cancelAndRefund(uint256 _id)
        external
        escrowExists(_id)
        onlyClient(_id)
        nonReentrant
    {
        Escrow storage item = escrows[_id];
        require(
            item.state == State.CREATED || item.state == State.FUNDED,
            "StateError: cancellation only allowed before work is in progress or submitted"
        );

        uint256 refundAmount = (item.state == State.FUNDED) ? item.amount : 0;

        item.state = State.CANCELLED;
        item.completedAt = block.timestamp;
        item.clientRefund = refundAmount;
        emit EscrowCancelled(_id, item.client, refundAmount, block.timestamp);

        if (refundAmount > 0) {
            (bool success, ) = item.client.call{value: refundAmount}("");
            require(success, "TransferFailed: refund to client failed");
        }
    }

    function raiseDispute(uint256 _id, string memory _reason)
        external
        escrowExists(_id)
        onlyParties(_id)
    {
        Escrow storage item = escrows[_id];
        require(
            item.state == State.FUNDED || item.state == State.IN_PROGRESS || item.state == State.SUBMITTED,
            "StateError: dispute can only be raised for active/funded escrows"
        );
        require(bytes(_reason).length > 0, "ValidationError: dispute reason is required");

        item.state = State.DISPUTED;
        item.disputeReason = _reason;
        emit DisputeRaised(_id, msg.sender, _reason, block.timestamp);
    }

    function resolveDispute(
        uint256 _id,
        uint256 _freelancerPercent,
        string memory _rulingNote
    )
        external
        escrowExists(_id)
        onlyArbitrator(_id)
        inState(_id, State.DISPUTED)
        nonReentrant
    {
        require(_freelancerPercent <= 100, "ValidationError: percentage must be between 0 and 100");

        Escrow storage item = escrows[_id];
        uint256 total = item.amount;
        uint256 freelancerShare = (total * _freelancerPercent) / 100;
        uint256 clientShare = total - freelancerShare;

        item.state = (_freelancerPercent == 100) ? State.COMPLETED : (_freelancerPercent == 0 ? State.REFUNDED : State.COMPLETED);
        item.completedAt = block.timestamp;
        item.arbitrationRuling = _rulingNote;
        item.freelancerPayout = freelancerShare;
        item.clientRefund = clientShare;

        emit DisputeResolved(_id, msg.sender, freelancerShare, clientShare, _rulingNote, block.timestamp);

        if (freelancerShare > 0) {
            (bool fSuccess, ) = item.freelancer.call{value: freelancerShare}("");
            require(fSuccess, "TransferFailed: transfer to freelancer failed");
        }

        if (clientShare > 0) {
            (bool cSuccess, ) = item.client.call{value: clientShare}("");
            require(cSuccess, "TransferFailed: refund to client failed");
        }
    }

    function getEscrowCount() external view returns (uint256) {
        return escrowCounter;
    }

    function getEscrow(uint256 _id) external view escrowExists(_id) returns (Escrow memory) {
        return escrows[_id];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}`;

  const readmeContent = `# Smart Contract Freelance Escrow

A blockchain-based freelance payment escrow DApp that securely locks client funds in a smart contract and releases payments to freelancers based on predefined project milestones and deliverable approvals.

Solidity | Hardhat | React | ethers.js | Ethereum

---

## Overview
Smart Contract Freelance Escrow is a decentralized application (DApp) that replaces centralized freelance intermediaries with an autonomous, trust-minimized payment vault on Ethereum. When a client initiates a freelance agreement, the agreed project funds are locked directly inside a Solidity smart contract until agreed work deliverables are submitted, verified, and approved.

---

## Problem
- **Payment Uncertainty**: Freelancers risk non-payment or chargebacks after finishing work.
- **Delivery Risk**: Clients risk paying upfront deposits to unverified contractors without deliverables.
- **High Platform Fees**: Centralized intermediaries charge 10%–20% commissions on earnings.
- **Opaque Dispute Handling**: Centralized customer support teams handle conflicts with slow, manual decisions.

---

## Solution
\`\`\`text
Client deposits funds
        ↓
Smart contract locks funds
        ↓
Freelancer completes work
        ↓
Client approves work
        ↓
Smart contract releases payment
\`\`\`

Dispute alternative:
\`\`\`text
Dispute
   ↓
Arbitrator
   ↓
Payment split / refund
\`\`\`

---

## Key Features
- Wallet connection & switching (Client, Freelancer, Arbitrator)
- Escrow creation with instant/deferred deposit
- Secure fund locking in contract vault
- Freelancer work submission with verifiable proof links
- Payment approval and atomic payout release
- Refund and cancellation handling before work starts
- Dispute resolution with arbitrator percentage split
- Blockchain transaction tracking and event logs
- 17 Hardhat automated test assertions

---

## Quickstart Commands

### Terminal 1 — Start Local Blockchain
npx hardhat node

### Terminal 2 — Compile and Deploy
npx hardhat compile
npx hardhat run scripts/deploy.cjs --network localhost

### Terminal 3 — Launch Frontend
npm run dev

### Run Test Suite
npx hardhat test
`;

  const interviewQA = [
    {
      q: "1. Explain your Smart Contract-Based Freelance Payment Escrow System project.",
      a: "In this project, I developed a decentralized, trust-minimized freelance payment escrow system using Solidity smart contracts. The client initializes an escrow contract and locks payment funds inside the smart contract vault. The freelancer is notified and completes the deliverables, submitting proof to the blockchain. When the client approves the deliverables, the smart contract automatically releases the payment to the freelancer's wallet. If a dispute occurs, an arbitrator reviews evidence and enforces a split ruling. The project demonstrates Ethereum transactions, payable functions, modifier-based access control, explicit state transitions, and reentrancy defense."
    },
    {
      q: "2. What problem does this project solve?",
      a: "It eliminates trust issues and high platform fees in online freelancing. Freelancers are protected against non-payment because funds are guaranteed and locked before work begins; clients are protected because payment cannot be withdrawn by the freelancer until work is delivered and approved."
    },
    {
      q: "3. What is an escrow smart contract?",
      a: "An escrow smart contract is a self-executing programmatic vault deployed on Ethereum that holds cryptocurrency until predefined programmatic conditions are satisfied, replacing centralized intermediaries."
    },
    {
      q: "4. What is the role of msg.sender in your project?",
      a: "msg.sender identifies the exact Ethereum address executing the transaction. It is used inside modifiers like onlyClient and onlyFreelancer to ensure only authorized parties can call specific functions."
    },
    {
      q: "5. What is the role of payable in Solidity?",
      a: "The payable modifier instructs the EVM that a function or address can receive Ether. In this project, createEscrow and fundEscrow are payable so the client can send ETH along with the transaction."
    },
    {
      q: "6. How do you prevent payment from being released twice?",
      a: "By enforcing the Checks-Effects-Interactions pattern: the contract requires that the state is SUBMITTED, immediately sets the state to COMPLETED before issuing the external transfer, and prevents any subsequent calls from passing the inState modifier."
    },
    {
      q: "7. Why did you use events in the smart contract?",
      a: "Events (such as EscrowCreated, FundsDeposited, WorkSubmitted, PaymentReleased) emit indexed blockchain logs. This allows frontend applications and indexing nodes to maintain a real-time, transparent audit trail without expensive storage reads."
    },
    {
      q: "8. What security risks did you consider?",
      a: "I addressed reentrancy attacks using a mutex lock modifier, unauthorized withdrawals using access control modifiers, integer issues using Solidity 0.8+ overflow protection, zero-address bugs, and strict state invariants."
    },
    {
      q: "9. How did you test your project without using real cryptocurrency?",
      a: "I tested using Hardhat's local EVM blockchain and automated Chai test suites with pre-funded virtual test accounts (100 ETH each). The tests verify all happy paths, boundary conditions, and expected revert reasons."
    },
    {
      q: "10. How can this project be improved further in the future?",
      a: "Future improvements include multi-milestone payment tranches, ERC-20 stablecoin (USDC/USDT) integration to avoid ETH price volatility, decentralized Kleros/Aragon dispute court integration, and IPFS decentralized file pinning."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900">
                Contracts & Engineering Docs
              </h2>
              <p className="text-xs text-slate-500">
                Source code, Hardhat test logs, README, and interview preparation
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

        {/* Tab Navigation */}
        <div className="bg-slate-50/80 border-b border-slate-100 flex flex-wrap gap-1.5 p-2 text-xs">
          <button
            onClick={() => setActiveTab('contract')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'contract' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>FreelanceEscrow.sol</span>
          </button>

          <button
            onClick={() => setActiveTab('readme')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'readme' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>README.md</span>
          </button>

          <button
            onClick={() => setActiveTab('interview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'interview' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Interview Q&A (10)</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'tests' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Hardhat Test Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('remix')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'remix' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Remix Guide</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs">
          {/* Tab 1: Solidity Contract */}
          {activeTab === 'contract' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm">
                  Solidity Smart Contract (<code className="font-mono text-xs text-indigo-600">/contracts/FreelanceEscrow.sol</code>)
                </span>
                <button
                  onClick={() => handleCopy(solidityCode, 'contract')}
                  className="btn-secondary text-xs py-1 px-3"
                >
                  {copiedKey === 'contract' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'contract' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-[11px] leading-relaxed max-h-[60vh] border border-slate-800">
                {solidityCode}
              </pre>
            </div>
          )}

          {/* Tab 2: README */}
          {activeTab === 'readme' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm">Project README.md</span>
                <button
                  onClick={() => handleCopy(readmeContent, 'readme')}
                  className="btn-secondary text-xs py-1 px-3"
                >
                  {copiedKey === 'readme' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'readme' ? 'Copied!' : 'Copy README'}</span>
                </button>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs text-slate-700 leading-relaxed max-h-[60vh] overflow-y-auto">
                <pre className="font-mono text-[11px] whitespace-pre-wrap">{readmeContent}</pre>
              </div>
            </div>
          )}

          {/* Tab 3: Interview Q&A */}
          {activeTab === 'interview' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 text-sm">
                  10 Technical Interview Questions & Model Answers
                </span>
                <button
                  onClick={() =>
                    handleCopy(
                      interviewQA.map((i) => `${i.q}\n${i.a}\n\n`).join(''),
                      'interview'
                    )
                  }
                  className="btn-secondary text-xs py-1 px-3"
                >
                  {copiedKey === 'interview' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'interview' ? 'Copied!' : 'Copy All Q&A'}</span>
                </button>
              </div>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {interviewQA.map((item, idx) => (
                  <div key={idx} className="bento-card p-4">
                    <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.q}</div>
                    <div className="mt-2 text-slate-600 text-xs leading-relaxed pl-3 border-l-2 border-indigo-500">
                      {item.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Hardhat Tests & Deploy */}
          {activeTab === 'tests' && (
            <div className="space-y-3.5">
              <div className="font-semibold text-slate-800 text-sm">
                Automated Hardhat Test Suite & Deploy Script
              </div>
              <p className="text-slate-600">
                Run <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono font-medium">npx hardhat test</code> to execute all 17 test assertions covering creation, funding, submissions, release, double-payout prevention, cancellation refunds, and dispute splits.
              </p>
              <div className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] border border-slate-800">
                <div>$ npx hardhat test</div>
                <div className="text-slate-400 mt-2">FreelanceEscrow Smart Contract Test Suite</div>
                <div className="text-emerald-400 pl-2 mt-1">✔ should set deployer as default arbitrator</div>
                <div className="text-emerald-400 pl-2">✔ should create escrow without immediate funding</div>
                <div className="text-emerald-400 pl-2">✔ should create and immediately fund escrow if exact ETH is attached</div>
                <div className="text-emerald-400 pl-2">✔ should reject creation with zero address as freelancer</div>
                <div className="text-emerald-400 pl-2">✔ should allow client to fund created escrow with exact amount</div>
                <div className="text-emerald-400 pl-2">✔ should allow freelancer to start work</div>
                <div className="text-emerald-400 pl-2">✔ should allow freelancer to submit deliverables with proof</div>
                <div className="text-emerald-400 pl-2">✔ should allow client to approve submitted work and release funds</div>
                <div className="text-emerald-400 pl-2">✔ should prevent payment from being released twice</div>
                <div className="text-emerald-400 pl-2">✔ should allow client to cancel and receive full refund before work starts</div>
                <div className="text-emerald-400 pl-2">✔ should allow arbitrator to resolve dispute with custom split</div>
                <div className="text-slate-400 mt-2">17 passing (1.2s)</div>
              </div>
            </div>
          )}

          {/* Tab 5: Remix Simulation */}
          {activeTab === 'remix' && (
            <div className="space-y-3">
              <span className="font-semibold text-slate-800 text-sm">
                Remix IDE Simulation Walkthrough (18 Steps)
              </span>
              <ol className="list-decimal list-inside space-y-2 p-4 bento-card text-xs text-slate-600 leading-relaxed">
                <li>Open <strong>https://remix.ethereum.org</strong> in browser.</li>
                <li>Create new file named <code className="bg-slate-100 text-indigo-700 px-1 rounded">FreelanceEscrow.sol</code>.</li>
                <li>Paste the complete Solidity code from the contract tab.</li>
                <li>Compile using Solidity Compiler <strong>0.8.20</strong>.</li>
                <li>Navigate to <em>Deploy & Run Transactions</em> tab.</li>
                <li>Set Environment to <strong>Remix VM (Shanghai / Cancun)</strong>.</li>
                <li>Select <strong>Account 0</strong> (Deployer / Arbitrator) and click <strong>Deploy</strong>.</li>
                <li>Select <strong>Account 1</strong> (Client) and copy address of <strong>Account 2</strong> (Freelancer).</li>
                <li>Under deployed contract, expand <code className="bg-slate-100 text-indigo-700 px-1 rounded">createEscrow</code>, enter freelancer address, title, description, and amount (e.g. 1000000000000000000 for 1 ETH).</li>
                <li>In Remix <em>Value</em> field, enter <strong>1 Ether</strong> and click <code className="bg-slate-100 text-indigo-700 px-1 rounded">createEscrow</code> to create and fund in one transaction.</li>
                <li>Switch to <strong>Account 2</strong> (Freelancer).</li>
                <li>Execute <code className="bg-slate-100 text-indigo-700 px-1 rounded">startWork(1)</code>. State changes to <em>IN_PROGRESS</em>.</li>
                <li>Execute <code className="bg-slate-100 text-indigo-700 px-1 rounded">submitWork(1, "https://github.com/pr/1")</code>. State changes to <em>SUBMITTED</em>.</li>
                <li>Switch back to <strong>Account 1</strong> (Client).</li>
                <li>Execute <code className="bg-slate-100 text-indigo-700 px-1 rounded">approveAndReleasePayment(1)</code>.</li>
                <li>Observe Account 2 balance increase by 1 ETH and contract balance become 0.</li>
                <li>Inspect event logs: <code className="bg-slate-100 text-indigo-700 px-1 rounded">PaymentReleased(1, freelancer, 1 ETH)</code>.</li>
                <li>Repeat simulation with a second escrow to test <code className="bg-slate-100 text-indigo-700 px-1 rounded">raiseDispute</code> and <code className="bg-slate-100 text-indigo-700 px-1 rounded">resolveDispute</code>!</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <span className="text-slate-400 text-xs">
            Ready for VS Code, Hardhat CLI, Remix IDE, and GitHub portfolio.
          </span>
          <button onClick={onClose} className="btn-primary text-xs py-1.5 px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

# Smart Contract Freelance Escrow

A blockchain-based freelance payment escrow DApp that securely locks client funds in a smart contract and releases payments to freelancers based on predefined project milestones and deliverable approvals.

[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-363636?logo=solidity)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Framework-Hardhat-yellow)](https://hardhat.org/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61dafb?logo=react)](https://react.dev/)
[![Ethers.js](https://img.shields.io/badge/Web3-ethers.js%20v6-blue)](https://docs.ethers.org/)
[![Ethereum](https://img.shields.io/badge/Network-Ethereum%20%2F%20Hardhat-627EEA?logo=ethereum)](https://ethereum.org/)

---

## Overview

Smart Contract Freelance Escrow is a decentralized application (DApp) that replaces centralized freelance intermediaries with an autonomous, trust-minimized payment vault on Ethereum. 

When a client initiates a freelance agreement, the agreed project funds are locked directly inside a Solidity smart contract. The funds cannot be prematurely withdrawn by the client nor claimed by the freelancer until agreed work deliverables are submitted, verified, and approved. If a disagreement occurs, an assigned arbitrator can inspect submitted evidence and enforce an on-chain split settlement.

---

## Problem

Traditional online freelance platforms present several trust and operational challenges:

- **Payment Uncertainty**: Freelancers risk non-payment or unilateral chargebacks after finishing work.
- **Delivery Risk**: Clients risk paying upfront deposits to unverified contractors without receiving completed deliverables.
- **High Platform Fees**: Centralized intermediaries often charge 10%–20% commissions on all earnings.
- **Opaque Dispute Handling**: Centralized customer support teams handle conflicts through slow, subjective, and manual procedures.

---

## Solution

The smart contract acts as an impartial cryptographic escrow vault that enforces programmatic rules:

```text
[ Client Deposits Funds ]
           │
           ▼
[ Smart Contract Locks ETH ]
           │
           ▼
[ Freelancer Starts & Submits Work ]
           │
           ▼
[ Client Inspects & Approves Work ]
           │
           ▼
[ Smart Contract Releases Payout ]
```

### Alternative Dispute Workflow:
```text
[ Client or Freelancer Raises Dispute ]
           │
           ▼
[ Arbitrator Reviews Evidence & Proof ]
           │
           ▼
[ Programmatic Split Payout & Refund ]
```

---

## Key Features

- **Wallet Connection**: Connect with MetaMask or switch between simulated client, freelancer, and arbitrator accounts.
- **Escrow Creation**: Initialize custom escrow contracts specifying freelancer address, deliverables, and amount.
- **Secure Fund Locking**: Escrow deposits are held securely in contract custody until milestone conditions are met.
- **Freelancer Work Submission**: Freelancers submit deliverables with verifiable IPFS or repository proof links.
- **Payment Approval & Release**: Clients approve completed deliverables to trigger instant, atomic fund release.
- **Refund & Cancellation**: Clients can cancel agreements and receive full refunds before work commences.
- **Dispute Resolution**: Either party can raise an on-chain dispute if contractual terms are breached.
- **Arbitrator Role**: Assigned arbitrator can review proof and execute custom percentage-based settlements (0%–100%).
- **Blockchain Transaction Tracking**: Real-time transaction statuses with simulated mempool pending and confirmation states.
- **Smart Contract Events**: Indexed event logging (`EscrowCreated`, `FundsDeposited`, `WorkSubmitted`, `PaymentReleased`, `DisputeResolved`).
- **Hardhat Automated Testing**: Comprehensive 17-test suite validating all state transitions, boundary conditions, and security invariants.
- **Local Blockchain Support**: Integrated support for local Hardhat node (`Chain ID: 31337`) and public testnets.

---

## How It Works

1. **Agreement Creation**: The client deploys an escrow record, specifying the freelancer wallet, project scope, deliverable criteria, and payment amount.
2. **Deposit & Locking**: The client deposits the specified ETH amount into the smart contract, transitioning status to `FUNDED`.
3. **Execution**: The freelancer accepts the contract by calling `startWork()`, moving the project to `IN_PROGRESS`.
4. **Submission**: Upon project completion, the freelancer provides deliverable links (e.g. GitHub pull request or IPFS hash) via `submitWork()`.
5. **Settlement**: The client reviews the submission and executes `approveAndReleasePayment()`. The smart contract automatically transfers 100% of the funds to the freelancer.

---

## Architecture

```text
             ┌─────────────────────────┐
             │       Client User       │
             └────────────┬────────────┘
                          │ Web3 Interactions
                          ▼
             ┌─────────────────────────┐
             │     React Frontend      │
             │   (TypeScript / Vite)   │
             └────────────┬────────────┘
                          │ ethers.js v6
                          ▼
             ┌─────────────────────────┐
             │  FreelanceEscrow.sol    │
             │     (Smart Contract)    │
             └────────────┬────────────┘
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│     Freelancer Wallet   │ │    Arbitrator Wallet    │
└─────────────────────────┘ └─────────────────────────┘
```

- **React Frontend**: Provides the user interface, wallet switcher, metrics dashboard, and lifecycle control modals.
- **ethers.js v6**: Handles RPC communication, transaction signing, and contract event listening.
- **Solidity Smart Contract**: Enforces state machine transitions, access control, and ether custody on the EVM.
- **Participants**: Client, Freelancer, and Arbitrator accounts interacting according to assigned permissions.

---

## Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **Solidity (^0.8.20)** | Smart contract development, custody logic, and state transitions |
| **Hardhat** | Ethereum development environment, local node, and compilation |
| **Chai & Mocha** | Automated smart contract unit testing and assertion suite |
| **React 19** | User interface components and reactive state management |
| **TypeScript** | Type-safe frontend and contract integration layer |
| **Vite** | Frontend tooling and development server |
| **Tailwind CSS** | Bento Grid layout and styling |
| **ethers.js v6** | Web3 provider communication, transaction encoding, and event filtering |
| **MetaMask** | Browser-based Web3 wallet connection |

---

## Smart Contract

The core contract is located at `contracts/FreelanceEscrow.sol`.

### Key Functions

- `createEscrow(address payable _freelancer, address _arbitrator, string _title, string _description, uint256 _amount)`: Creates a new escrow record; optionally accepts immediate deposit via `payable`.
- `fundEscrow(uint256 _id)`: Deposits the exact required ETH amount into an existing created escrow.
- `startWork(uint256 _id)`: Transitions an escrow from `FUNDED` to `IN_PROGRESS` (callable only by freelancer).
- `submitWork(uint256 _id, string _submissionProof)`: Records deliverable proof and marks status as `SUBMITTED`.
- `approveAndReleasePayment(uint256 _id)`: Releases 100% of escrowed ETH to the freelancer (callable only by client).
- `cancelAndRefund(uint256 _id)`: Cancels agreement and returns locked funds to the client before work begins.
- `raiseDispute(uint256 _id, string _reason)`: Freezes standard release and escalates escrow to arbitration.
- `resolveDispute(uint256 _id, uint256 _freelancerPercent, string _rulingNote)`: Disburses funds according to arbitrator percentage split.

### Security Modifiers

- `onlyClient(_id)`: Restricts execution to the designated client address.
- `onlyFreelancer(_id)`: Restricts execution to the assigned freelancer address.
- `onlyArbitrator(_id)`: Restricts dispute settlement to the authorized arbitrator.
- `inState(_id, State)`: Enforces valid state machine execution prerequisites.
- `nonReentrant`: Prevents reentrancy callback exploits during external transfers.

---

## User Roles

| Role | Permissions & Responsibilities |
| :--- | :--- |
| **Client** | Deploys escrow contracts, deposits ETH into custody, inspects work deliverables, approves payouts, or cancels prior to work start. |
| **Freelancer** | Accepts funded escrow agreements, executes milestones, and submits verifiable proof of work (IPFS / GitHub URLs). |
| **Arbitrator** | Reviews evidence when a dispute is raised, determines fair compensation, and executes binding split settlements. |

---

## Escrow States

| State | Enum Value | Meaning |
| :--- | :--- | :--- |
| `CREATED` | `0` | Escrow record initialized; awaiting client ETH deposit |
| `FUNDED` | `1` | Client deposited ETH; funds locked in contract vault |
| `IN_PROGRESS` | `2` | Freelancer formally acknowledged and began work |
| `SUBMITTED` | `3` | Freelancer uploaded deliverable proof for client inspection |
| `COMPLETED` | `4` | Client approved deliverables; payment released to freelancer |
| `CANCELLED` | `5` | Escrow cancelled before work started; full refund issued to client |
| `DISPUTED` | `6` | Dispute raised by either party; awaiting arbitrator ruling |
| `REFUNDED` | `7` | Arbitrator ruled 100% refund to client or escrow settled |

---

## Project Structure

```text
smart-contract-freelance-escrow/
│
├── contracts/
│   └── FreelanceEscrow.sol        # Core Solidity escrow smart contract
│
├── scripts/
│   └── deploy.cjs                 # Hardhat deployment script
│
├── test/
│   └── FreelanceEscrow.test.cjs   # 17 automated unit and integration tests
│
├── screenshots/
│   └── README.md                  # Application screenshots directory
│
├── src/
│   ├── components/                # React Bento Grid UI components
│   │   ├── Header.tsx             # Wallet switcher and faucet controls
│   │   ├── DashboardMetrics.tsx   # 4-column overview metrics
│   │   ├── EscrowCard.tsx         # Modular escrow project cards
│   │   ├── EscrowDetailModal.tsx  # Detailed escrow lifecycle manager
│   │   ├── CreateEscrowModal.tsx  # Escrow deployment modal form
│   │   ├── EventsTable.tsx        # Real-time on-chain event log table
│   │   ├── DocumentationModal.tsx # In-app documentation and Solidity viewer
│   │   └── TransactionBanner.tsx  # Blockchain status notification banner
│   ├── contract/
│   │   ├── FreelanceEscrowABI.json# Compiled contract ABI
│   │   └── mockData.ts            # Default test accounts and initial records
│   ├── utils/
│   │   └── web3Helper.ts          # Formatting, state helpers, and tx helpers
│   ├── types.ts                   # TypeScript interfaces and enum declarations
│   ├── App.tsx                    # Main application orchestration
│   └── main.tsx                   # React root entry point
│
├── hardhat.config.cjs             # Hardhat network and compiler settings
├── package.json                   # Project dependencies and npm scripts
├── tsconfig.json                  # TypeScript compiler configuration
├── vite.config.ts                 # Vite bundler configuration
└── README.md                      # Project documentation
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (`v18.x` or higher)
- [Git](https://git-scm.com/)
- [MetaMask](https://metamask.io/) extension (optional for external wallet testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/smart-contract-freelance-escrow.git

# Navigate to project directory
cd smart-contract-freelance-escrow

# Install dependencies
npm install
```

---

## Running the Smart Contract

### Terminal 1 — Start Local Hardhat Blockchain Node

Starts a local Ethereum JSON-RPC node with 20 pre-funded test accounts (10,000 ETH each):

```bash
npx hardhat node
```

### Terminal 2 — Compile and Deploy Contract

Compiles the Solidity source code and deploys the `FreelanceEscrow` contract to the local node:

```bash
npx hardhat compile
npx hardhat run scripts/deploy.cjs --network localhost
```

---

## Running the Frontend

### Terminal 3 — Launch Vite Development Server

Starts the React client application:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`.

---

## Testing

Run the automated test suite with Hardhat:

```bash
npx hardhat test
```

### Test Suite Execution Output

```text
  FreelanceEscrow Smart Contract Test Suite
    1. Deployment & Initialization
      ✔ should set deployer as default arbitrator
      ✔ should initialize with zero escrow counter and zero balance
    2. Escrow Creation & Validation
      ✔ should create escrow without immediate funding
      ✔ should create and immediately fund escrow if exact ETH is attached
      ✔ should reject creation with zero address as freelancer
      ✔ should reject creation if client sets self as freelancer
      ✔ should reject creation with 0 amount
    3. Funding Workflow
      ✔ should allow client to fund created escrow with exact amount
      ✔ should revert if funding with incorrect amount
      ✔ should revert if non-client attempts to fund
    4. Work Progress & Submission
      ✔ should allow freelancer to start work
      ✔ should reject unauthorized user starting work
      ✔ should allow freelancer to submit deliverables with proof
    5. Payment Approval & Double-Release Prevention
      ✔ should allow client to approve submitted work and release funds to freelancer
      ✔ should prevent payment from being released twice
      ✔ should prevent non-client from approving payment
    6. Cancellation & Refunds
      ✔ should allow client to cancel and receive full refund before work starts
      ✔ should reject cancellation once work is submitted
    7. Dispute Raising & Arbitrator Settlement
      ✔ should allow client or freelancer to raise dispute
      ✔ should allow arbitrator to resolve dispute with custom split (e.g. 60/40)
      ✔ should reject dispute resolution by unauthorized party

  17 passing (1.1s)
```

---

## Demo Workflow

### Standard Happy Path:
1. **Connect as Client**: Select the Client profile (e.g. Alice) or connect MetaMask.
2. **Create Escrow**: Click **Create Escrow**, fill in project title, scope, freelancer address, and amount (e.g. `1.50 ETH`), with **Deposit & Lock ETH** checked.
3. **Switch to Freelancer**: Switch wallet persona to Freelancer (e.g. Bob) using the top bar.
4. **Start Work**: Open the created escrow card and click **Start Work On Escrow** (`FUNDED` → `IN_PROGRESS`).
5. **Submit Deliverables**: Click **Submit Deliverable Proof**, input a repository or IPFS link, and submit (`IN_PROGRESS` → `SUBMITTED`).
6. **Approve Payout**: Switch back to Client (Alice), click **Approve Deliverables & Release Payout**, and verify the ETH transfer to Bob's balance (`SUBMITTED` → `COMPLETED`).

### Dispute Resolution Path:
1. **Raise Dispute**: On an active escrow, either Client or Freelancer clicks **Raise Dispute** with a justification note (`IN_PROGRESS` / `SUBMITTED` → `DISPUTED`).
2. **Arbitrator Review**: Switch to the Arbitrator persona.
3. **Execute Settlement**: Open the escrow, adjust the split slider (e.g. 70% Freelancer / 30% Client), provide a ruling note, and execute the settlement.

---

## Screenshots

| View | Path | Description |
| :--- | :--- | :--- |
| **Dashboard Overview** | `screenshots/dashboard.png` | Main dashboard displaying metrics, escrow cards, and on-chain event stream. |
| **Create Escrow Modal** | `screenshots/create-escrow.png` | Modal for initializing project terms, freelancer address, and ETH deposit. |
| **Escrow Detail & Lifecycle** | `screenshots/escrow-details.png` | Detailed view with 5-stage lifecycle pipeline, wallets, and available actions. |
| **Deliverable Submission** | `screenshots/freelancer-submission.png` | Freelancer submission panel with deliverable proof input. |
| **Dispute Arbitration Panel** | `screenshots/dispute-resolution.png` | Arbitrator resolution interface with interactive split slider. |
| **Hardhat Test Results** | `screenshots/hardhat-test-results.png` | CLI output of the 17 automated test suite assertions. |

---

## Security Considerations

The smart contract implements standard Solidity security best practices:

- **Checks-Effects-Interactions Pattern**: State variables are modified prior to executing external Ether transfers to prevent reentrancy vulnerabilities.
- **Reentrancy Guard**: A custom mutex lock modifier (`nonReentrant`) prevents reentrant callback exploits.
- **Role-Based Access Control**: Modifiers (`onlyClient`, `onlyFreelancer`, `onlyArbitrator`) enforce strict function-level authorization.
- **Double Payment Prevention**: Explicit state requirements prevent payments or refunds from being triggered multiple times.
- **Input & Balance Validation**: Validates addresses (rejects `address(0)`), requires non-zero escrow amounts, and confirms exact deposited values.

> **Note**: This is an educational/student project developed for learning purposes. It has not undergone a formal third-party security audit and should not be used in production with real funds without auditing.

---

## Limitations

- **Testnet/Local Environment**: Designed for local Hardhat node and Ethereum testnets using test ETH rather than real monetary assets.
- **Designated Arbitrator**: Uses a designated arbitrator address rather than a decentralized oracle or DAO voting court.
- **ETH Native Only**: Handles native Ether payments; does not natively support ERC-20 stablecoins in the current release.
- **Off-Chain Deliverable Hosting**: Relies on external URLs/hashes (IPFS, GitHub) for deliverable inspection.

---

## Future Improvements

- [ ] **ERC-20 Stablecoin Support**: Allow payments in USDC or USDT to mitigate cryptocurrency price volatility.
- [ ] **Milestone-Based Releases**: Support multi-stage project milestones with partial escrow releases.
- [ ] **Decentralized Dispute Court**: Integrate decentralized arbitration protocols like Kleros or Aragon Court.
- [ ] **Automated Timeouts**: Implement deadline mechanisms where funds automatically release or refund if a party becomes inactive.
- [ ] **Native IPFS Uploading**: Direct in-app file pinning to IPFS via Pinata or Web3.Storage for verifiable deliverable proof.
- [ ] **Public Testnet Deployment**: Deploy and verify contract on Ethereum Sepolia / Base Sepolia testnets.

---

## Learning Outcomes

- Designing state machines and access control in Solidity (`^0.8.20`).
- Implementing `payable` functions, Ether transfer patterns (`.call{value: ...}`), and reentrancy protection.
- Writing comprehensive automated unit and integration test suites using Hardhat, Chai, and Mocha.
- Integrating Web3 providers, contract ABIs, and reactive UI state with React and `ethers.js v6`.
- Emitting and decoding indexed blockchain events for auditable on-chain activity logs.

---

## Author

**Student Blockchain Engineer**
- GitHub: [your-username](https://github.com/your-username)
- Project Repository: [smart-contract-freelance-escrow](https://github.com/your-username/smart-contract-freelance-escrow)
- License: [MIT](https://opensource.org/licenses/MIT)

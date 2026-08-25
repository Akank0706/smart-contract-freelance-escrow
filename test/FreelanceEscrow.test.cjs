const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FreelanceEscrow Smart Contract Test Suite", function () {
  let FreelanceEscrow;
  let escrow;
  let owner, client, freelancer, arbitrator, bystander;
  const sampleAmount = ethers.parseEther("1.0");

  beforeEach(async function () {
    [owner, client, freelancer, arbitrator, bystander] = await ethers.getSigners();
    FreelanceEscrow = await ethers.getContractFactory("FreelanceEscrow");
    escrow = await FreelanceEscrow.deploy();
    await escrow.waitForDeployment();
  });

  describe("1. Deployment & Initialization", function () {
    it("should set deployer as default arbitrator", async function () {
      expect(await escrow.defaultArbitrator()).to.equal(owner.address);
    });

    it("should initialize with zero escrow counter and zero balance", async function () {
      expect(await escrow.getEscrowCount()).to.equal(0);
      expect(await escrow.getContractBalance()).to.equal(0);
    });
  });

  describe("2. Escrow Creation & Validation", function () {
    it("should create escrow without immediate funding", async function () {
      const tx = await escrow.connect(client).createEscrow(
        freelancer.address,
        arbitrator.address,
        "Landing Page Redesign",
        "Design responsive modern landing page in React",
        sampleAmount
      );
      await tx.wait();

      expect(await escrow.getEscrowCount()).to.equal(1);
      const e = await escrow.getEscrow(1);
      expect(e.id).to.equal(1);
      expect(e.client).to.equal(client.address);
      expect(e.freelancer).to.equal(freelancer.address);
      expect(e.arbitrator).to.equal(arbitrator.address);
      expect(e.amount).to.equal(sampleAmount);
      expect(e.state).to.equal(0); // State.CREATED
    });

    it("should create and immediately fund escrow if exact ETH is attached", async function () {
      await expect(
        escrow.connect(client).createEscrow(
          freelancer.address,
          arbitrator.address,
          "Fullstack Escrow App",
          "Deliver smart contract and frontend",
          sampleAmount,
          { value: sampleAmount }
        )
      )
        .to.emit(escrow, "FundsDeposited")
        .withArgs(1, client.address, sampleAmount, (v) => v > 0);

      const e = await escrow.getEscrow(1);
      expect(e.state).to.equal(1); // State.FUNDED
      expect(await escrow.getContractBalance()).to.equal(sampleAmount);
    });

    it("should reject creation with zero address as freelancer", async function () {
      await expect(
        escrow.connect(client).createEscrow(
          ethers.ZeroAddress,
          arbitrator.address,
          "Invalid Project",
          "Zero address",
          sampleAmount
        )
      ).to.be.revertedWith("InvalidAddress: freelancer cannot be zero address");
    });

    it("should reject creation if client sets self as freelancer", async function () {
      await expect(
        escrow.connect(client).createEscrow(
          client.address,
          arbitrator.address,
          "Invalid Self Project",
          "Client as freelancer",
          sampleAmount
        )
      ).to.be.revertedWith("InvalidParty: client cannot be the freelancer");
    });

    it("should reject creation with 0 amount", async function () {
      await expect(
        escrow.connect(client).createEscrow(
          freelancer.address,
          arbitrator.address,
          "Zero Amount Project",
          "Zero amount",
          0
        )
      ).to.be.revertedWith("InvalidAmount: escrow amount must be greater than zero");
    });
  });

  describe("3. Funding Workflow", function () {
    beforeEach(async function () {
      await escrow.connect(client).createEscrow(
        freelancer.address,
        arbitrator.address,
        "Mobile App UI",
        "Figma design system",
        sampleAmount
      );
    });

    it("should allow client to fund created escrow with exact amount", async function () {
      await expect(
        escrow.connect(client).fundEscrow(1, { value: sampleAmount })
      )
        .to.emit(escrow, "FundsDeposited")
        .withArgs(1, client.address, sampleAmount, (v) => v > 0);

      const e = await escrow.getEscrow(1);
      expect(e.state).to.equal(1); // State.FUNDED
      expect(await escrow.getContractBalance()).to.equal(sampleAmount);
    });

    it("should revert if funding with incorrect amount", async function () {
      const wrongAmount = ethers.parseEther("0.5");
      await expect(
        escrow.connect(client).fundEscrow(1, { value: wrongAmount })
      ).to.be.revertedWith("DepositMismatch: deposited value must equal escrow amount");
    });

    it("should revert if non-client attempts to fund", async function () {
      await expect(
        escrow.connect(bystander).fundEscrow(1, { value: sampleAmount })
      ).to.be.revertedWith("AccessControl: caller is not the client");
    });
  });

  describe("4. Work Progress & Submission", function () {
    beforeEach(async function () {
      await escrow.connect(client).createEscrow(
        freelancer.address,
        arbitrator.address,
        "Smart Contract Audit",
        "Audit smart contracts and write report",
        sampleAmount,
        { value: sampleAmount }
      );
    });

    it("should allow freelancer to start work", async function () {
      await expect(escrow.connect(freelancer).startWork(1))
        .to.emit(escrow, "WorkStarted")
        .withArgs(1, freelancer.address, (v) => v > 0);

      const e = await escrow.getEscrow(1);
      expect(e.state).to.equal(2); // State.IN_PROGRESS
    });

    it("should reject unauthorized user starting work", async function () {
      await expect(escrow.connect(bystander).startWork(1)).to.be.revertedWith(
        "AccessControl: caller is not the freelancer"
      );
    });

    it("should allow freelancer to submit deliverables with proof", async function () {
      await escrow.connect(freelancer).startWork(1);
      const proofUrl = "https://ipfs.io/ipfs/QmAuditReportHash";

      await expect(escrow.connect(freelancer).submitWork(1, proofUrl))
        .to.emit(escrow, "WorkSubmitted")
        .withArgs(1, freelancer.address, proofUrl, (v) => v > 0);

      const e = await escrow.getEscrow(1);
      expect(e.state).to.equal(3); // State.SUBMITTED
      expect(e.submissionProof).to.equal(proofUrl);
    });
  });

  describe("5. Payment Approval & Double-Release Prevention", function () {
    beforeEach(async function () {
      await escrow.connect(client).createEscrow(
        freelancer.address,
        arbitrator.address,
        "Backend Microservice",
        "Golang REST API and unit tests",
        sampleAmount,
        { value: sampleAmount }
      );
      await escrow.connect(freelancer).startWork(1);
      await escrow.connect(freelancer).submitWork(1, "https://github.com/pr/123");
    });

    it("should allow client to approve submitted work and release funds to freelancer", async function () {
      const initialFreelancerBalance = await ethers.provider.getBalance(freelancer.address);

      await expect(escrow.connect(client).approveAndReleasePayment(1))
        .to.emit(escrow, "PaymentReleased")
        .withArgs(1, freelancer.address, sampleAmount, (v) => v > 0);

      const finalFreelancerBalance = await ethers.provider.getBalance(freelancer.address);
      expect(finalFreelancerBalance - initialFreelancerBalance).to.equal(sampleAmount);

      const e = await escrow.getEscrow(1);
      expect(e.state).to.equal(4); // State.COMPLETED
      expect(await escrow.getContractBalance()).to.equal(0);
    });

    it("should prevent payment from being released twice", async function () {
      await escrow.connect(client).approveAndReleasePayment(1);

      await expect(
        escrow.connect(client).approveAndReleasePayment(1)
      ).to.be.revertedWith("StateError: invalid escrow state for this action");
    });

    it("should prevent non-client from approving payment", async function () {
      await expect(
        escrow.connect(freelancer).approveAndReleasePayment(1)
      ).to.be.revertedWith("AccessControl: caller is not the client");
    });
  });

  describe("6. Cancellation & Refunds", function () {
    it("should allow client to cancel and receive full refund before work starts", async function () {
      await escrow.connect(client).createEscrow(
        freelancer.address,
        arbitrator.address,
        "Cancelled Project",
        "Terms changed",
        sampleAmount,
        { value: sampleAmount }
      );

      const initialClientBalance = await ethers.provider.getBalance(client.address);

      const tx = await escrow.connect(client).cancelAndRefund(1);
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      const finalClientBalance = await ethers.provider.getBalance(client.address);
      expect(finalClientBalance + gasSpent - initialClientBalance).to.equal(sampleAmount);

      const e = await escrow.getEscrow(1);
      expect(e.state).to.equal(5); // State.CANCELLED
      expect(await escrow.getContractBalance()).to.equal(0);
    });

    it("should reject cancellation once work is submitted", async function () {
      await escrow.connect(client).createEscrow(
        freelancer.address,
        arbitrator.address,
        "Completed Work",
        "Testing cancellation lock",
        sampleAmount,
        { value: sampleAmount }
      );
      await escrow.connect(freelancer).submitWork(1, "ipfs://proof");

      await expect(
        escrow.connect(client).cancelAndRefund(1)
      ).to.be.revertedWith("StateError: cancellation only allowed before work is in progress or submitted");
    });
  });

  describe("7. Dispute Raising & Arbitrator Settlement", function () {
    beforeEach(async function () {
      await escrow.connect(client).createEscrow(
        freelancer.address,
        arbitrator.address,
        "Disputed Website",
        "Build 5 pages with animation",
        sampleAmount,
        { value: sampleAmount }
      );
      await escrow.connect(freelancer).startWork(1);
      await escrow.connect(freelancer).submitWork(1, "https://unfinished-site.com");
    });

    it("should allow client or freelancer to raise dispute", async function () {
      await expect(
        escrow.connect(client).raiseDispute(1, "Deliverables incomplete, missing 2 pages")
      )
        .to.emit(escrow, "DisputeRaised")
        .withArgs(1, client.address, "Deliverables incomplete, missing 2 pages", (v) => v > 0);

      const e = await escrow.getEscrow(1);
      expect(e.state).to.equal(6); // State.DISPUTED
    });

    it("should allow arbitrator to resolve dispute with custom split (e.g. 60% freelancer / 40% client)", async function () {
      await escrow.connect(client).raiseDispute(1, "Incomplete specs");

      const freelancerInit = await ethers.provider.getBalance(freelancer.address);
      const clientInit = await ethers.provider.getBalance(client.address);

      const splitPercent = 60; // 60% to freelancer, 40% to client
      const expectedFreelancer = (sampleAmount * 60n) / 100n;
      const expectedClient = sampleAmount - expectedFreelancer;

      await expect(
        escrow.connect(arbitrator).resolveDispute(
          1,
          splitPercent,
          "Partially delivered features verified. 60/40 fair allocation."
        )
      )
        .to.emit(escrow, "DisputeResolved")
        .withArgs(
          1,
          arbitrator.address,
          expectedFreelancer,
          expectedClient,
          "Partially delivered features verified. 60/40 fair allocation.",
          (v) => v > 0
        );

      const freelancerFinal = await ethers.provider.getBalance(freelancer.address);
      const clientFinal = await ethers.provider.getBalance(client.address);

      expect(freelancerFinal - freelancerInit).to.equal(expectedFreelancer);
      expect(clientFinal - clientInit).to.equal(expectedClient);

      expect(await escrow.getContractBalance()).to.equal(0);
    });

    it("should reject dispute resolution by unauthorized party", async function () {
      await escrow.connect(client).raiseDispute(1, "Conflict");
      await expect(
        escrow.connect(bystander).resolveDispute(1, 50, "Unauthorized decision")
      ).to.be.revertedWith("AccessControl: caller is not the authorized arbitrator");
    });
  });
});

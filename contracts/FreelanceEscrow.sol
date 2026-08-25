// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FreelanceEscrow
 * @author Student Blockchain Engineer
 * @notice A trust-minimized, decentralized freelance escrow smart contract.
 * @dev Implements milestone/project fund locking, work submission, approval,
 * refund upon cancellation, dispute handling, and arbitrator settlement.
 * Follows the Checks-Effects-Interactions pattern with nonReentrant safety.
 */
contract FreelanceEscrow {

    // --- ENUMS & STRUCTS ---

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

    // --- STATE VARIABLES ---

    uint256 public escrowCounter;
    mapping(uint256 => Escrow) public escrows;

    // Mutex lock for Reentrancy protection
    bool private _locked;

    // Platform default arbitrator (deployer/fallback)
    address public defaultArbitrator;

    // --- EVENTS ---

    event EscrowCreated(
        uint256 indexed id,
        string title,
        address indexed client,
        address indexed freelancer,
        address arbitrator,
        uint256 amount,
        uint256 createdAt
    );

    event FundsDeposited(
        uint256 indexed id,
        address indexed client,
        uint256 amount,
        uint256 timestamp
    );

    event WorkStarted(
        uint256 indexed id,
        address indexed freelancer,
        uint256 timestamp
    );

    event WorkSubmitted(
        uint256 indexed id,
        address indexed freelancer,
        string submissionProof,
        uint256 timestamp
    );

    event PaymentReleased(
        uint256 indexed id,
        address indexed freelancer,
        uint256 amount,
        uint256 timestamp
    );

    event EscrowCancelled(
        uint256 indexed id,
        address indexed client,
        uint256 refundAmount,
        uint256 timestamp
    );

    event DisputeRaised(
        uint256 indexed id,
        address indexed raisedBy,
        string reason,
        uint256 timestamp
    );

    event DisputeResolved(
        uint256 indexed id,
        address indexed arbitrator,
        uint256 freelancerShare,
        uint256 clientShare,
        string rulingNote,
        uint256 timestamp
    );

    // --- MODIFIERS ---

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

    // --- CONSTRUCTOR ---

    constructor() {
        defaultArbitrator = msg.sender;
    }

    // --- CORE ESCROW FUNCTIONS ---

    /**
     * @notice Creates a new escrow contract instance for a freelance gig.
     * @param _freelancer Wallet address of the freelancer.
     * @param _arbitrator Designated arbitrator (or address(0) to use default).
     * @param _title Title or summary of the gig.
     * @param _description Deliverables requirements and project terms.
     * @param _amount Agreed total payment amount in Wei.
     * @return id The generated escrow ID.
     */
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

        // If client attached ETH during creation equal to amount, fund it immediately
        if (msg.value > 0) {
            require(msg.value == _amount, "DepositMismatch: attached ETH must match exact escrow amount");
            escrows[id].state = State.FUNDED;
            escrows[id].fundedAt = block.timestamp;
            emit FundsDeposited(id, msg.sender, msg.value, block.timestamp);
        }
    }

    /**
     * @notice Deposit the required payment into the escrow contract.
     * @param _id Escrow ID.
     */
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

    /**
     * @notice Freelancer signals that work on the project has officially started.
     * @param _id Escrow ID.
     */
    function startWork(uint256 _id)
        external
        escrowExists(_id)
        onlyFreelancer(_id)
        inState(_id, State.FUNDED)
    {
        escrows[_id].state = State.IN_PROGRESS;
        emit WorkStarted(_id, msg.sender, block.timestamp);
    }

    /**
     * @notice Freelancer submits completed deliverables with proof (IPFS / URL / notes).
     * @param _id Escrow ID.
     * @param _submissionProof Deliverables proof link or verification hash.
     */
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

    /**
     * @notice Client inspects and approves submitted work, releasing 100% of escrow funds to freelancer.
     * @param _id Escrow ID.
     */
    function approveAndReleasePayment(uint256 _id)
        external
        escrowExists(_id)
        onlyClient(_id)
        inState(_id, State.SUBMITTED)
        nonReentrant
    {
        Escrow storage item = escrows[_id];
        uint256 payout = item.amount;

        // 1. Checks: state validated by modifier
        // 2. Effects: update contract state first
        item.state = State.COMPLETED;
        item.completedAt = block.timestamp;
        item.freelancerPayout = payout;

        emit PaymentReleased(_id, item.freelancer, payout, block.timestamp);

        // 3. Interactions: transfer funds
        (bool success, ) = item.freelancer.call{value: payout}("");
        require(success, "TransferFailed: ether transfer to freelancer failed");
    }

    /**
     * @notice Client cancels the escrow and recovers deposit if work has not yet started.
     * @param _id Escrow ID.
     */
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

    /**
     * @notice Either client or freelancer can raise a dispute if deliverables or requirements are contested.
     * @param _id Escrow ID.
     * @param _reason Explanation of the dispute.
     */
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

    /**
     * @notice Designated arbitrator reviews evidence and settles the dispute.
     * @param _id Escrow ID.
     * @param _freelancerPercent Percentage (0 to 100) allocated to the freelancer. (Remainder returned to client).
     * @param _rulingNote Arbitrator's written justification and findings.
     */
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

        // Update state
        item.state = (_freelancerPercent == 100) ? State.COMPLETED : (_freelancerPercent == 0 ? State.REFUNDED : State.COMPLETED);
        item.completedAt = block.timestamp;
        item.arbitrationRuling = _rulingNote;
        item.freelancerPayout = freelancerShare;
        item.clientRefund = clientShare;

        emit DisputeResolved(_id, msg.sender, freelancerShare, clientShare, _rulingNote, block.timestamp);

        // Disburse payouts
        if (freelancerShare > 0) {
            (bool fSuccess, ) = item.freelancer.call{value: freelancerShare}("");
            require(fSuccess, "TransferFailed: transfer to freelancer failed");
        }

        if (clientShare > 0) {
            (bool cSuccess, ) = item.client.call{value: clientShare}("");
            require(cSuccess, "TransferFailed: refund to client failed");
        }
    }

    // --- VIEW / HELPER FUNCTIONS ---

    /**
     * @notice Returns total number of escrows created on this contract.
     */
    function getEscrowCount() external view returns (uint256) {
        return escrowCounter;
    }

    /**
     * @notice Get full details of a specific escrow.
     */
    function getEscrow(uint256 _id) external view escrowExists(_id) returns (Escrow memory) {
        return escrows[_id];
    }

    /**
     * @notice Get the total balance of Ether currently locked in this smart contract.
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CommunitySavingsCircle
 * @notice Decentralized ROSCA (Rotating Savings and Credit Association) platform
 * @dev Implements traditional savings circles on blockchain with automated payouts
 */
contract CommunitySavingsCircle is Ownable, ReentrancyGuard {
    
    // Circle status
    enum CircleStatus {
        Recruiting,    // Circle is accepting members
        Active,        // Circle is running
        Completed,     // All members have received payouts
        Cancelled      // Circle was cancelled
    }
    
    // Member status in a circle
    enum MemberStatus {
        Active,        // Active participant
        Received,      // Has received their payout
        Defaulted,     // Missed contribution
        Withdrawn      // Left the circle
    }
    
    // Savings Circle structure
    struct SavingsCircle {
        uint256 circleId;
        string name;
        address creator;
        uint256 contributionAmount;    // Amount each member contributes per cycle
        uint256 cycleDuration;         // Duration of each cycle in seconds
        uint256 maxMembers;            // Maximum number of members
        uint256 currentMembers;        // Current number of members
        uint256 startTime;             // When circle becomes active
        uint256 currentCycle;          // Current cycle number
        CircleStatus status;
        bool isPrivate;                // Requires approval to join
        uint256 collateralRequired;    // Optional collateral amount
        uint256 totalContributed;      // Total amount contributed
        uint256 totalDistributed;      // Total amount distributed
    }
    
    // Member information
    struct Member {
        address memberAddress;
        uint256 joinedAt;
        uint256 cycleReceived;         // Which cycle they received payout (0 if not yet)
        MemberStatus status;
        uint256 contributionsMade;
        uint256 missedContributions;
        uint256 collateralDeposited;
        bool hasVoted;                 // For payout recipient voting
    }
    
    // Contribution record
    struct Contribution {
        address contributor;
        uint256 amount;
        uint256 cycle;
        uint256 timestamp;
    }
    
    // Payout record
    struct Payout {
        address recipient;
        uint256 amount;
        uint256 cycle;
        uint256 timestamp;
        bool distributed;
    }
    
    // Storage
    mapping(uint256 => SavingsCircle) public savingsCircles;
    mapping(uint256 => mapping(address => Member)) public circleMembers;
    mapping(uint256 => address[]) public circleMemberList;
    mapping(uint256 => Contribution[]) public circleContributions;
    mapping(uint256 => Payout[]) public circlePayouts;
    mapping(uint256 => mapping(uint256 => address)) public cycleRecipients; // circleId => cycle => recipient
    mapping(uint256 => mapping(address => bool)) public memberExists;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasContributed; // circleId => cycle => member => contributed
    mapping(address => uint256[]) public userCircles;
    
    uint256 public totalCircles;
    uint256 public platformFeePercent = 100; // 1% (in basis points, 100 = 1%)
    uint256 public accumulatedFees;
    
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant MIN_CONTRIBUTION = 0.1 ether;
    uint256 private constant MAX_MEMBERS = 50;
    uint256 private constant MIN_MEMBERS = 3;
    uint256 private constant MIN_CYCLE_DURATION = 1 days;
    
    // Events
    event CircleCreated(uint256 indexed circleId, string name, address indexed creator, uint256 contributionAmount, uint256 maxMembers);
    event MemberJoined(uint256 indexed circleId, address indexed member);
    event CircleStarted(uint256 indexed circleId, uint256 startTime);
    event ContributionMade(uint256 indexed circleId, address indexed contributor, uint256 amount, uint256 cycle);
    event PayoutDistributed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 cycle);
    event CircleCompleted(uint256 indexed circleId);
    event MemberDefaulted(uint256 indexed circleId, address indexed member, uint256 cycle);
    event CircleCancelled(uint256 indexed circleId);
    event RecipientSelected(uint256 indexed circleId, uint256 cycle, address indexed recipient);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Create a new savings circle
     */
    function createCircle(
        string memory name,
        uint256 contributionAmount,
        uint256 cycleDurationDays,
        uint256 maxMembers,
        bool isPrivate,
        uint256 collateralRequired
    ) external payable returns (uint256) {
        require(bytes(name).length > 0, "Name required");
        require(contributionAmount >= MIN_CONTRIBUTION, "Contribution too low");
        require(maxMembers >= MIN_MEMBERS && maxMembers <= MAX_MEMBERS, "Invalid member count");
        require(cycleDurationDays >= 1, "Cycle too short");
        require(msg.value >= collateralRequired, "Insufficient collateral");
        
        totalCircles++;
        
        uint256 cycleDuration = cycleDurationDays * 1 days;
        
        savingsCircles[totalCircles] = SavingsCircle({
            circleId: totalCircles,
            name: name,
            creator: msg.sender,
            contributionAmount: contributionAmount,
            cycleDuration: cycleDuration,
            maxMembers: maxMembers,
            currentMembers: 0,
            startTime: 0,
            currentCycle: 0,
            status: CircleStatus.Recruiting,
            isPrivate: isPrivate,
            collateralRequired: collateralRequired,
            totalContributed: 0,
            totalDistributed: 0
        });
        
        emit CircleCreated(totalCircles, name, msg.sender, contributionAmount, maxMembers);
        
        // Creator automatically joins
        _joinCircle(totalCircles, msg.sender, msg.value);
        
        return totalCircles;
    }
    
    /**
     * @notice Join an existing savings circle
     */
    function joinCircle(uint256 circleId) external payable nonReentrant {
        SavingsCircle storage circle = savingsCircles[circleId];
        require(circle.circleId != 0, "Circle doesn't exist");
        require(circle.status == CircleStatus.Recruiting, "Circle not recruiting");
        require(!memberExists[circleId][msg.sender], "Already a member");
        require(circle.currentMembers < circle.maxMembers, "Circle full");
        require(msg.value >= circle.collateralRequired, "Insufficient collateral");
        
        _joinCircle(circleId, msg.sender, msg.value);
    }
    
    /**
     * @notice Internal function to join circle
     */
    function _joinCircle(uint256 circleId, address member, uint256 collateral) internal {
        SavingsCircle storage circle = savingsCircles[circleId];
        
        circleMembers[circleId][member] = Member({
            memberAddress: member,
            joinedAt: block.timestamp,
            cycleReceived: 0,
            status: MemberStatus.Active,
            contributionsMade: 0,
            missedContributions: 0,
            collateralDeposited: collateral,
            hasVoted: false
        });
        
        circleMemberList[circleId].push(member);
        memberExists[circleId][member] = true;
        circle.currentMembers++;
        userCircles[member].push(circleId);
        
        emit MemberJoined(circleId, member);
        
        // If circle is full, start it automatically
        if (circle.currentMembers == circle.maxMembers) {
            _startCircle(circleId);
        }
    }
    
    /**
     * @notice Start a circle manually (for creator)
     */
    function startCircle(uint256 circleId) external {
        SavingsCircle storage circle = savingsCircles[circleId];
        require(msg.sender == circle.creator, "Only creator");
        require(circle.status == CircleStatus.Recruiting, "Cannot start");
        require(circle.currentMembers >= MIN_MEMBERS, "Not enough members");
        
        _startCircle(circleId);
    }
    
    /**
     * @notice Internal function to start circle
     */
    function _startCircle(uint256 circleId) internal {
        SavingsCircle storage circle = savingsCircles[circleId];
        
        circle.status = CircleStatus.Active;
        circle.startTime = block.timestamp;
        circle.currentCycle = 1;
        
        emit CircleStarted(circleId, circle.startTime);
    }
    
    /**
     * @notice Make contribution for current cycle
     */
    function contribute(uint256 circleId) external payable nonReentrant {
        SavingsCircle storage circle = savingsCircles[circleId];
        Member storage member = circleMembers[circleId][msg.sender];
        
        require(circle.status == CircleStatus.Active, "Circle not active");
        require(memberExists[circleId][msg.sender], "Not a member");
        require(member.status == MemberStatus.Active, "Member not active");
        require(msg.value == circle.contributionAmount, "Wrong amount");
        require(!hasContributed[circleId][circle.currentCycle][msg.sender], "Already contributed this cycle");
        
        // Check if current cycle has ended
        uint256 cycleEnd = circle.startTime + (circle.currentCycle * circle.cycleDuration);
        require(block.timestamp < cycleEnd, "Cycle ended");
        
        hasContributed[circleId][circle.currentCycle][msg.sender] = true;
        member.contributionsMade++;
        circle.totalContributed += msg.value;
        
        circleContributions[circleId].push(Contribution({
            contributor: msg.sender,
            amount: msg.value,
            cycle: circle.currentCycle,
            timestamp: block.timestamp
        }));
        
        emit ContributionMade(circleId, msg.sender, msg.value, circle.currentCycle);
    }
    
    /**
     * @notice Distribute payout for current cycle
     */
    function distributePayout(uint256 circleId) external nonReentrant {
        SavingsCircle storage circle = savingsCircles[circleId];
        require(circle.status == CircleStatus.Active, "Circle not active");
        
        uint256 cycleEnd = circle.startTime + (circle.currentCycle * circle.cycleDuration);
        require(block.timestamp >= cycleEnd, "Cycle not ended");
        require(cycleRecipients[circleId][circle.currentCycle] == address(0), "Already distributed");
        
        // Select recipient for this cycle
        address recipient = _selectRecipient(circleId);
        require(recipient != address(0), "No eligible recipient");
        
        // Calculate payout amount
        uint256 totalCollected = 0;
        for (uint256 i = 0; i < circleMemberList[circleId].length; i++) {
            address memberAddr = circleMemberList[circleId][i];
            if (hasContributed[circleId][circle.currentCycle][memberAddr]) {
                totalCollected += circle.contributionAmount;
            }
        }
        
        // Deduct platform fee
        uint256 platformFee = (totalCollected * platformFeePercent) / BASIS_POINTS;
        uint256 payoutAmount = totalCollected - platformFee;
        accumulatedFees += platformFee;
        
        // Record payout
        cycleRecipients[circleId][circle.currentCycle] = recipient;
        circleMembers[circleId][recipient].cycleReceived = circle.currentCycle;
        // Keep member active so they can continue contributing
        
        circle.totalDistributed += payoutAmount;
        
        circlePayouts[circleId].push(Payout({
            recipient: recipient,
            amount: payoutAmount,
            cycle: circle.currentCycle,
            timestamp: block.timestamp,
            distributed: true
        }));
        
        // Transfer payout
        (bool success, ) = payable(recipient).call{value: payoutAmount}("");
        require(success, "Transfer failed");
        
        emit PayoutDistributed(circleId, recipient, payoutAmount, circle.currentCycle);
        emit RecipientSelected(circleId, circle.currentCycle, recipient);
        
        // Move to next cycle or complete
        if (circle.currentCycle >= circle.currentMembers) {
            _completeCircle(circleId);
        } else {
            circle.currentCycle++;
        }
    }
    
    /**
     * @notice Select recipient for current cycle (simple: first eligible member)
     */
    function _selectRecipient(uint256 circleId) internal view returns (address) {
        SavingsCircle storage circle = savingsCircles[circleId];
        
        // Find first member who hasn't received payout yet
        for (uint256 i = 0; i < circleMemberList[circleId].length; i++) {
            address memberAddr = circleMemberList[circleId][i];
            Member storage member = circleMembers[circleId][memberAddr];
            
            if (member.status == MemberStatus.Active && member.cycleReceived == 0) {
                return memberAddr;
            }
        }
        
        return address(0);
    }
    
    /**
     * @notice Complete a circle
     */
    function _completeCircle(uint256 circleId) internal {
        SavingsCircle storage circle = savingsCircles[circleId];
        circle.status = CircleStatus.Completed;
        
        // Return collateral to all members
        for (uint256 i = 0; i < circleMemberList[circleId].length; i++) {
            address memberAddr = circleMemberList[circleId][i];
            Member storage member = circleMembers[circleId][memberAddr];
            
            if (member.collateralDeposited > 0) {
                uint256 collateral = member.collateralDeposited;
                member.collateralDeposited = 0;
                (bool success, ) = payable(memberAddr).call{value: collateral}("");
                require(success, "Collateral return failed");
            }
        }
        
        emit CircleCompleted(circleId);
    }
    
    /**
     * @notice Cancel a circle (only creator, only during recruitment)
     */
    function cancelCircle(uint256 circleId) external nonReentrant {
        SavingsCircle storage circle = savingsCircles[circleId];
        require(msg.sender == circle.creator, "Only creator");
        require(circle.status == CircleStatus.Recruiting, "Cannot cancel");
        
        circle.status = CircleStatus.Cancelled;
        
        // Return collateral to all members
        for (uint256 i = 0; i < circleMemberList[circleId].length; i++) {
            address memberAddr = circleMemberList[circleId][i];
            Member storage member = circleMembers[circleId][memberAddr];
            
            if (member.collateralDeposited > 0) {
                uint256 collateral = member.collateralDeposited;
                member.collateralDeposited = 0;
                (bool success, ) = payable(memberAddr).call{value: collateral}("");
                require(success, "Collateral return failed");
            }
        }
        
        emit CircleCancelled(circleId);
    }
    
    /**
     * @notice Get circle members
     */
    function getCircleMembers(uint256 circleId) external view returns (address[] memory) {
        return circleMemberList[circleId];
    }
    
    /**
     * @notice Get user's circles
     */
    function getUserCircles(address user) external view returns (uint256[] memory) {
        return userCircles[user];
    }
    
    /**
     * @notice Get circle contributions
     */
    function getCircleContributions(uint256 circleId) external view returns (Contribution[] memory) {
        return circleContributions[circleId];
    }
    
    /**
     * @notice Get circle payouts
     */
    function getCirclePayouts(uint256 circleId) external view returns (Payout[] memory) {
        return circlePayouts[circleId];
    }
    
    /**
     * @notice Check if member has contributed in current cycle
     */
    function hasContributedThisCycle(uint256 circleId, address member) external view returns (bool) {
        SavingsCircle storage circle = savingsCircles[circleId];
        return hasContributed[circleId][circle.currentCycle][member];
    }
    
    /**
     * @notice Get current cycle end time
     */
    function getCurrentCycleEnd(uint256 circleId) external view returns (uint256) {
        SavingsCircle storage circle = savingsCircles[circleId];
        if (circle.status != CircleStatus.Active) return 0;
        return circle.startTime + (circle.currentCycle * circle.cycleDuration);
    }
    
    /**
     * @notice Update platform fee
     */
    function updatePlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 500, "Fee too high"); // Max 5%
        platformFeePercent = newFeePercent;
    }
    
    /**
     * @notice Withdraw platform fees
     */
    function withdrawFees() external onlyOwner nonReentrant {
        require(accumulatedFees > 0, "No fees");
        
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Transfer failed");
    }
}

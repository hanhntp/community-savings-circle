// Community Savings Circle Contract Configuration
export const CONTRACT_ADDRESS = "0xE1FB3FFf80705bB7976b411bdBE763B215C2678d";

// Celo Sepolia Testnet configuration
export const CELO_SEPOLIA_CONFIG = {
  chainId: "0xAA044C", // 11142220 in hex
  chainName: "Celo Sepolia Testnet",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18
  },
  rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
  blockExplorerUrls: ["https://sepolia.celoscan.io"]
};

// Contract ABI - All essential functions
export const CONTRACT_ABI = [
  // Write functions - Circle Management
  "function createCircle(string name, uint256 contributionAmount, uint256 cycleDurationDays, uint256 maxMembers, bool isPrivate, uint256 collateralRequired) external payable returns (uint256)",
  "function joinCircle(uint256 circleId) external payable",
  "function startCircle(uint256 circleId) external",
  "function cancelCircle(uint256 circleId) external",
  
  // Write functions - Contributions & Payouts
  "function contribute(uint256 circleId) external payable",
  "function distributePayout(uint256 circleId) external",
  
  // Read functions - Circle Info
  "function savingsCircles(uint256) external view returns (uint256 circleId, string name, address creator, uint256 contributionAmount, uint256 cycleDuration, uint256 maxMembers, uint256 currentMembers, uint256 startTime, uint256 currentCycle, uint8 status, bool isPrivate, uint256 collateralRequired, uint256 totalContributed, uint256 totalDistributed)",
  "function totalCircles() external view returns (uint256)",
  "function getCircleMembers(uint256 circleId) external view returns (address[] memory)",
  "function getUserCircles(address user) external view returns (uint256[] memory)",
  "function getCurrentCycleEnd(uint256 circleId) external view returns (uint256)",
  
  // Read functions - Member Info
  "function circleMembers(uint256, address) external view returns (address memberAddress, uint256 joinedAt, uint256 cycleReceived, uint8 status, uint256 contributionsMade, uint256 missedContributions, uint256 collateralDeposited, bool hasVoted)",
  "function memberExists(uint256, address) external view returns (bool)",
  "function hasContributedThisCycle(uint256 circleId, address member) external view returns (bool)",
  
  // Read functions - Contributions & Payouts
  "function getCircleContributions(uint256 circleId) external view returns (tuple(address contributor, uint256 amount, uint256 cycle, uint256 timestamp)[] memory)",
  "function getCirclePayouts(uint256 circleId) external view returns (tuple(address recipient, uint256 amount, uint256 cycle, uint256 timestamp, bool distributed)[] memory)",
  "function cycleRecipients(uint256, uint256) external view returns (address)",
  
  // Read functions - Constants & Admin
  "function platformFeePercent() external view returns (uint256)",
  "function accumulatedFees() external view returns (uint256)",
  "function owner() external view returns (address)",
  
  // Write functions - Admin
  "function updatePlatformFee(uint256 newFeePercent) external",
  "function withdrawFees() external",
  
  // Events
  "event CircleCreated(uint256 indexed circleId, string name, address indexed creator, uint256 contributionAmount, uint256 maxMembers)",
  "event MemberJoined(uint256 indexed circleId, address indexed member)",
  "event CircleStarted(uint256 indexed circleId, uint256 startTime)",
  "event ContributionMade(uint256 indexed circleId, address indexed contributor, uint256 amount, uint256 cycle)",
  "event PayoutDistributed(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 cycle)",
  "event CircleCompleted(uint256 indexed circleId)",
  "event CircleCancelled(uint256 indexed circleId)",
  "event RecipientSelected(uint256 indexed circleId, uint256 cycle, address indexed recipient)"
];

// Circle Status
export const CIRCLE_STATUS = {
  0: "Recruiting",
  1: "Active",
  2: "Completed",
  3: "Cancelled",
  Recruiting: 0,
  Active: 1,
  Completed: 2,
  Cancelled: 3
};

// Member Status
export const MEMBER_STATUS = {
  0: "Active",
  1: "Received",
  2: "Defaulted",
  3: "Withdrawn",
  Active: 0,
  Received: 1,
  Defaulted: 2,
  Withdrawn: 3
};

// Constants from contract
export const MIN_CONTRIBUTION = "0.1"; // in CELO
export const MIN_MEMBERS = 3;
export const MAX_MEMBERS = 50;
export const MIN_CYCLE_DURATION = 1; // in days

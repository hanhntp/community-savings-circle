# Community Savings Circle (ROSCA) DApp

A decentralized Rotating Savings and Credit Association (ROSCA) platform built on Celo blockchain, enabling financial inclusion through traditional community savings circles.

## 🌟 Overview

Community Savings Circle brings the time-tested concept of ROSCAs (common in developing countries) to blockchain technology. Members pool money regularly, and each cycle, one member receives the entire pot. This builds trust, creates credit history, and promotes financial inclusion using Celo's stablecoin ecosystem.

## 📋 Features

- **Create Savings Circles**: Start a circle with customizable parameters
- **Join Circles**: Participate in existing savings circles
- **Regular Contributions**: Make monthly/weekly contributions
- **Automated Payouts**: Smart contract handles distribution fairly
- **Collateral System**: Optional collateral to ensure commitment
- **Transparent & Trustless**: All operations on-chain
- **Low Platform Fee**: Only 1% fee to sustain the platform

## 🚀 Unique Aspects

1. **Financial Inclusion Focus**: Specifically designed for underserved communities
2. **Traditional Finance Bridge**: Digitizes traditional ROSCA systems
3. **Community-Based**: Emphasizes group financial activities
4. **Stablecoin Optimized**: Perfect for Celo's mission
5. **Cycle-Based Economics**: Rotating payout system

## 🏗️ Architecture

### Circle Lifecycle

```
1. Recruiting → 2. Active → 3. Completed
              ↓
        (Can be Cancelled during Recruiting)
```

### Key Components

- **SavingsCircle**: Main circle structure with parameters
- **Member**: Individual participant information
- **Contribution**: Record of payments
- **Payout**: Distribution records
- **CircleStatus**: Recruiting, Active, Completed, Cancelled
- **MemberStatus**: Active, Received, Defaulted, Withdrawn

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Celo Sepolia
npx hardhat run scripts/deploy.js --network celoSepolia
```

## 📝 Configuration

Create `.env` file:

```env
MNEMONIC="your twelve word mnemonic phrase here"
CELOSCAN_API_KEY="your celoscan api key"
```

## 🧪 Testing

The contract has comprehensive test coverage:

```bash
npx hardhat test
```

**Test Results**: ✅ 17 out of 18 tests passing

### Test Coverage

- ✅ Circle Creation
- ✅ Member Joining
- ✅ Contribution Handling
- ✅ Payout Distribution
- ✅ Circle Cancellation
- ✅ View Functions
- ✅ Platform Fee Collection

## 💡 Usage Examples

### Create a Savings Circle

```javascript
const tx = await savingsCircle.createCircle(
  "Monthly Savings 2024",
  ethers.parseEther("1.0"),  // 1 CELO per cycle
  7,                           // 7 days per cycle
  10,                          // max 10 members
  false,                       // not private
  ethers.parseEther("0.5"),    // 0.5 CELO collateral
  { value: ethers.parseEther("0.5") }  // send collateral
);
```

### Join a Circle

```javascript
const tx = await savingsCircle.joinCircle(
  1,  // circleId
  { value: ethers.parseEther("0.5") }  // collateral
);
```

### Make Contribution

```javascript
const tx = await savingsCircle.contribute(
  1,  // circleId
  { value: ethers.parseEther("1.0") }  // contribution amount
);
```

### Distribute Payout

```javascript
// After cycle ends
const tx = await savingsCircle.distributePayout(1);  // circleId
```

## 📖 Contract Functions

### Public Functions

- `createCircle()`: Create new savings circle
- `joinCircle()`: Join existing circle
- `startCircle()`: Manually start circle (creator only)
- `contribute()`: Make contribution for current cycle
- `distributePayout()`: Distribute collected funds to recipient
- `cancelCircle()`: Cancel circle during recruitment

### View Functions

- `getCircleMembers()`: Get all members of a circle
- `getUserCircles()`: Get circles a user is part of
- `getCircleContributions()`: Get contribution history
- `getCirclePayouts()`: Get payout history
- `hasContributedThisCycle()`: Check contribution status
- `getCurrentCycleEnd()`: Get cycle end timestamp

### Admin Functions

- `updatePlatformFee()`: Adjust platform fee (max 5%)
- `withdrawFees()`: Withdraw accumulated fees

## 🔐 Security Features

- **ReentrancyGuard**: Protection against reentrancy attacks
- **Ownable**: Admin functions restricted to owner
- **Input Validation**: Comprehensive parameter checks
- **Collateral System**: Ensures member commitment
- **Platform Fee Cap**: Maximum 5% fee limit

## 📈 Statistics

- **Contract Size**: 2,109,387 gas
- **Average Gas Costs**:
  - Create Circle: ~423,242 gas
  - Join Circle: ~233,565 gas
  - Contribute: ~197,705 gas
  - Distribute Payout: ~321,762 gas

## 🌍 Use Cases

1. **Community Savings Groups**: Traditional ROSCA digitization
2. **Emergency Funds**: Group emergency savings
3. **Business Capital**: Pooling for business investments
4. **Education Funds**: School fee planning
5. **Agricultural Cooperatives**: Farmer savings groups
6. **Women's Groups**: Financial empowerment circles

## 🔄 Comparison with Other DApps

| Feature | Savings Circle | Skill Marketplace | Micro-Insurance | Real Estate |
|---------|---------------|-------------------|-----------------|-------------|
| Focus | Community Savings | Service Escrow | Insurance Pools | Property NFTs |
| Token Type | Native CELO | None | None | ERC-721 |
| Target | Financial Inclusion | Freelancers | Social Impact | Investors |
| Unique Aspect | Rotating Payouts | Dispute System | Health Coverage | Fractional Ownership |

## 📚 Resources

- [Celo Documentation](https://docs.celo.org/)
- [ROSCA Wikipedia](https://en.wikipedia.org/wiki/Rotating_savings_and_credit_association)
- [Hardhat Documentation](https://hardhat.org/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🤝 Contributing

Contributions welcome! This contract could be enhanced with:
- Voting system for payout recipient selection
- Reputation scores for members
- Multiple contribution schedules
- Integration with Celo identity system
- Mobile-first frontend (MiniPay integration)

## 📄 License

MIT License

## 🙏 Acknowledgments

Built for the Celo ecosystem to promote financial inclusion and community empowerment.

---

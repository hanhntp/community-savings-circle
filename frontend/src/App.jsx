import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, CELO_SEPOLIA_CONFIG, CIRCLE_STATUS, MEMBER_STATUS, MIN_CONTRIBUTION, MIN_MEMBERS, MAX_MEMBERS, MIN_CYCLE_DURATION } from './config';
import './App.css';

function App() {
  // State management
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('marketplace');
  
  // Data states
  const [allCircles, setAllCircles] = useState([]);
  const [myCircles, setMyCircles] = useState([]);
  const [contractStats, setContractStats] = useState({
    totalCircles: 0,
    platformFee: 0,
    accumulatedFees: 0
  });
  
  // Form states
  const [newCircle, setNewCircle] = useState({
    name: '',
    contributionAmount: '',
    cycleDurationDays: '30',
    maxMembers: '10',
    isPrivate: false,
    collateralRequired: '0'
  });
  
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [circleDetails, setCircleDetails] = useState(null);

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      setLoading(true);
      setError('');

      if (!window.ethereum) {
        throw new Error('Please install MetaMask to use this DApp');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const network = await web3Provider.getNetwork();

      if (network.chainId !== 11142220n) {
        await switchToCeloSepolia();
      }

      const signer = await web3Provider.getSigner();
      const address = await signer.getAddress();
      const bal = await web3Provider.getBalance(address);

      const savingsContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      setProvider(web3Provider);
      setContract(savingsContract);
      setAccount(address);
      setBalance(ethers.formatEther(bal));
      setSuccess('Wallet connected successfully!');
      
      await loadAllData(savingsContract, address);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Switch to Celo Sepolia network
  const switchToCeloSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CELO_SEPOLIA_CONFIG.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [CELO_SEPOLIA_CONFIG],
        });
      } else {
        throw switchError;
      }
    }
  };

  // Load all data
  const loadAllData = async (contractInstance, userAddress) => {
    try {
      await Promise.all([
        loadAllCircles(contractInstance, userAddress),
        loadMyCircles(contractInstance, userAddress),
        loadContractStats(contractInstance)
      ]);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data from contract');
    }
  };

  // Load all circles
  const loadAllCircles = async (contractInstance, userAddress) => {
    try {
      const total = await contractInstance.totalCircles();
      const loadedCircles = [];

      for (let i = 1; i <= Number(total); i++) {
        const circle = await contractInstance.savingsCircles(i);
        const members = await contractInstance.getCircleMembers(i);
        const isMember = await contractInstance.memberExists(i, userAddress);
        
        let memberInfo = null;
        if (isMember) {
          memberInfo = await contractInstance.circleMembers(i, userAddress);
        }

        // Get current cycle end time if active
        let cycleEndTime = 0;
        if (Number(circle[9]) === CIRCLE_STATUS.Active) {
          cycleEndTime = await contractInstance.getCurrentCycleEnd(i);
        }

        loadedCircles.push({
          circleId: Number(circle[0]),
          name: circle[1],
          creator: circle[2],
          contributionAmount: ethers.formatEther(circle[3]),
          cycleDuration: Number(circle[4]),
          cycleDurationDays: Number(circle[4]) / 86400,
          maxMembers: Number(circle[5]),
          currentMembers: Number(circle[6]),
          startTime: Number(circle[7]),
          currentCycle: Number(circle[8]),
          status: CIRCLE_STATUS[Number(circle[9])],
          statusCode: Number(circle[9]),
          isPrivate: circle[10],
          collateralRequired: ethers.formatEther(circle[11]),
          totalContributed: ethers.formatEther(circle[12]),
          totalDistributed: ethers.formatEther(circle[13]),
          members: members,
          isMember: isMember,
          memberInfo: memberInfo ? {
            joinedAt: Number(memberInfo[1]),
            cycleReceived: Number(memberInfo[2]),
            status: MEMBER_STATUS[Number(memberInfo[3])],
            contributionsMade: Number(memberInfo[4]),
            missedContributions: Number(memberInfo[5]),
            collateralDeposited: ethers.formatEther(memberInfo[6])
          } : null,
          cycleEndTime: Number(cycleEndTime),
          isCreator: circle[2].toLowerCase() === userAddress.toLowerCase()
        });
      }

      setAllCircles(loadedCircles);
    } catch (err) {
      console.error('Error loading circles:', err);
    }
  };

  // Load my circles
  const loadMyCircles = async (contractInstance, userAddress) => {
    try {
      const circleIds = await contractInstance.getUserCircles(userAddress);
      const loadedCircles = [];

      for (let id of circleIds) {
        const circle = await contractInstance.savingsCircles(id);
        const members = await contractInstance.getCircleMembers(id);
        const memberInfo = await contractInstance.circleMembers(id, userAddress);
        const hasContributed = await contractInstance.hasContributedThisCycle(id, userAddress);
        
        // Get current cycle end time if active
        let cycleEndTime = 0;
        if (Number(circle[9]) === CIRCLE_STATUS.Active) {
          cycleEndTime = await contractInstance.getCurrentCycleEnd(id);
        }

        loadedCircles.push({
          circleId: Number(circle[0]),
          name: circle[1],
          creator: circle[2],
          contributionAmount: ethers.formatEther(circle[3]),
          cycleDuration: Number(circle[4]),
          cycleDurationDays: Number(circle[4]) / 86400,
          maxMembers: Number(circle[5]),
          currentMembers: Number(circle[6]),
          startTime: Number(circle[7]),
          currentCycle: Number(circle[8]),
          status: CIRCLE_STATUS[Number(circle[9])],
          statusCode: Number(circle[9]),
          isPrivate: circle[10],
          collateralRequired: ethers.formatEther(circle[11]),
          totalContributed: ethers.formatEther(circle[12]),
          totalDistributed: ethers.formatEther(circle[13]),
          members: members,
          memberInfo: {
            joinedAt: Number(memberInfo[1]),
            cycleReceived: Number(memberInfo[2]),
            status: MEMBER_STATUS[Number(memberInfo[3])],
            contributionsMade: Number(memberInfo[4]),
            missedContributions: Number(memberInfo[5]),
            collateralDeposited: ethers.formatEther(memberInfo[6])
          },
          hasContributed: hasContributed,
          cycleEndTime: Number(cycleEndTime),
          isCreator: circle[2].toLowerCase() === userAddress.toLowerCase()
        });
      }

      setMyCircles(loadedCircles);
    } catch (err) {
      console.error('Error loading my circles:', err);
    }
  };

  // Load contract stats
  const loadContractStats = async (contractInstance) => {
    try {
      const totalCirclesCount = await contractInstance.totalCircles();
      const fee = await contractInstance.platformFeePercent();
      const fees = await contractInstance.accumulatedFees();

      setContractStats({
        totalCircles: Number(totalCirclesCount),
        platformFee: Number(fee) / 100,
        accumulatedFees: ethers.formatEther(fees)
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  // Create new circle
  const handleCreateCircle = async () => {
    if (!contract || !newCircle.name || !newCircle.contributionAmount) return;

    try {
      setLoading(true);
      setError('');

      const contributionAmount = ethers.parseEther(newCircle.contributionAmount);
      const collateralRequired = ethers.parseEther(newCircle.collateralRequired || '0');

      // Creator must pay collateral when creating
      const tx = await contract.createCircle(
        newCircle.name,
        contributionAmount,
        Number(newCircle.cycleDurationDays),
        Number(newCircle.maxMembers),
        newCircle.isPrivate,
        collateralRequired,
        { value: collateralRequired }
      );

      setSuccess('Creating savings circle... Please wait for confirmation.');
      const receipt = await tx.wait();
      
      // Get the circle ID from the event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'CircleCreated';
        } catch (e) {
          return false;
        }
      });
      
      let circleId = 'new circle';
      if (event) {
        const parsed = contract.interface.parseLog(event);
        circleId = `Circle #${parsed.args[0]}`;
      }

      setSuccess(`${circleId} created successfully! You've automatically joined as the first member.`);
      setNewCircle({
        name: '',
        contributionAmount: '',
        cycleDurationDays: '30',
        maxMembers: '10',
        isPrivate: false,
        collateralRequired: '0'
      });

      await loadAllData(contract, account);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error creating circle:', err);
      setError(err.message || 'Failed to create circle');
    } finally {
      setLoading(false);
    }
  };

  // Join circle
  const handleJoinCircle = async (circleId, collateralRequired) => {
    if (!contract) return;

    try {
      setLoading(true);
      setError('');

      const collateral = ethers.parseEther(collateralRequired);
      const tx = await contract.joinCircle(circleId, { value: collateral });

      setSuccess('Joining circle... Please wait for confirmation.');
      await tx.wait();
      
      setSuccess('Successfully joined the savings circle!');
      await loadAllData(contract, account);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error joining circle:', err);
      setError(err.message || 'Failed to join circle');
    } finally {
      setLoading(false);
    }
  };

  // Start circle (creator only)
  const handleStartCircle = async (circleId) => {
    if (!contract) return;

    try {
      setLoading(true);
      setError('');

      const tx = await contract.startCircle(circleId);
      setSuccess('Starting circle... Please wait for confirmation.');
      await tx.wait();
      
      setSuccess('Circle started successfully! Members can now contribute.');
      await loadAllData(contract, account);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error starting circle:', err);
      setError(err.message || 'Failed to start circle');
    } finally {
      setLoading(false);
    }
  };

  // Contribute to circle
  const handleContribute = async (circleId, contributionAmount) => {
    if (!contract) return;

    try {
      setLoading(true);
      setError('');

      const amount = ethers.parseEther(contributionAmount);
      const tx = await contract.contribute(circleId, { value: amount });

      setSuccess('Making contribution... Please wait for confirmation.');
      await tx.wait();
      
      setSuccess('Contribution made successfully!');
      await loadAllData(contract, account);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error contributing:', err);
      setError(err.message || 'Failed to contribute');
    } finally {
      setLoading(false);
    }
  };

  // Distribute payout
  const handleDistributePayout = async (circleId) => {
    if (!contract) return;

    try {
      setLoading(true);
      setError('');

      const tx = await contract.distributePayout(circleId);
      setSuccess('Distributing payout... Please wait for confirmation.');
      await tx.wait();
      
      setSuccess('Payout distributed successfully to the recipient!');
      await loadAllData(contract, account);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error distributing payout:', err);
      setError(err.message || 'Failed to distribute payout');
    } finally {
      setLoading(false);
    }
  };

  // Cancel circle (creator only, recruitment phase)
  const handleCancelCircle = async (circleId) => {
    if (!contract) return;

    const confirmed = window.confirm('Are you sure you want to cancel this circle? All members will receive their collateral back.');
    if (!confirmed) return;

    try {
      setLoading(true);
      setError('');

      const tx = await contract.cancelCircle(circleId);
      setSuccess('Cancelling circle... Please wait for confirmation.');
      await tx.wait();
      
      setSuccess('Circle cancelled successfully. Collateral returned to all members.');
      await loadAllData(contract, account);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error cancelling circle:', err);
      setError(err.message || 'Failed to cancel circle');
    } finally {
      setLoading(false);
    }
  };

  // View circle details
  const handleViewDetails = async (circle) => {
    try {
      setLoading(true);
      
      // Load contributions and payouts
      const contributions = await contract.getCircleContributions(circle.circleId);
      const payouts = await contract.getCirclePayouts(circle.circleId);
      
      const formattedContributions = contributions.map(c => ({
        contributor: c[0],
        amount: ethers.formatEther(c[1]),
        cycle: Number(c[2]),
        timestamp: Number(c[3]),
        date: new Date(Number(c[3]) * 1000).toLocaleString()
      }));
      
      const formattedPayouts = payouts.map(p => ({
        recipient: p[0],
        amount: ethers.formatEther(p[1]),
        cycle: Number(p[2]),
        timestamp: Number(p[3]),
        distributed: p[4],
        date: new Date(Number(p[3]) * 1000).toLocaleString()
      }));

      setCircleDetails({
        ...circle,
        contributions: formattedContributions,
        payouts: formattedPayouts
      });
      
      setSelectedCircle(circle.circleId);
    } catch (err) {
      console.error('Error loading circle details:', err);
      setError('Failed to load circle details');
    } finally {
      setLoading(false);
    }
  };

  // Format time remaining
  const getTimeRemaining = (cycleEndTime) => {
    if (!cycleEndTime || cycleEndTime === 0) return 'N/A';
    
    const now = Math.floor(Date.now() / 1000);
    const remaining = cycleEndTime - now;
    
    if (remaining <= 0) return 'Cycle ended - Ready to distribute';
    
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  // Listen to account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          connectWallet();
        } else {
          setAccount('');
          setContract(null);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="container">
          <h1>🔄 Community Savings Circle</h1>
          <p className="subtitle">Traditional ROSCA on Blockchain - Save Together, Prosper Together</p>
          
          {!account ? (
            <button onClick={connectWallet} className="btn btn-primary" disabled={loading}>
              {loading ? 'Connecting...' : '🦊 Connect MetaMask'}
            </button>
          ) : (
            <div className="wallet-info">
              <div className="wallet-address">
                <span>📍 {account.slice(0, 6)}...{account.slice(-4)}</span>
                <span className="balance">💰 {parseFloat(balance).toFixed(4)} CELO</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="notification error">
          ❌ {error}
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}
      {success && (
        <div className="notification success">
          ✅ {success}
          <button onClick={() => setSuccess('')} className="close-btn">×</button>
        </div>
      )}

      {/* Main Content */}
      <main className="container">
        {!account ? (
          <div className="welcome-section">
            <h2>Welcome to Community Savings Circle (ROSCA)</h2>
            <div className="features">
              <div className="feature-card">
                <h3>🤝 Traditional Savings</h3>
                <p>Join a trusted group savings circle where members contribute regularly</p>
              </div>
              <div className="feature-card">
                <h3>💰 Rotating Payouts</h3>
                <p>Each cycle, one member receives the full pot minus platform fee</p>
              </div>
              <div className="feature-card">
                <h3>🔒 Collateral Protection</h3>
                <p>Optional collateral ensures commitment and trust among members</p>
              </div>
              <div className="feature-card">
                <h3>⚡ Automated System</h3>
                <p>Smart contracts handle contributions and distributions transparently</p>
              </div>
              <div className="feature-card">
                <h3>🌍 Accessible Finance</h3>
                <p>Low minimum contributions make it accessible for everyone</p>
              </div>
              <div className="feature-card">
                <h3>📊 Full Transparency</h3>
                <p>All transactions and history visible on blockchain</p>
              </div>
            </div>
            <p className="connect-prompt">Connect your wallet to get started</p>
          </div>
        ) : (
          <>
            {/* Stats Section */}
            <div className="stats-section">
              <div className="stat-card">
                <h3>{contractStats.totalCircles}</h3>
                <p>Total Circles</p>
              </div>
              <div className="stat-card">
                <h3>{myCircles.length}</h3>
                <p>My Circles</p>
              </div>
              <div className="stat-card">
                <h3>{contractStats.platformFee}%</h3>
                <p>Platform Fee</p>
              </div>
              <div className="stat-card">
                <h3>{parseFloat(contractStats.accumulatedFees).toFixed(2)} CELO</h3>
                <p>Accumulated Fees</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="tabs">
              <button
                className={activeTab === 'marketplace' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('marketplace')}
              >
                🛒 All Circles
              </button>
              <button
                className={activeTab === 'myCircles' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('myCircles')}
              >
                👥 My Circles ({myCircles.length})
              </button>
              <button
                className={activeTab === 'create' ? 'tab active' : 'tab'}
                onClick={() => setActiveTab('create')}
              >
                ➕ Create Circle
              </button>
            </div>

            {/* All Circles Tab */}
            {activeTab === 'marketplace' && (
              <div className="tab-content">
                <h2>All Savings Circles</h2>
                
                {allCircles.length === 0 ? (
                  <div className="empty-state">
                    <p>No savings circles yet. Be the first to create one!</p>
                  </div>
                ) : (
                  <div className="circles-grid">
                    {allCircles.map(circle => (
                      <div key={circle.circleId} className={`circle-card status-${circle.status.toLowerCase()}`}>
                        <div className="circle-header">
                          <h3>{circle.name}</h3>
                          <span className={`badge ${circle.status.toLowerCase()}`}>
                            {circle.status}
                          </span>
                        </div>
                        
                        <div className="circle-details">
                          <div className="detail-row">
                            <span className="label">💰 Contribution:</span>
                            <span className="value">{circle.contributionAmount} CELO</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">⏰ Cycle Duration:</span>
                            <span className="value">{circle.cycleDurationDays} days</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">👥 Members:</span>
                            <span className="value">{circle.currentMembers} / {circle.maxMembers}</span>
                          </div>
                          {circle.collateralRequired !== '0.0' && (
                            <div className="detail-row">
                              <span className="label">🔒 Collateral:</span>
                              <span className="value">{circle.collateralRequired} CELO</span>
                            </div>
                          )}
                          {circle.status === 'Active' && (
                            <>
                              <div className="detail-row">
                                <span className="label">🔄 Current Cycle:</span>
                                <span className="value">{circle.currentCycle}</span>
                              </div>
                              <div className="detail-row">
                                <span className="label">⏳ Time Remaining:</span>
                                <span className="value">{getTimeRemaining(circle.cycleEndTime)}</span>
                              </div>
                            </>
                          )}
                          <div className="detail-row">
                            <span className="label">📊 Total Contributed:</span>
                            <span className="value">{parseFloat(circle.totalContributed).toFixed(2)} CELO</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">💸 Total Distributed:</span>
                            <span className="value">{parseFloat(circle.totalDistributed).toFixed(2)} CELO</span>
                          </div>
                        </div>

                        <div className="circle-actions">
                          {!circle.isMember && circle.status === 'Recruiting' && (
                            <button
                              onClick={() => handleJoinCircle(circle.circleId, circle.collateralRequired)}
                              className="btn btn-primary"
                              disabled={loading || circle.currentMembers >= circle.maxMembers}
                            >
                              {loading ? '⏳ Joining...' : '🤝 Join Circle'}
                            </button>
                          )}
                          {circle.isMember && (
                            <span className="member-badge">✓ Member</span>
                          )}
                          <button
                            onClick={() => handleViewDetails(circle)}
                            className="btn btn-secondary"
                            disabled={loading}
                          >
                            📋 View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Circles Tab */}
            {activeTab === 'myCircles' && (
              <div className="tab-content">
                <h2>My Savings Circles</h2>
                {myCircles.length === 0 ? (
                  <p className="empty-state">You haven't joined any circles yet. Join or create one to get started!</p>
                ) : (
                  <div className="circles-grid">
                    {myCircles.map(circle => (
                      <div key={circle.circleId} className={`circle-card my-circle status-${circle.status.toLowerCase()}`}>
                        <div className="circle-header">
                          <h3>{circle.name}</h3>
                          <div className="header-badges">
                            <span className={`badge ${circle.status.toLowerCase()}`}>
                              {circle.status}
                            </span>
                            {circle.isCreator && <span className="badge creator">Creator</span>}
                          </div>
                        </div>
                        
                        <div className="circle-details">
                          <div className="detail-row">
                            <span className="label">💰 Contribution:</span>
                            <span className="value">{circle.contributionAmount} CELO</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">⏰ Cycle Duration:</span>
                            <span className="value">{circle.cycleDurationDays} days</span>
                          </div>
                          <div className="detail-row">
                            <span className="label">👥 Members:</span>
                            <span className="value">{circle.currentMembers} / {circle.maxMembers}</span>
                          </div>
                          {circle.status === 'Active' && (
                            <>
                              <div className="detail-row">
                                <span className="label">🔄 Current Cycle:</span>
                                <span className="value">{circle.currentCycle}</span>
                              </div>
                              <div className="detail-row">
                                <span className="label">⏳ Time Remaining:</span>
                                <span className="value">{getTimeRemaining(circle.cycleEndTime)}</span>
                              </div>
                              <div className="detail-row">
                                <span className="label">✅ My Contributions:</span>
                                <span className="value">{circle.memberInfo.contributionsMade}</span>
                              </div>
                              <div className="detail-row">
                                <span className="label">📝 This Cycle:</span>
                                <span className={`value ${circle.hasContributed ? 'contributed' : 'pending'}`}>
                                  {circle.hasContributed ? '✓ Contributed' : '⏳ Pending'}
                                </span>
                              </div>
                            </>
                          )}
                          {circle.memberInfo.cycleReceived > 0 && (
                            <div className="detail-row highlight">
                              <span className="label">🎉 Received Payout:</span>
                              <span className="value">Cycle {circle.memberInfo.cycleReceived}</span>
                            </div>
                          )}
                          <div className="detail-row">
                            <span className="label">🔒 My Collateral:</span>
                            <span className="value">{circle.memberInfo.collateralDeposited} CELO</span>
                          </div>
                        </div>

                        <div className="circle-actions">
                          {circle.status === 'Recruiting' && circle.isCreator && circle.currentMembers >= MIN_MEMBERS && (
                            <button
                              onClick={() => handleStartCircle(circle.circleId)}
                              className="btn btn-primary"
                              disabled={loading}
                            >
                              {loading ? '⏳ Starting...' : '🚀 Start Circle'}
                            </button>
                          )}
                          
                          {circle.status === 'Active' && !circle.hasContributed && getTimeRemaining(circle.cycleEndTime) !== 'Cycle ended - Ready to distribute' && (
                            <button
                              onClick={() => handleContribute(circle.circleId, circle.contributionAmount)}
                              className="btn btn-primary"
                              disabled={loading}
                            >
                              {loading ? '⏳ Contributing...' : '💰 Contribute'}
                            </button>
                          )}
                          
                          {circle.status === 'Active' && getTimeRemaining(circle.cycleEndTime) === 'Cycle ended - Ready to distribute' && (
                            <button
                              onClick={() => handleDistributePayout(circle.circleId)}
                              className="btn btn-success"
                              disabled={loading}
                            >
                              {loading ? '⏳ Distributing...' : '💸 Distribute Payout'}
                            </button>
                          )}
                          
                          {circle.status === 'Recruiting' && circle.isCreator && (
                            <button
                              onClick={() => handleCancelCircle(circle.circleId)}
                              className="btn btn-danger"
                              disabled={loading}
                            >
                              {loading ? '⏳ Cancelling...' : '❌ Cancel Circle'}
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleViewDetails(circle)}
                            className="btn btn-secondary"
                            disabled={loading}
                          >
                            📋 View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Create Circle Tab */}
            {activeTab === 'create' && (
              <div className="tab-content">
                <h2>Create New Savings Circle</h2>
                
                <div className="create-form">
                  <div className="form-group">
                    <label>Circle Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Monthly Savings Group"
                      value={newCircle.name}
                      onChange={(e) => setNewCircle({...newCircle, name: e.target.value})}
                    />
                    <small>Give your circle a meaningful name</small>
                  </div>
                  
                  <div className="form-group">
                    <label>Contribution Amount (CELO) *</label>
                    <input
                      type="number"
                      step="0.1"
                      min={MIN_CONTRIBUTION}
                      placeholder={`Minimum ${MIN_CONTRIBUTION} CELO`}
                      value={newCircle.contributionAmount}
                      onChange={(e) => setNewCircle({...newCircle, contributionAmount: e.target.value})}
                    />
                    <small>Amount each member contributes per cycle (min {MIN_CONTRIBUTION} CELO)</small>
                  </div>
                  
                  <div className="form-group">
                    <label>Cycle Duration (Days) *</label>
                    <input
                      type="number"
                      min={MIN_CYCLE_DURATION}
                      placeholder="30"
                      value={newCircle.cycleDurationDays}
                      onChange={(e) => setNewCircle({...newCircle, cycleDurationDays: e.target.value})}
                    />
                    <small>How long each cycle lasts (min {MIN_CYCLE_DURATION} day)</small>
                  </div>
                  
                  <div className="form-group">
                    <label>Maximum Members *</label>
                    <input
                      type="number"
                      min={MIN_MEMBERS}
                      max={MAX_MEMBERS}
                      placeholder="10"
                      value={newCircle.maxMembers}
                      onChange={(e) => setNewCircle({...newCircle, maxMembers: e.target.value})}
                    />
                    <small>Total members in the circle ({MIN_MEMBERS}-{MAX_MEMBERS})</small>
                  </div>
                  
                  <div className="form-group">
                    <label>Collateral Required (CELO)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      value={newCircle.collateralRequired}
                      onChange={(e) => setNewCircle({...newCircle, collateralRequired: e.target.value})}
                    />
                    <small>Optional collateral to ensure commitment (returned after completion)</small>
                  </div>
                  
                  <div className="form-group checkbox">
                    <label>
                      <input
                        type="checkbox"
                        checked={newCircle.isPrivate}
                        onChange={(e) => setNewCircle({...newCircle, isPrivate: e.target.checked})}
                      />
                      <span>Make this a private circle</span>
                    </label>
                    <small>Private circles may require approval to join (future feature)</small>
                  </div>

                  {newCircle.contributionAmount && newCircle.maxMembers && (
                    <div className="calculation-preview">
                      <h3>💡 Circle Preview</h3>
                      <p><strong>Total pot per cycle:</strong> {(parseFloat(newCircle.contributionAmount) * parseFloat(newCircle.maxMembers)).toFixed(2)} CELO</p>
                      <p><strong>Platform fee (1%):</strong> {(parseFloat(newCircle.contributionAmount) * parseFloat(newCircle.maxMembers) * 0.01).toFixed(4)} CELO</p>
                      <p><strong>Payout per cycle:</strong> {(parseFloat(newCircle.contributionAmount) * parseFloat(newCircle.maxMembers) * 0.99).toFixed(2)} CELO</p>
                      <p><strong>Total cycles:</strong> {newCircle.maxMembers}</p>
                      <p><strong>Circle duration:</strong> {parseFloat(newCircle.cycleDurationDays) * parseFloat(newCircle.maxMembers)} days (~{(parseFloat(newCircle.cycleDurationDays) * parseFloat(newCircle.maxMembers) / 30).toFixed(1)} months)</p>
                      {newCircle.collateralRequired && parseFloat(newCircle.collateralRequired) > 0 && (
                        <p className="highlight"><strong>⚠️ You'll pay collateral:</strong> {newCircle.collateralRequired} CELO (refunded after completion)</p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleCreateCircle}
                    className="btn btn-primary btn-large"
                    disabled={loading || !newCircle.name || !newCircle.contributionAmount || parseFloat(newCircle.contributionAmount) < parseFloat(MIN_CONTRIBUTION) || !newCircle.maxMembers}
                  >
                    {loading ? '⏳ Creating...' : '🔄 Create Savings Circle'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Circle Details Modal */}
        {circleDetails && (
          <div className="modal-overlay" onClick={() => setCircleDetails(null)}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{circleDetails.name} - Details</h3>
                <button onClick={() => setCircleDetails(null)} className="close-btn">×</button>
              </div>
              <div className="modal-body">
                <div className="detail-section">
                  <h4>👥 Members ({circleDetails.members.length})</h4>
                  <div className="members-list">
                    {circleDetails.members.map((member, idx) => (
                      <div key={idx} className="member-item">
                        <span className="member-address">
                          {member.slice(0, 6)}...{member.slice(-4)}
                        </span>
                        {member.toLowerCase() === circleDetails.creator.toLowerCase() && (
                          <span className="badge creator">Creator</span>
                        )}
                        {member.toLowerCase() === account.toLowerCase() && (
                          <span className="badge you">You</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {circleDetails.contributions.length > 0 && (
                  <div className="detail-section">
                    <h4>💰 Contributions ({circleDetails.contributions.length})</h4>
                    <div className="transactions-list">
                      {circleDetails.contributions.slice(-10).reverse().map((contribution, idx) => (
                        <div key={idx} className="transaction-item">
                          <span className="tx-info">
                            <strong>Cycle {contribution.cycle}:</strong> {contribution.contributor.slice(0, 6)}...{contribution.contributor.slice(-4)}
                          </span>
                          <span className="tx-amount">{contribution.amount} CELO</span>
                          <span className="tx-date">{contribution.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {circleDetails.payouts.length > 0 && (
                  <div className="detail-section">
                    <h4>💸 Payouts ({circleDetails.payouts.length})</h4>
                    <div className="transactions-list">
                      {circleDetails.payouts.map((payout, idx) => (
                        <div key={idx} className="transaction-item highlight">
                          <span className="tx-info">
                            <strong>Cycle {payout.cycle}:</strong> {payout.recipient.slice(0, 6)}...{payout.recipient.slice(-4)}
                          </span>
                          <span className="tx-amount success">{payout.amount} CELO</span>
                          <span className="tx-date">{payout.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {circleDetails.contributions.length === 0 && circleDetails.payouts.length === 0 && (
                  <p className="empty-state">No transactions yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>🔄 Community Savings Circle | Built on Celo Sepolia</p>
          <p>Contract: <a href={`https://sepolia.celoscan.io/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</a></p>
        </div>
      </footer>
    </div>
  );
}

export default App;


# 🚀 Scryptex - Advanced DeFi Trading Platform

**The Ultimate Multi-Chain Trading, Bridge, and Token Creation Platform**

![Scryptex Banner](https://via.placeholder.com/1200x300/6366f1/ffffff?text=Scryptex+DeFi+Platform)

## 🌟 Overview

Scryptex is a comprehensive DeFi platform that enables seamless trading, bridging, and token creation across multiple blockchains. Built with cutting-edge technology including RiseChain's pEVM (parallel execution) and MegaETH's real-time 10ms blocks.

### 🔥 Key Features

- **🎯 Advanced Trading System** - Pump.fun-style bonding curves with social features
- **🌉 Cross-Chain Bridge** - Secure multi-chain asset transfers with validator consensus
- **🔄 DEX Integration** - Automated market making with multiple trading pairs
- **🎨 Token Creation** - Zero-code token deployment with automatic listing
- **📊 Real-Time Analytics** - Live trading data, charts, and market insights
- **👥 Social Trading** - Community-driven trading with reputation systems
- **⚡ High Performance** - Optimized for parallel execution and real-time processing

## 🏗️ Architecture

### 📁 Project Structure

```
scryptex/
├── 📂 contract/               # Smart Contracts
│   ├── 📂 risechain/         # RiseChain Deployments
│   │   ├── 📂 bridge/        # Bridge Contracts
│   │   ├── 📂 swap/          # Swap/DEX Contracts
│   │   ├── 📂 trading/       # Trading Engine
│   │   └── 📂 create-token/  # Token Factory
│   └── 📂 megaeth/           # MegaETH Deployments
│       ├── 📂 bridge/        # Bridge Contracts
│       └── 📂 trading/       # Trading Engine
├── 📂 backend/               # Node.js API Server
│   ├── 📂 src/              # Source Code
│   ├── 📂 config/           # Configuration
│   ├── 📂 routes/           # API Routes
│   ├── 📂 services/         # Business Logic
│   └── 📂 models/           # Database Models
├── 📂 src/                  # React Frontend
│   ├── 📂 components/       # UI Components
│   ├── 📂 pages/           # Page Components
│   ├── 📂 hooks/           # Custom Hooks
│   └── 📂 lib/             # Utilities
└── 📂 docs/                # Documentation
```

### 🔗 Supported Networks

| Network | Chain ID | Features | Status |
|---------|----------|----------|--------|
| RiseChain Testnet | 11155931 | Full Suite | ✅ Active |
| MegaETH Testnet | 6342 | Real-time Trading | ✅ Active |
| Sepolia | 11155111 | Bridge Testing | ✅ Active |

## 🚀 Quick Start

### 📋 Prerequisites

- Node.js 16+ and npm/yarn
- MongoDB (for backend)
- Redis (for caching)
- MetaMask or compatible wallet

### 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/scryptex/scryptex-platform.git
   cd scryptex-platform
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Configure environment variables**
   ```bash
   # Frontend configuration
   cp frontend/.env.example .env

   # Backend configuration
   cp backend/.env.example backend/.env
   ```

5. **Start development servers**
   ```bash
   # Start frontend (port 5173)
   npm run dev

   # Start backend (port 3001)
   cd backend
   npm run dev
   ```

### 🌐 Environment Configuration

#### Frontend (.env)
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_WS_URL=ws://localhost:3001

# RiseChain Network
VITE_RISE_RPC_URL=https://testnet.rizelabs.xyz
VITE_RISE_CHAIN_ID=11155931

# MegaETH Network
VITE_MEGA_RPC_URL=https://6342.rpc.thirdweb.com
VITE_MEGA_CHAIN_ID=6342

# Contract Addresses (update after deployment)
VITE_RISE_TRADING_ENGINE_ADDRESS=0x...
VITE_RISE_BRIDGE_CORE_ADDRESS=0x...
VITE_MEGA_TRADING_ENGINE_ADDRESS=0x...
```

#### Backend (.env)
```bash
# Server Configuration
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/scryptex

# Blockchain RPCs
RISE_RPC_URL=https://testnet.rizelabs.xyz
MEGA_RPC_URL=https://6342.rpc.thirdweb.com

# Contract Addresses
RISE_TRADING_ENGINE_ADDRESS=0x...
RISE_BRIDGE_CORE_ADDRESS=0x...
MEGA_TRADING_ENGINE_ADDRESS=0x...

# Private Keys (for automated services)
OPERATOR_PRIVATE_KEY=0x...
RELAYER_PRIVATE_KEY=0x...
```

## 📖 Smart Contract Documentation

### 🌉 Bridge System

**Modular Architecture:**
- `BridgeCore.sol` - Source chain transaction initiation
- `BridgeReceiver.sol` - Destination chain execution
- `BridgeMessageRouter.sol` - Cross-chain messaging abstraction
- `ValidatorRegistry.sol` - Validator consensus management
- `FeeTreasury.sol` - Fee collection and distribution
- `PointsModule.sol` - Reward system integration

**Key Features:**
- Multi-signature validator consensus
- Cross-chain message verification
- Automatic fee calculation
- STEX point rewards (20 points per bridge)
- Emergency pause functionality
- MEV protection

### 🔄 Swap/DEX System

**Core Components:**
- `SwapFactory.sol` - Liquidity pair creation
- `SwapPair.sol` - AMM logic and reserves
- `SwapRouter.sol` - User interface for swaps
- `FeeTreasury.sol` - Protocol fee management
- `PointsModule.sol` - Liquidity mining rewards

**AMM Features:**
- Constant product formula (x * y = k)
- Dynamic fee structure (0.25% default)
- Price impact protection
- Slippage tolerance (max 15%)
- TWAP oracle integration

### 📈 Trading System

**Advanced Trading Engine:**
- `TradingEngine.sol` - Core trading logic
- `BondingCurveIntegrator.sol` - Pump.fun curve implementation
- `TokenListingManager.sol` - Automatic token discovery
- `SocialTradingHub.sol` - Community features

**Bonding Curve Formula:**
```solidity
// Exact Pump.fun implementation
function calculatePrice(uint256 supply) public pure returns (uint256) {
    uint256 denominator = 30e18 + supply;
    uint256 numerator = 32190005730 * 1e18;
    return 1073000191 - (numerator / denominator);
}
```

**Trading Features:**
- Automatic token listing (zero delay)
- Social trading with comments
- Real-time price discovery
- Graduation to DEX at $69k market cap
- Anti-MEV protection
- 2% max supply per transaction limit

### 🎨 Token Creation

**Zero-Code Deployment:**
- `TokenFactory.sol` - ERC20 token deployment
- `TokenTemplate.sol` - Standardized token implementation
- `GraduationManager.sol` - DEX migration handling

**Creation Flow:**
1. User deploys token with metadata
2. Automatic bonding curve initialization
3. Immediate trading activation
4. Social features enabled
5. Graduation at market cap threshold

## 🛠️ Development Guide

### 🧪 Smart Contract Development

#### Deploy to RiseChain Testnet
```bash
cd contract/risechain/bridge
npm install
cp .env.example .env
# Update .env with your private key
npm run deploy:bridge
```

#### Deploy to MegaETH Testnet
```bash
cd contract/megaeth/bridge
npm install
cp .env.example .env
# Update .env with your private key
npm run deploy:bridge
```

#### Contract Verification
```bash
# RiseChain verification
npm run verify:all -- --network riseTestnet

# MegaETH verification
npm run verify:all -- --network megaTestnet
```

### 🖥️ Backend Development

#### Database Setup
```bash
# Install MongoDB
brew install mongodb-community
brew services start mongodb-community

# Install Redis
brew install redis
brew services start redis
```

#### API Endpoints

**Trading API:**
- `GET /api/v1/trading/tokens` - List all tokens
- `GET /api/v1/trading/trending` - Trending tokens
- `POST /api/v1/trading/buy` - Execute buy order
- `POST /api/v1/trading/sell` - Execute sell order
- `GET /api/v1/trading/history` - User trading history

**Bridge API:**
- `POST /api/v1/bridge/initiate` - Start bridge transaction
- `GET /api/v1/bridge/status/:id` - Bridge status
- `GET /api/v1/bridge/history` - User bridge history
- `GET /api/v1/bridge/fees` - Calculate bridge fees

**WebSocket Events:**
- `trade_executed` - Real-time trade notifications
- `price_update` - Live price changes
- `bridge_status` - Bridge transaction updates

### 🎨 Frontend Development

#### Key Components
- `TradingDashboard` - Main trading interface
- `BridgeInterface` - Cross-chain transfers
- `TokenCreator` - Token deployment wizard
- `SocialFeed` - Community trading feed
- `PortfolioView` - User holdings and P&L

#### State Management
```typescript
// Trading hook example
const { 
  buyToken, 
  sellToken, 
  getTokenPrice 
} = useTrading();

// Bridge hook example
const { 
  initiateBridge, 
  getBridgeStatus 
} = useBridge();
```

## 🔒 Security Features

### 🛡️ Smart Contract Security
- **ReentrancyGuard** - Prevents reentrancy attacks
- **Pausable** - Emergency stop functionality
- **AccessControl** - Role-based permissions
- **SafeERC20** - Safe token transfers
- **Oracle Integration** - Price feed validation

### 🔐 Backend Security
- **Rate Limiting** - API abuse prevention
- **Input Validation** - Sanitized user inputs
- **JWT Authentication** - Secure user sessions
- **CORS Protection** - Cross-origin restrictions
- **Helmet.js** - Security headers

### 🏷️ Frontend Security
- **CSP Headers** - Content security policy
- **XSS Protection** - Cross-site scripting prevention
- **Input Sanitization** - Clean user inputs
- **Secure Storage** - Encrypted local storage

## 📊 Performance Optimizations

### ⚡ RiseChain pEVM Features
- **Parallel Execution** - Multiple transactions simultaneously
- **Conflict Detection** - Automatic state validation
- **Optimistic Processing** - Faster transaction finality
- **Gas Optimization** - Reduced transaction costs

### 🚀 MegaETH Real-Time Features
- **10ms Mini Blocks** - Ultra-fast confirmations
- **Real-Time APIs** - Instant transaction status
- **Low Gas Costs** - 0.001 gwei base fee
- **High Throughput** - 2 Giga gas blocks

### 📈 Backend Optimizations
- **Redis Caching** - Fast data retrieval
- **Database Indexing** - Optimized queries
- **Connection Pooling** - Efficient DB connections
- **Batch Processing** - Grouped operations

## 🧪 Testing

### Unit Tests
```bash
# Smart contract tests
cd contract/risechain/bridge
npm test

# Backend tests
cd backend
npm test

# Frontend tests
npm test
```

### Integration Tests
```bash
# End-to-end testing
npm run test:e2e

# Load testing
npm run test:load
```

## 🚀 Deployment

### 📦 Production Deployment

#### Smart Contracts
```bash
# Deploy to mainnet (when ready)
npm run deploy:mainnet

# Verify contracts
npm run verify:mainnet
```

#### Backend
```bash
# Build production bundle
npm run build

# Start production server
npm start
```

#### Frontend
```bash
# Build optimized bundle
npm run build

# Deploy to CDN/hosting
npm run deploy
```

### 🌐 Environment Configurations

**Staging Environment:**
- RiseChain Testnet: `https://testnet.rizelabs.xyz`
- MegaETH Testnet: `https://6342.rpc.thirdweb.com`
- Backend API: `https://api-staging.scryptex.xyz`

**Production Environment:**
- RiseChain Mainnet: `https://mainnet.rizelabs.xyz`
- MegaETH Mainnet: `https://mainnet.megaeth.com`
- Backend API: `https://api.scryptex.xyz`

## 📚 API Reference

### 🔗 REST API Endpoints

**Base URL:** `https://api.scryptex.xyz/v1`

#### Trading Endpoints
```http
GET    /trading/tokens              # List tokens
GET    /trading/tokens/{address}    # Token details
POST   /trading/buy                 # Buy tokens
POST   /trading/sell                # Sell tokens
GET    /trading/history             # Trading history
GET    /trading/portfolio           # User portfolio
```

#### Bridge Endpoints
```http
POST   /bridge/initiate             # Start bridge
GET    /bridge/status/{id}          # Bridge status
GET    /bridge/history              # Bridge history
GET    /bridge/fees                 # Calculate fees
```

#### WebSocket Events
```javascript
// Subscribe to real-time events
socket.on('trade_executed', (data) => {
  console.log('New trade:', data);
});

socket.on('price_update', (data) => {
  console.log('Price change:', data);
});
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### 📝 Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### 🐛 Bug Reports
Please use our [Issue Template](.github/ISSUE_TEMPLATE.md) for bug reports.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Website:** [https://scryptex.xyz](https://scryptex.xyz)
- **Documentation:** [https://docs.scryptex.xyz](https://docs.scryptex.xyz)
- **Discord:** [https://discord.gg/scryptex](https://discord.gg/scryptex)
- **Twitter:** [https://twitter.com/ScryptexDeFi](https://twitter.com/ScryptexDeFi)
- **Telegram:** [https://t.me/scryptex](https://t.me/scryptex)

## ⚠️ Disclaimer

This software is in active development. Use at your own risk on testnets only. Always verify smart contract addresses and perform due diligence before interacting with any DeFi protocol.

---

**Built with ❤️ by the Scryptex Team**

*Revolutionizing DeFi through advanced blockchain technology*

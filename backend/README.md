
# 🚀 Scryptex Backend API

**Comprehensive DeFi Backend for Trading, Bridge, and Swap Services**

## 📋 Overview

The Scryptex Backend is a high-performance Node.js API server that provides comprehensive DeFi services including trading, cross-chain bridging, and swap functionality. Built with Express.js and optimized for multi-chain operations across RiseChain and MegaETH.

## 🏗️ Architecture

### 📁 Directory Structure
```
backend/
├── 📂 src/
│   ├── 📂 config/          # Configuration files
│   │   ├── contracts.js    # Smart contract management
│   │   ├── database.js     # MongoDB connection
│   │   └── redis.js        # Redis cache setup
│   ├── 📂 routes/          # API route handlers
│   │   ├── trading.js      # Trading endpoints
│   │   ├── bridge.js       # Bridge endpoints
│   │   ├── swap.js         # Swap endpoints
│   │   ├── tokens.js       # Token management
│   │   ├── analytics.js    # Analytics endpoints
│   │   └── users.js        # User management
│   ├── 📂 services/        # Business logic
│   │   ├── TradingService.js
│   │   ├── BridgeService.js
│   │   ├── SwapService.js
│   │   └── AnalyticsService.js
│   ├── 📂 models/          # Database models
│   │   ├── User.js
│   │   ├── Token.js
│   │   ├── Trade.js
│   │   └── Bridge.js
│   ├── 📂 middleware/      # Express middleware
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── errorHandler.js
│   ├── 📂 utils/           # Utility functions
│   │   ├── logger.js
│   │   ├── crypto.js
│   │   └── helpers.js
│   ├── 📂 websocket/       # WebSocket server
│   │   ├── server.js
│   │   ├── handlers.js
│   │   └── events.js
│   └── 📂 abis/           # Contract ABIs
│       ├── BridgeCore.json
│       ├── TradingEngine.json
│       └── SwapRouter.json
├── 📂 scripts/            # Utility scripts
│   ├── deploy.js
│   ├── migrate.js
│   └── seed.js
├── 📂 tests/              # Test suites
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── 📂 logs/               # Log files
├── .env.example           # Environment template
├── package.json
└── README.md
```

## 🚀 Quick Start

### 📋 Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- Redis 6.0+
- npm or yarn

### 🔧 Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start services**
   ```bash
   # Start MongoDB
   brew services start mongodb-community
   
   # Start Redis
   brew services start redis
   ```

4. **Run the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## ⚙️ Configuration

### 🔐 Environment Variables

**Required Variables:**
```bash
# Server Configuration
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/scryptex
REDIS_URL=redis://localhost:6379

# Blockchain RPCs
RISE_RPC_URL=https://testnet.rizelabs.xyz
MEGA_RPC_URL=https://6342.rpc.thirdweb.com

# Contract Addresses
RISE_TRADING_ENGINE_ADDRESS=0x...
RISE_BRIDGE_CORE_ADDRESS=0x...
MEGA_TRADING_ENGINE_ADDRESS=0x...

# Authentication
JWT_SECRET=your_jwt_secret_key
OPERATOR_PRIVATE_KEY=0x...
```

### 📊 Database Configuration

**MongoDB Collections:**
- `users` - User accounts and profiles
- `tokens` - Token metadata and metrics
- `trades` - Trading transaction records
- `bridges` - Bridge transaction records
- `analytics` - Platform analytics data

**Indexes:**
```javascript
// Optimized database indexes
db.trades.createIndex({ "user": 1, "timestamp": -1 })
db.tokens.createIndex({ "chain": 1, "isActive": 1 })
db.bridges.createIndex({ "transactionId": 1 })
```

## 🔗 API Reference

### 📈 Trading API

#### List Tokens
```http
GET /api/v1/trading/tokens
```

**Parameters:**
- `chain` (string) - Blockchain network (risechain, megaeth)
- `category` (string) - Token category filter
- `search` (string) - Search by name/symbol
- `page` (number) - Page number (default: 1)
- `limit` (number) - Results per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "address": "0x...",
      "name": "Example Token",
      "symbol": "EXT",
      "creator": {
        "address": "0x...",
        "username": "creator123",
        "reputation": 85
      },
      "currentPrice": "0.00001",
      "marketCap": "50000",
      "volume24h": "25000",
      "priceChange24h": 15.5,
      "trendingScore": 1250
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156
  }
}
```

#### Execute Buy Order
```http
POST /api/v1/trading/buy
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "tokenAddress": "0x...",
  "amount": "1.0",
  "maxSlippage": 5,
  "chain": "risechain",
  "socialNote": "Going to the moon! 🚀"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tradeId": "64f7b8c9e8d2a1b3c4d5e6f7",
    "contractAddress": "0x...",
    "expectedTokens": "50000.123",
    "priceImpact": 2.5,
    "fees": {
      "trading": "0.01",
      "gas": "0.005"
    },
    "gasEstimate": "185000"
  }
}
```

### 🌉 Bridge API

#### Initiate Bridge
```http
POST /api/v1/bridge/initiate
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "amount": "5.0",
  "sourceChain": "risechain",
  "destinationChain": "megaeth",
  "destinationAddress": "0x...",
  "tokenAddress": "0x..." // Optional for ERC20
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "bridge_64f7b8c9e8d2a1b3c4d5e6f7",
    "status": "pending",
    "fees": {
      "bridge": "0.015",
      "gas": "0.008"
    },
    "estimatedTime": "5-10 minutes",
    "requiredValidations": 3
  }
}
```

#### Bridge Status
```http
GET /api/v1/bridge/status/{transactionId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "bridge_64f7b8c9e8d2a1b3c4d5e6f7",
    "status": "validated",
    "sourceChain": "risechain",
    "destinationChain": "megaeth",
    "amount": "5.0",
    "progress": {
      "initiated": true,
      "validated": true,
      "executed": false
    },
    "validations": {
      "current": 3,
      "required": 3
    },
    "estimatedCompletion": "2024-01-15T10:30:00Z"
  }
}
```

### 📊 Analytics API

#### Platform Statistics
```http
GET /api/v1/analytics/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalValueLocked": "15500000",
    "totalVolume24h": "2400000",
    "totalTrades24h": 1584,
    "totalUsers": 12650,
    "activeTokens": 245,
    "bridgeVolume24h": "850000",
    "topTokens": [
      {
        "address": "0x...",
        "symbol": "DOGE2",
        "volume24h": "125000",
        "priceChange24h": 45.2
      }
    ]
  }
}
```

## 🔌 WebSocket API

### 📡 Real-Time Events

**Connection:**
```javascript
const socket = io('ws://localhost:3001');
```

**Available Events:**

#### Trade Executed
```javascript
socket.on('trade_executed', (data) => {
  // {
  //   tokenAddress: "0x...",
  //   trader: "0x...",
  //   type: "buy",
  //   amount: "1000.123",
  //   price: "0.00005",
  //   timestamp: "2024-01-15T10:25:30Z",
  //   socialNote: "Diamond hands! 💎"
  // }
});
```

#### Price Update
```javascript
socket.on('price_update', (data) => {
  // {
  //   tokenAddress: "0x...",
  //   price: "0.00006",
  //   priceChange: 12.5,
  //   volume: "50000",
  //   marketCap: "75000"
  // }
});
```

#### Bridge Status Update
```javascript
socket.on('bridge_status', (data) => {
  // {
  //   transactionId: "bridge_...",
  //   status: "executed",
  //   completedAt: "2024-01-15T10:35:00Z"
  // }
});
```

## 🛠️ Services Architecture

### 📈 TradingService

**Core Functions:**
- `getListedTokens()` - Fetch tradeable tokens
- `executeBuyOrder()` - Process buy transactions
- `executeSellOrder()` - Process sell transactions
- `getTokenPriceData()` - Bonding curve calculations
- `calculateTradingFees()` - Fee computation

**Bonding Curve Integration:**
```javascript
// Pump.fun exact formula implementation
calculatePrice(supply) {
  const denominator = 30e18 + supply;
  const numerator = 32190005730 * 1e18;
  return 1073000191 - (numerator / denominator);
}
```

### 🌉 BridgeService

**Core Functions:**
- `initiateBridge()` - Start cross-chain transfer
- `validateTransaction()` - Validator consensus
- `executeBridge()` - Complete transfer
- `calculateBridgeFees()` - Fee estimation

**Validator Consensus:**
```javascript
// Multi-signature validation
async validateTransaction(transactionId, validatorAddress, isValid) {
  const votes = await this.getValidatorVotes(transactionId);
  const requiredVotes = await this.getRequiredValidators();
  
  if (votes.length >= requiredVotes && votes.every(v => v.isValid)) {
    await this.executeTransaction(transactionId);
  }
}
```

### 🔄 SwapService

**Core Functions:**
- `createPair()` - Deploy new trading pairs
- `addLiquidity()` - Provide liquidity
- `removeLiquidity()` - Withdraw liquidity
- `executeSwap()` - Token exchange

**AMM Calculations:**
```javascript
// Constant product formula (x * y = k)
calculateSwapAmount(reserveIn, reserveOut, amountIn) {
  const amountInWithFee = amountIn * 997; // 0.3% fee
  const numerator = amountInWithFee * reserveOut;
  const denominator = (reserveIn * 1000) + amountInWithFee;
  return numerator / denominator;
}
```

## 🔒 Security Features

### 🛡️ Authentication & Authorization

**JWT Token Management:**
```javascript
// Token generation
const token = jwt.sign(
  { userId, address, role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Protected route middleware
const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
};
```

### 🚦 Rate Limiting

**API Rate Limits:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true
});
```

### 🔐 Input Validation

**Request Validation:**
```javascript
// Trading validation
[
  body('tokenAddress').isEthereumAddress(),
  body('amount').isNumeric().isFloat({ min: 0.001 }),
  body('maxSlippage').isNumeric().isFloat({ min: 0, max: 15 }),
  body('chain').isIn(['risechain', 'megaeth'])
]
```

## 📊 Performance Optimization

### 🚀 Caching Strategy

**Redis Caching:**
```javascript
// Cache token data for 5 minutes
const cacheKey = `token:${address}:${chain}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await fetchTokenData(address, chain);
await redis.setex(cacheKey, 300, JSON.stringify(data));
```

### 📈 Database Optimization

**Query Optimization:**
```javascript
// Optimized token listing query
const tokens = await TokenModel.aggregate([
  { $match: { chain, isActive: true } },
  { $lookup: {
    from: 'users',
    localField: 'creator',
    foreignField: '_id',
    as: 'creatorInfo'
  }},
  { $sort: { trendingScore: -1, createdAt: -1 } },
  { $skip: (page - 1) * limit },
  { $limit: limit }
]);
```

### ⚡ Parallel Processing

**Concurrent Operations:**
```javascript
// Parallel data fetching
const [priceData, metrics, trades] = await Promise.all([
  getTokenPriceData(address, chain),
  getTokenMetrics(address, chain),
  getRecentTrades(address, chain, 20)
]);
```

## 🧪 Testing

### 🔬 Unit Tests
```bash
# Run unit tests
npm run test:unit

# Test coverage
npm run test:coverage
```

### 🔗 Integration Tests
```bash
# API integration tests
npm run test:integration

# Database tests
npm run test:db
```

### 🎯 Load Testing
```bash
# Performance testing
npm run test:load

# Stress testing
npm run test:stress
```

## 📝 Logging & Monitoring

### 📊 Logging Configuration

**Winston Logger:**
```javascript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});
```

### 📈 Health Monitoring

**Health Check Endpoint:**
```http
GET /api/v1/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "services": {
    "database": "connected",
    "redis": "connected",
    "risechain": "connected",
    "megaeth": "connected"
  },
  "memory": {
    "used": "256MB",
    "total": "1GB"
  }
}
```

## 🚀 Deployment

### 📦 Production Build
```bash
# Build optimized bundle
npm run build

# Start production server
npm start
```

### 🐳 Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### 🌐 Environment Setup

**Production Environment Variables:**
```bash
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://cluster.mongodb.net/scryptex
REDIS_URL=redis://cluster.redis.net:6379

# SSL/TLS Configuration
SSL_KEY=/path/to/private.key
SSL_CERT=/path/to/certificate.crt

# External Services
SENDGRID_API_KEY=sg.xxx
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## 🤝 Contributing

### 📋 Development Guidelines

1. **Code Style**
   - Use ESLint configuration
   - Follow async/await patterns
   - Add comprehensive error handling

2. **Testing Requirements**
   - Unit tests for all services
   - Integration tests for API endpoints
   - Minimum 80% code coverage

3. **Documentation**
   - JSDoc comments for functions
   - API endpoint documentation
   - README updates for new features

### 🔄 Pull Request Process

1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation
4. Submit PR with detailed description

## 📞 Support

### 🐛 Issue Reporting
- GitHub Issues: [Repository Issues](https://github.com/scryptex/backend/issues)
- Discord: [Development Channel](https://discord.gg/scryptex-dev)

### 📚 Resources
- API Documentation: [docs.scryptex.xyz/api](https://docs.scryptex.xyz/api)
- Developer Guide: [docs.scryptex.xyz/dev](https://docs.scryptex.xyz/dev)

---

**Built with ⚡ by the Scryptex Team**

*Powering the future of DeFi through advanced backend architecture*

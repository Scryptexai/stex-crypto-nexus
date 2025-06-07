
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeContracts } = require('./config/contracts');
const { setupWebSocket } = require('./websocket/server');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Import routes
const tradingRoutes = require('./routes/trading');
const bridgeRoutes = require('./routes/bridge');
const swapRoutes = require('./routes/swap');
const tokensRoutes = require('./routes/tokens');
const analyticsRoutes = require('./routes/analytics');
const userRoutes = require('./routes/users');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(mongoSanitize());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ 
  limit: process.env.MAX_REQUEST_SIZE || '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.MAX_REQUEST_SIZE || '10mb' 
}));

// Logging middleware
app.use(morgan(process.env.LOG_FORMAT || 'combined', {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));

// API routes
app.use('/api/v1/trading', tradingRoutes);
app.use('/api/v1/bridge', bridgeRoutes);
app.use('/api/v1/swap', swapRoutes);
app.use('/api/v1/tokens', tokensRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Scryptex Backend API',
    version: process.env.API_VERSION || 'v1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    documentation: '/api/v1/docs',
    features: {
      trading: process.env.ENABLE_TRADING === 'true',
      bridge: process.env.ENABLE_BRIDGE === 'true',
      swap: process.env.ENABLE_SWAP === 'true',
      tokenCreation: process.env.ENABLE_TOKEN_CREATION === 'true',
      socialTrading: process.env.ENABLE_SOCIAL_TRADING === 'true',
      analytics: process.env.ENABLE_ANALYTICS === 'true',
      realTimeUpdates: process.env.WS_REAL_TIME_UPDATES === 'true'
    },
    chains: {
      risechain: {
        chainId: process.env.RISE_CHAIN_ID,
        rpcUrl: process.env.RISE_RPC_URL,
        explorerUrl: process.env.RISE_EXPLORER_URL
      },
      megaeth: {
        chainId: process.env.MEGA_CHAIN_ID,
        rpcUrl: process.env.MEGA_RPC_URL,
        explorerUrl: process.env.MEGA_EXPLORER_URL
      }
    }
  });
});

// API documentation endpoint
app.get('/api/v1/docs', (req, res) => {
  res.json({
    title: 'Scryptex API Documentation',
    version: process.env.API_VERSION || 'v1.0.0',
    endpoints: {
      health: 'GET /api/v1/health',
      trading: {
        tokens: 'GET /api/v1/trading/tokens',
        trending: 'GET /api/v1/trading/trending',
        buy: 'POST /api/v1/trading/buy',
        sell: 'POST /api/v1/trading/sell',
        history: 'GET /api/v1/trading/history',
        portfolio: 'GET /api/v1/trading/portfolio'
      },
      bridge: {
        initiate: 'POST /api/v1/bridge/initiate',
        status: 'GET /api/v1/bridge/status/:transactionId',
        history: 'GET /api/v1/bridge/history',
        fees: 'GET /api/v1/bridge/fees',
        supported: 'GET /api/v1/bridge/supported'
      },
      swap: {
        quote: 'GET /api/v1/swap/quote',
        execute: 'POST /api/v1/swap/execute',
        tokens: 'GET /api/v1/swap/tokens/:chain',
        history: 'GET /api/v1/swap/history'
      },
      tokens: {
        create: 'POST /api/v1/tokens/create',
        list: 'GET /api/v1/tokens',
        details: 'GET /api/v1/tokens/:chain/:address',
        trending: 'GET /api/v1/tokens/trending/:chain',
        new: 'GET /api/v1/tokens/new/:chain'
      },
      analytics: {
        overview: 'GET /api/v1/analytics/overview',
        token: 'GET /api/v1/analytics/token/:chain/:address',
        user: 'GET /api/v1/analytics/user',
        market: 'GET /api/v1/analytics/market/:chain',
        leaderboard: 'GET /api/v1/analytics/leaderboard'
      },
      users: {
        profile: 'GET /api/v1/users/profile/:address',
        updateProfile: 'PUT /api/v1/users/profile',
        stats: 'GET /api/v1/users/stats/:address',
        portfolio: 'GET /api/v1/users/portfolio/:address'
      }
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`,
    availableRoutes: [
      '/api/v1/health',
      '/api/v1/trading',
      '/api/v1/bridge',
      '/api/v1/swap',
      '/api/v1/tokens',
      '/api/v1/analytics',
      '/api/v1/users'
    ]
  });
});

// Initialize database connections and contracts
async function startServer() {
  try {
    logger.info('Starting Scryptex Backend Server...');
    
    // Connect to databases
    logger.info('Connecting to MongoDB...');
    await connectDB();
    
    logger.info('Connecting to Redis...');
    await connectRedis();
    
    // Initialize blockchain contracts
    logger.info('Initializing blockchain contracts...');
    await initializeContracts();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Scryptex Backend Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`🌐 CORS Origin: ${process.env.CORS_ORIGIN}`);
      logger.info(`🔗 RiseChain RPC: ${process.env.RISE_RPC_URL}`);
      logger.info(`🔗 MegaETH RPC: ${process.env.MEGA_RPC_URL}`);
      logger.info(`📈 Trading Engine: ${process.env.ENABLE_TRADING === 'true' ? 'ENABLED' : 'DISABLED'}`);
      logger.info(`🌉 Bridge System: ${process.env.ENABLE_BRIDGE === 'true' ? 'ENABLED' : 'DISABLED'}`);
      logger.info(`💱 Swap System: ${process.env.ENABLE_SWAP === 'true' ? 'ENABLED' : 'DISABLED'}`);
      logger.info(`🎯 Token Creation: ${process.env.ENABLE_TOKEN_CREATION === 'true' ? 'ENABLED' : 'DISABLED'}`);
    });

    // Setup WebSocket server
    logger.info('Setting up WebSocket server...');
    setupWebSocket(server);

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        try {
          await require('mongoose').connection.close();
          const { getRedisClient } = require('./config/redis');
          const redis = getRedisClient();
          if (redis) await redis.quit();
          logger.info('All connections closed. Process terminated');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;

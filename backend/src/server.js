
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const connectDB = require('./config/database');
const connectRedis = require('./config/redis');
const initializeContracts = require('./config/contracts');
const setupWebSocket = require('./websocket/server');
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
app.use(helmet());
app.use(mongoSanitize());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: process.env.MAX_REQUEST_SIZE || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_REQUEST_SIZE || '10mb' }));

// Logging middleware
app.use(morgan(process.env.LOG_FORMAT || 'combined'));

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
    version: process.env.API_VERSION || 'v1',
    status: 'active',
    timestamp: new Date().toISOString(),
    features: {
      trading: process.env.ENABLE_TRADING === 'true',
      bridge: process.env.ENABLE_BRIDGE === 'true',
      socialTrading: process.env.ENABLE_SOCIAL_TRADING === 'true'
    }
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`
  });
});

// Initialize database connections and contracts
async function startServer() {
  try {
    // Connect to databases
    await connectDB();
    await connectRedis();
    
    // Initialize blockchain contracts
    await initializeContracts();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Scryptex Backend Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`CORS Origin: ${process.env.CORS_ORIGIN}`);
    });

    // Setup WebSocket server
    setupWebSocket(server);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;

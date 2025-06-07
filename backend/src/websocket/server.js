
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

const setupWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: parseInt(process.env.WS_PING_INTERVAL) || 30000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.address;
      }
      next();
    } catch (err) {
      // Allow anonymous connections
      next();
    }
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    // Join user-specific room if authenticated
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      logger.info(`User ${socket.userId} joined personal room`);
    }

    // Join global feeds
    socket.on('join:trading-feed', () => {
      socket.join('trading-feed');
      logger.info(`Socket ${socket.id} joined trading feed`);
    });

    socket.on('join:token-feed', (tokenAddress) => {
      socket.join(`token:${tokenAddress}`);
      logger.info(`Socket ${socket.id} joined token feed: ${tokenAddress}`);
    });

    socket.on('leave:token-feed', (tokenAddress) => {
      socket.leave(`token:${tokenAddress}`);
      logger.info(`Socket ${socket.id} left token feed: ${tokenAddress}`);
    });

    // Price update subscriptions
    socket.on('subscribe:prices', (tokens) => {
      tokens.forEach(token => {
        socket.join(`price:${token}`);
      });
      logger.info(`Socket ${socket.id} subscribed to prices: ${tokens.join(', ')}`);
    });

    socket.on('unsubscribe:prices', (tokens) => {
      tokens.forEach(token => {
        socket.leave(`price:${token}`);
      });
      logger.info(`Socket ${socket.id} unsubscribed from prices: ${tokens.join(', ')}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
    });
  });

  logger.info('WebSocket server initialized');
  return io;
};

// Broadcasting functions
const broadcastTrade = (trade) => {
  if (io) {
    io.to('trading-feed').emit('trade:new', trade);
    io.to(`token:${trade.token}`).emit('trade:new', trade);
    logger.debug(`Broadcasted trade: ${trade._id}`);
  }
};

const broadcastPriceUpdate = (tokenAddress, priceData) => {
  if (io) {
    io.to(`price:${tokenAddress}`).emit('price:update', {
      token: tokenAddress,
      ...priceData
    });
    logger.debug(`Broadcasted price update for: ${tokenAddress}`);
  }
};

const broadcastTokenCreated = (token) => {
  if (io) {
    io.to('trading-feed').emit('token:created', token);
    logger.debug(`Broadcasted new token: ${token.address}`);
  }
};

const broadcastGraduation = (token) => {
  if (io) {
    io.emit('token:graduated', token);
    logger.debug(`Broadcasted graduation: ${token.address}`);
  }
};

const notifyUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
    logger.debug(`Notified user ${userId}: ${event}`);
  }
};

module.exports = {
  setupWebSocket,
  broadcastTrade,
  broadcastPriceUpdate,
  broadcastTokenCreated,
  broadcastGraduation,
  notifyUser
};

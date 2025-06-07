
const express = require('express');
const { getContractManager } = require('../config/contracts');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.API_VERSION || 'v1',
      uptime: process.uptime(),
      services: {}
    };

    // Check database connection
    health.services.mongodb = {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState
    };

    // Check Redis connection (if enabled)
    if (process.env.ENABLE_REDIS_CACHE === 'true') {
      try {
        const { getRedisClient } = require('../config/redis');
        const redis = getRedisClient();
        await redis.ping();
        health.services.redis = { status: 'connected' };
      } catch (error) {
        health.services.redis = { status: 'disconnected', error: error.message };
      }
    }

    // Check blockchain connections
    try {
      const contractManager = getContractManager();
      
      const riseBlock = await contractManager.getBlockNumber('risechain');
      health.services.risechain = { 
        status: 'connected', 
        blockNumber: riseBlock 
      };
    } catch (error) {
      health.services.risechain = { 
        status: 'disconnected', 
        error: error.message 
      };
    }

    try {
      const contractManager = getContractManager();
      const megaBlock = await contractManager.getBlockNumber('megaeth');
      health.services.megaeth = { 
        status: 'connected', 
        blockNumber: megaBlock 
      };
    } catch (error) {
      health.services.megaeth = { 
        status: 'disconnected', 
        error: error.message 
      };
    }

    // Determine overall status
    const allServicesHealthy = Object.values(health.services).every(
      service => service.status === 'connected'
    );
    
    if (!allServicesHealthy) {
      health.status = 'degraded';
    }

    res.json(health);

  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed system info (admin only)
router.get('/system', async (req, res) => {
  try {
    const systemInfo = {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      environment: process.env.NODE_ENV,
      features: {
        trading: process.env.ENABLE_TRADING === 'true',
        bridge: process.env.ENABLE_BRIDGE === 'true',
        socialTrading: process.env.ENABLE_SOCIAL_TRADING === 'true',
        analytics: process.env.ENABLE_ANALYTICS === 'true'
      }
    };

    res.json(systemInfo);

  } catch (error) {
    logger.error('System info failed:', error);
    res.status(500).json({
      error: 'Failed to get system info'
    });
  }
});

module.exports = router;

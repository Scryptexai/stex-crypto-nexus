
const express = require('express');
const AnalyticsService = require('../services/AnalyticsService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const analyticsService = new AnalyticsService();

// Get platform overview
router.get('/overview', async (req, res) => {
  try {
    const { chain, timeframe = '24h' } = req.query;
    
    const overview = await analyticsService.getPlatformOverview(chain, timeframe);

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    logger.error('Error fetching platform overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch platform overview'
    });
  }
});

// Get token analytics
router.get('/token/:chain/:address', async (req, res) => {
  try {
    const { chain, address } = req.params;
    const { timeframe = '24h' } = req.query;
    
    const analytics = await analyticsService.getTokenAnalytics(address, chain, timeframe);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching token analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch token analytics'
    });
  }
});

// Get user analytics
router.get('/user', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe = '24h' } = req.query;
    
    const analytics = await analyticsService.getUserAnalytics(userId, timeframe);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching user analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user analytics'
    });
  }
});

// Get market data
router.get('/market/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    
    const marketData = await analyticsService.getMarketData(chain);

    res.json({
      success: true,
      data: marketData
    });
  } catch (error) {
    logger.error('Error fetching market data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market data'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { type = 'volume', timeframe = '24h', limit = 50 } = req.query;
    
    const leaderboard = await analyticsService.getLeaderboard(type, timeframe, parseInt(limit));

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

module.exports = router;

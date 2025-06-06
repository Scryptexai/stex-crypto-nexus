
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { getContractManager } = require('../config/contracts');
const TradingService = require('../services/TradingService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const tradingService = new TradingService();

// Get all listed tokens
router.get('/tokens', async (req, res) => {
  try {
    const { chain = 'risechain', category, search, page = 1, limit = 20 } = req.query;
    
    const tokens = await tradingService.getListedTokens({
      chain,
      category,
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: tokens,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: tokens.length
      }
    });
  } catch (error) {
    logger.error('Error fetching tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tokens'
    });
  }
});

// Get trending tokens
router.get('/trending', async (req, res) => {
  try {
    const { chain = 'risechain', limit = 10 } = req.query;
    
    const trendingTokens = await tradingService.getTrendingTokens(chain, parseInt(limit));

    res.json({
      success: true,
      data: trendingTokens
    });
  } catch (error) {
    logger.error('Error fetching trending tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending tokens'
    });
  }
});

// Get token details
router.get('/tokens/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { chain = 'risechain' } = req.query;
    
    const tokenDetails = await tradingService.getTokenDetails(address, chain);

    res.json({
      success: true,
      data: tokenDetails
    });
  } catch (error) {
    logger.error('Error fetching token details:', error);
    res.status(500).json({
      success: false,
      error: 'Token not found'
    });
  }
});

// Execute buy order
router.post('/buy', [
  auth,
  body('tokenAddress').isEthereumAddress().withMessage('Invalid token address'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('maxSlippage').isNumeric().withMessage('Max slippage must be a number'),
  body('chain').isIn(['risechain', 'megaeth']).withMessage('Invalid chain')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { tokenAddress, amount, maxSlippage, chain, socialNote } = req.body;
    const userId = req.user.id;

    const result = await tradingService.executeBuyOrder({
      userId,
      tokenAddress,
      amount,
      maxSlippage,
      chain,
      socialNote
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error executing buy order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute buy order'
    });
  }
});

// Execute sell order
router.post('/sell', [
  auth,
  body('tokenAddress').isEthereumAddress().withMessage('Invalid token address'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('maxSlippage').isNumeric().withMessage('Max slippage must be a number'),
  body('chain').isIn(['risechain', 'megaeth']).withMessage('Invalid chain')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { tokenAddress, amount, maxSlippage, chain, socialNote } = req.body;
    const userId = req.user.id;

    const result = await tradingService.executeSellOrder({
      userId,
      tokenAddress,
      amount,
      maxSlippage,
      chain,
      socialNote
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error executing sell order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute sell order'
    });
  }
});

// Get user trading history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, chain } = req.query;
    const userId = req.user.id;

    const history = await tradingService.getUserTradingHistory({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      chain
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching trading history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading history'
    });
  }
});

// Get user portfolio
router.get('/portfolio', auth, async (req, res) => {
  try {
    const { chain } = req.query;
    const userId = req.user.id;

    const portfolio = await tradingService.getUserPortfolio(userId, chain);

    res.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    logger.error('Error fetching portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio'
    });
  }
});

// Get token price and bonding curve data
router.get('/tokens/:address/price', async (req, res) => {
  try {
    const { address } = req.params;
    const { chain = 'risechain' } = req.query;

    const priceData = await tradingService.getTokenPriceData(address, chain);

    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    logger.error('Error fetching price data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch price data'
    });
  }
});

// Get live trading feed
router.get('/feed', async (req, res) => {
  try {
    const { chain, limit = 50 } = req.query;

    const feed = await tradingService.getLiveTradingFeed(chain, parseInt(limit));

    res.json({
      success: true,
      data: feed
    });
  } catch (error) {
    logger.error('Error fetching trading feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading feed'
    });
  }
});

module.exports = router;

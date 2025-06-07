
const express = require('express');
const { body, validationResult } = require('express-validator');
const TokenService = require('../services/TokenService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const tokenService = new TokenService();

// Create new token
router.post('/create', [
  auth,
  body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('symbol').isLength({ min: 1, max: 10 }).withMessage('Symbol must be 1-10 characters'),
  body('description').isLength({ max: 1000 }).withMessage('Description max 1000 characters'),
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

    const { name, symbol, description, image, chain, socialLinks } = req.body;
    const userId = req.user.id;

    const result = await tokenService.createToken({
      userId,
      name,
      symbol,
      description,
      image,
      chain,
      socialLinks
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error creating token:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create token'
    });
  }
});

// Get all tokens
router.get('/', async (req, res) => {
  try {
    const { 
      chain, 
      category, 
      search, 
      sortBy = 'trendingScore',
      order = 'desc',
      page = 1, 
      limit = 20 
    } = req.query;

    const tokens = await tokenService.getTokens({
      chain,
      category,
      search,
      sortBy,
      order,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error('Error fetching tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tokens'
    });
  }
});

// Get token by address
router.get('/:chain/:address', async (req, res) => {
  try {
    const { chain, address } = req.params;
    
    const token = await tokenService.getTokenByAddress(address, chain);

    res.json({
      success: true,
      data: token
    });
  } catch (error) {
    logger.error('Error fetching token:', error);
    res.status(404).json({
      success: false,
      error: 'Token not found'
    });
  }
});

// Get trending tokens
router.get('/trending/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    const { limit = 10 } = req.query;
    
    const tokens = await tokenService.getTrendingTokens(chain, parseInt(limit));

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error('Error fetching trending tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending tokens'
    });
  }
});

// Get newly created tokens
router.get('/new/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    const { limit = 20 } = req.query;
    
    const tokens = await tokenService.getNewTokens(chain, parseInt(limit));

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error('Error fetching new tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch new tokens'
    });
  }
});

// Update token metadata
router.put('/:chain/:address', [
  auth,
  body('description').optional().isLength({ max: 1000 }),
  body('socialLinks').optional().isObject()
], async (req, res) => {
  try {
    const { chain, address } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    const result = await tokenService.updateToken(address, chain, userId, updates);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error updating token:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update token'
    });
  }
});

module.exports = router;

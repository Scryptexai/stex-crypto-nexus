
const express = require('express');
const { body, validationResult } = require('express-validator');
const SwapService = require('../services/SwapService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const swapService = new SwapService();

// Get swap quote
router.get('/quote', [
  body('tokenIn').isEthereumAddress().withMessage('Invalid token in address'),
  body('tokenOut').isEthereumAddress().withMessage('Invalid token out address'),
  body('amountIn').isNumeric().withMessage('Amount must be a number'),
  body('chain').isIn(['risechain', 'megaeth']).withMessage('Invalid chain')
], async (req, res) => {
  try {
    const { tokenIn, tokenOut, amountIn, chain } = req.query;

    const quote = await swapService.getSwapQuote({
      tokenIn,
      tokenOut,
      amountIn,
      chain
    });

    res.json({
      success: true,
      data: quote
    });
  } catch (error) {
    logger.error('Error getting swap quote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get swap quote'
    });
  }
});

// Execute swap
router.post('/execute', [
  auth,
  body('tokenIn.address').isEthereumAddress().withMessage('Invalid token in address'),
  body('tokenOut.address').isEthereumAddress().withMessage('Invalid token out address'),
  body('amountIn').isNumeric().withMessage('Amount must be a number'),
  body('slippage').isNumeric().withMessage('Slippage must be a number'),
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

    const { tokenIn, tokenOut, amountIn, slippage, chain } = req.body;
    const userId = req.user.id;

    const result = await swapService.executeSwap({
      userId,
      tokenIn,
      tokenOut,
      amountIn,
      slippage,
      chain
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error executing swap:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute swap'
    });
  }
});

// Get supported tokens
router.get('/tokens/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    
    const tokens = await swapService.getSupportedTokens(chain);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    logger.error('Error fetching supported tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supported tokens'
    });
  }
});

// Get user swap history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, chain } = req.query;
    const userId = req.user.id;

    const history = await swapService.getUserSwapHistory({
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
    logger.error('Error fetching swap history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch swap history'
    });
  }
});

module.exports = router;

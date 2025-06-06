
const express = require('express');
const { body, validationResult } = require('express-validator');
const BridgeService = require('../services/BridgeService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const bridgeService = new BridgeService();

// Initiate bridge transaction
router.post('/initiate', [
  auth,
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('sourceChain').isIn(['risechain', 'megaeth', 'sepolia']).withMessage('Invalid source chain'),
  body('destinationChain').isIn(['risechain', 'megaeth', 'sepolia']).withMessage('Invalid destination chain'),
  body('destinationAddress').isEthereumAddress().withMessage('Invalid destination address'),
  body('tokenAddress').optional().isEthereumAddress().withMessage('Invalid token address')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      amount,
      sourceChain,
      destinationChain,
      destinationAddress,
      tokenAddress
    } = req.body;
    const userId = req.user.id;

    const result = await bridgeService.initiateBridge({
      userId,
      amount,
      sourceChain,
      destinationChain,
      destinationAddress,
      tokenAddress
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error initiating bridge:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate bridge'
    });
  }
});

// Get bridge transaction status
router.get('/status/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;

    const status = await bridgeService.getBridgeStatus(transactionId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error fetching bridge status:', error);
    res.status(500).json({
      success: false,
      error: 'Transaction not found'
    });
  }
});

// Get user bridge history
router.get('/history', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const userId = req.user.id;

    const history = await bridgeService.getUserBridgeHistory({
      userId,
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching bridge history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bridge history'
    });
  }
});

// Get bridge fees
router.get('/fees', async (req, res) => {
  try {
    const { sourceChain, destinationChain, amount, tokenAddress } = req.query;

    const fees = await bridgeService.calculateBridgeFees({
      sourceChain,
      destinationChain,
      amount,
      tokenAddress
    });

    res.json({
      success: true,
      data: fees
    });
  } catch (error) {
    logger.error('Error calculating bridge fees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate fees'
    });
  }
});

// Get supported chains and tokens
router.get('/supported', async (req, res) => {
  try {
    const supported = await bridgeService.getSupportedChainsAndTokens();

    res.json({
      success: true,
      data: supported
    });
  } catch (error) {
    logger.error('Error fetching supported chains:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch supported chains'
    });
  }
});

// Validate bridge transaction (for validators)
router.post('/validate', [
  auth,
  body('transactionId').notEmpty().withMessage('Transaction ID is required'),
  body('isValid').isBoolean().withMessage('Validation result must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { transactionId, isValid } = req.body;
    const validatorAddress = req.user.address;

    const result = await bridgeService.validateTransaction({
      transactionId,
      validatorAddress,
      isValid
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error validating transaction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to validate transaction'
    });
  }
});

module.exports = router;

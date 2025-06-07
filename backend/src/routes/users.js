
const express = require('express');
const { body, validationResult } = require('express-validator');
const UserService = require('../services/UserService');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const userService = new UserService();

// Get user profile
router.get('/profile/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const profile = await userService.getUserProfile(address);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
});

// Update user profile
router.put('/profile', [
  auth,
  body('username').optional().isLength({ min: 3, max: 32 }),
  body('bio').optional().isLength({ max: 200 }),
  body('avatar').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const updates = req.body;

    const profile = await userService.updateUserProfile(userId, updates);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update profile'
    });
  }
});

// Get user stats
router.get('/stats/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const stats = await userService.getUserStats(address);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats'
    });
  }
});

// Get user portfolio
router.get('/portfolio/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const { chain } = req.query;
    
    const portfolio = await userService.getUserPortfolio(address, chain);

    res.json({
      success: true,
      data: portfolio
    });
  } catch (error) {
    logger.error('Error fetching user portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio'
    });
  }
});

module.exports = router;

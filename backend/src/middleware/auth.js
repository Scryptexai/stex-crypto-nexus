
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by address
    let user = await UserModel.findOne({ address: decoded.address });
    
    if (!user) {
      // Create user if doesn't exist
      user = new UserModel({ 
        address: decoded.address,
        lastActiveAt: new Date()
      });
      await user.save();
    } else {
      // Update last active
      user.lastActiveAt = new Date();
      await user.save();
    }

    req.user = {
      id: user._id,
      address: user.address,
      username: user.username
    };
    
    next();
    
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

module.exports = auth;

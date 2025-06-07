
const UserModel = require('../models/User');
const TokenModel = require('../models/Token');
const TradeModel = require('../models/Trade');
const BridgeModel = require('../models/Bridge');
const SwapModel = require('../models/Swap');
const logger = require('../utils/logger');

class UserService {
  async getUserProfile(address) {
    try {
      let user = await UserModel.findOne({ address });
      
      if (!user) {
        // Create new user if doesn't exist
        user = new UserModel({ address });
        await user.save();
      }

      return user;

    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      const allowedUpdates = ['username', 'bio', 'avatar', 'preferences'];
      const updateData = {};
      
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      });

      const user = await UserModel.findByIdAndUpdate(
        userId,
        { ...updateData, lastActiveAt: new Date() },
        { new: true }
      );

      return user;

    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getUserStats(address) {
    try {
      const user = await UserModel.findOne({ address });
      if (!user) {
        throw new Error('User not found');
      }

      const [
        totalTrades,
        totalVolume,
        tokensCreated,
        bridgeCount,
        swapCount
      ] = await Promise.all([
        TradeModel.countDocuments({ user: user._id }),
        this._calculateTotalVolume(user._id),
        TokenModel.countDocuments({ creator: user._id }),
        BridgeModel.countDocuments({ user: user._id }),
        SwapModel.countDocuments({ user: user._id })
      ]);

      return {
        address: user.address,
        username: user.username,
        reputation: user.reputation,
        joinedAt: user.joinedAt,
        totalTrades,
        totalVolume,
        tokensCreated,
        bridgeCount,
        swapCount,
        stats: user.stats
      };

    } catch (error) {
      logger.error('Error getting user stats:', error);
      throw error;
    }
  }

  async getUserPortfolio(address, chain) {
    try {
      const user = await UserModel.findOne({ address });
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's token holdings (this would be calculated from trades)
      const trades = await TradeModel.find({ 
        user: user._id,
        ...(chain && { chain })
      }).populate('token');

      // Calculate holdings by aggregating trades
      const holdings = this._calculateHoldings(trades);

      return {
        address: user.address,
        totalValue: user.stats.portfolioValue,
        holdings
      };

    } catch (error) {
      logger.error('Error getting user portfolio:', error);
      throw error;
    }
  }

  async _calculateTotalVolume(userId) {
    const pipeline = [
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: { $toDouble: "$totalValue" } } } }
    ];
    
    const result = await TradeModel.aggregate(pipeline);
    return result[0]?.total || 0;
  }

  _calculateHoldings(trades) {
    const holdings = {};
    
    trades.forEach(trade => {
      const tokenAddress = trade.token;
      if (!holdings[tokenAddress]) {
        holdings[tokenAddress] = {
          address: tokenAddress,
          amount: '0',
          value: '0'
        };
      }
      
      // This is simplified - in production you'd track actual balances
      if (trade.type === 'buy') {
        holdings[tokenAddress].amount = (
          parseFloat(holdings[tokenAddress].amount) + parseFloat(trade.amount)
        ).toString();
      } else {
        holdings[tokenAddress].amount = (
          parseFloat(holdings[tokenAddress].amount) - parseFloat(trade.amount)
        ).toString();
      }
    });

    return Object.values(holdings).filter(holding => 
      parseFloat(holding.amount) > 0
    );
  }
}

module.exports = UserService;

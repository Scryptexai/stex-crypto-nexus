
const TokenModel = require('../models/Token');
const TradeModel = require('../models/Trade');
const UserModel = require('../models/User');
const BridgeModel = require('../models/Bridge');
const SwapModel = require('../models/Swap');
const logger = require('../utils/logger');

class AnalyticsService {
  async getPlatformOverview(chain, timeframe) {
    try {
      const timeFilter = this._getTimeFilter(timeframe);
      
      const [
        totalTokens,
        activeTokens,
        graduatedTokens,
        totalVolume,
        totalTrades,
        activeUsers
      ] = await Promise.all([
        TokenModel.countDocuments(chain ? { chain } : {}),
        TokenModel.countDocuments({ 
          ...(chain && { chain }), 
          isActive: true, 
          isGraduated: false 
        }),
        TokenModel.countDocuments({ 
          ...(chain && { chain }), 
          isGraduated: true 
        }),
        this._getTotalVolume(chain, timeFilter),
        this._getTotalTrades(chain, timeFilter),
        this._getActiveUsers(chain, timeFilter)
      ]);

      return {
        totalTokens,
        activeTokens,
        graduatedTokens,
        totalVolume,
        totalTrades,
        activeUsers,
        timeframe
      };

    } catch (error) {
      logger.error('Error getting platform overview:', error);
      throw error;
    }
  }

  async getTokenAnalytics(address, chain, timeframe) {
    try {
      const token = await TokenModel.findOne({ address, chain });
      if (!token) {
        throw new Error('Token not found');
      }

      const timeFilter = this._getTimeFilter(timeframe);
      
      const [
        trades,
        volume,
        uniqueTraders,
        priceHistory
      ] = await Promise.all([
        this._getTokenTrades(address, timeFilter),
        this._getTokenVolume(address, timeFilter),
        this._getUniqueTraders(address, timeFilter),
        this._getPriceHistory(address, timeframe)
      ]);

      return {
        token: {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          currentPrice: token.currentPrice,
          marketCap: token.marketCap
        },
        trades,
        volume,
        uniqueTraders,
        priceHistory,
        timeframe
      };

    } catch (error) {
      logger.error('Error getting token analytics:', error);
      throw error;
    }
  }

  async getUserAnalytics(userId, timeframe) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const timeFilter = this._getTimeFilter(timeframe);
      
      const [
        totalTrades,
        totalVolume,
        totalProfit,
        tokensCreated,
        bridgeTransactions,
        swapTransactions
      ] = await Promise.all([
        TradeModel.countDocuments({ user: userId, ...timeFilter }),
        this._getUserVolume(userId, timeFilter),
        this._getUserProfit(userId, timeFilter),
        TokenModel.countDocuments({ creator: userId, ...timeFilter }),
        BridgeModel.countDocuments({ user: userId, ...timeFilter }),
        SwapModel.countDocuments({ user: userId, ...timeFilter })
      ]);

      return {
        user: {
          address: user.address,
          username: user.username,
          reputation: user.reputation
        },
        totalTrades,
        totalVolume,
        totalProfit,
        tokensCreated,
        bridgeTransactions,
        swapTransactions,
        timeframe
      };

    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw error;
    }
  }

  async getMarketData(chain) {
    try {
      const tokens = await TokenModel.find({ 
        chain, 
        isActive: true 
      })
        .sort({ volume24h: -1 })
        .limit(100)
        .select('address name symbol currentPrice marketCap volume24h priceChange24h');

      return {
        tokens,
        totalMarketCap: tokens.reduce((sum, token) => 
          sum + parseFloat(token.marketCap || 0), 0
        ),
        total24hVolume: tokens.reduce((sum, token) => 
          sum + parseFloat(token.volume24h || 0), 0
        )
      };

    } catch (error) {
      logger.error('Error getting market data:', error);
      throw error;
    }
  }

  async getLeaderboard(type, timeframe, limit) {
    try {
      const timeFilter = this._getTimeFilter(timeframe);
      
      let leaderboard = [];
      
      switch (type) {
        case 'volume':
          leaderboard = await this._getVolumeLeaderboard(timeFilter, limit);
          break;
        case 'profit':
          leaderboard = await this._getProfitLeaderboard(timeFilter, limit);
          break;
        case 'creators':
          leaderboard = await this._getCreatorsLeaderboard(timeFilter, limit);
          break;
        default:
          throw new Error('Invalid leaderboard type');
      }

      return {
        type,
        timeframe,
        leaderboard
      };

    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  _getTimeFilter(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '1h':
        return { timestamp: { $gte: new Date(now - 60 * 60 * 1000) } };
      case '24h':
        return { timestamp: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
      case '7d':
        return { timestamp: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
      case '30d':
        return { timestamp: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
      default:
        return { timestamp: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
    }
  }

  async _getTotalVolume(chain, timeFilter) {
    const pipeline = [
      { $match: { ...(chain && { chain }), ...timeFilter } },
      { $group: { _id: null, total: { $sum: { $toDouble: "$totalValue" } } } }
    ];
    
    const result = await TradeModel.aggregate(pipeline);
    return result[0]?.total || 0;
  }

  async _getTotalTrades(chain, timeFilter) {
    return await TradeModel.countDocuments({ 
      ...(chain && { chain }), 
      ...timeFilter 
    });
  }

  async _getActiveUsers(chain, timeFilter) {
    const pipeline = [
      { $match: { ...(chain && { chain }), ...timeFilter } },
      { $group: { _id: "$user" } },
      { $count: "activeUsers" }
    ];
    
    const result = await TradeModel.aggregate(pipeline);
    return result[0]?.activeUsers || 0;
  }
}

module.exports = AnalyticsService;


const { ethers } = require('ethers');
const { getContractManager } = require('../config/contracts');
const { getRedisClient } = require('../config/redis');
const TokenModel = require('../models/Token');
const TradeModel = require('../models/Trade');
const UserModel = require('../models/User');
const logger = require('../utils/logger');

class TradingService {
  constructor() {
    this.contractManager = null;
    this.redis = null;
  }

  async initialize() {
    this.contractManager = getContractManager();
    this.redis = getRedisClient();
  }

  async getListedTokens({ chain, category, search, page, limit }) {
    try {
      let query = { chain, isActive: true };

      if (category) {
        query.category = category;
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { symbol: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const tokens = await TokenModel.find(query)
        .sort({ trendingScore: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('creator', 'address username reputation');

      // Enrich with real-time data
      const enrichedTokens = await Promise.all(
        tokens.map(async (token) => {
          const priceData = await this.getTokenPriceData(token.address, chain);
          return {
            ...token.toObject(),
            ...priceData
          };
        })
      );

      return enrichedTokens;
    } catch (error) {
      logger.error('Error in getListedTokens:', error);
      throw error;
    }
  }

  async getTrendingTokens(chain, limit) {
    try {
      const cacheKey = `trending:${chain}:${limit}`;
      const cached = await this.redis?.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      const tokens = await TokenModel.find({ 
        chain, 
        isActive: true,
        isGraduated: false
      })
        .sort({ trendingScore: -1 })
        .limit(limit)
        .populate('creator', 'address username reputation');

      const enrichedTokens = await Promise.all(
        tokens.map(async (token) => {
          const priceData = await this.getTokenPriceData(token.address, chain);
          const metrics = await this.getTokenMetrics(token.address, chain);
          return {
            ...token.toObject(),
            ...priceData,
            ...metrics
          };
        })
      );

      // Cache for 5 minutes
      await this.redis?.setex(cacheKey, 300, JSON.stringify(enrichedTokens));

      return enrichedTokens;
    } catch (error) {
      logger.error('Error in getTrendingTokens:', error);
      throw error;
    }
  }

  async getTokenDetails(address, chain) {
    try {
      const token = await TokenModel.findOne({ address, chain })
        .populate('creator', 'address username reputation avatar');

      if (!token) {
        throw new Error('Token not found');
      }

      const [priceData, metrics, bondingCurve, trades] = await Promise.all([
        this.getTokenPriceData(address, chain),
        this.getTokenMetrics(address, chain),
        this.getBondingCurveData(address, chain),
        this.getRecentTrades(address, chain, 20)
      ]);

      return {
        ...token.toObject(),
        priceData,
        metrics,
        bondingCurve,
        recentTrades: trades
      };
    } catch (error) {
      logger.error('Error in getTokenDetails:', error);
      throw error;
    }
  }

  async executeBuyOrder({ userId, tokenAddress, amount, maxSlippage, chain, socialNote }) {
    try {
      if (!this.contractManager) {
        await this.initialize();
      }

      const tradingEngine = this.contractManager.getContract(chain, 'tradingEngine');
      
      // Validate token exists and is tradeable
      const token = await TokenModel.findOne({ 
        address: tokenAddress, 
        chain, 
        isActive: true,
        isGraduated: false
      });

      if (!token) {
        throw new Error('Token not found or not tradeable');
      }

      // Calculate expected tokens and price impact
      const priceData = await this.getTokenPriceData(tokenAddress, chain);
      const expectedTokens = this.calculateBuyAmount(amount, priceData);
      const priceImpact = this.calculatePriceImpact(amount, priceData);

      if (priceImpact > maxSlippage) {
        throw new Error(`Price impact (${priceImpact}%) exceeds max slippage (${maxSlippage}%)`);
      }

      // Create trade record
      const trade = new TradeModel({
        user: userId,
        token: tokenAddress,
        chain,
        type: 'buy',
        amount,
        expectedTokens,
        maxSlippage,
        priceImpact,
        socialNote,
        status: 'pending',
        timestamp: new Date()
      });

      await trade.save();

      // Return trade info for frontend to execute transaction
      return {
        tradeId: trade._id,
        contractAddress: tradingEngine.target,
        expectedTokens,
        priceImpact,
        fees: this.calculateTradingFees(amount),
        gasEstimate: await this.estimateGas(chain, 'buyTokens', [tokenAddress, maxSlippage * 100])
      };

    } catch (error) {
      logger.error('Error in executeBuyOrder:', error);
      throw error;
    }
  }

  async executeSellOrder({ userId, tokenAddress, amount, maxSlippage, chain, socialNote }) {
    try {
      if (!this.contractManager) {
        await this.initialize();
      }

      const tradingEngine = this.contractManager.getContract(chain, 'tradingEngine');
      
      // Validate token and user balance
      const token = await TokenModel.findOne({ 
        address: tokenAddress, 
        chain, 
        isActive: true 
      });

      if (!token) {
        throw new Error('Token not found');
      }

      // Calculate expected ETH and price impact
      const priceData = await this.getTokenPriceData(tokenAddress, chain);
      const expectedETH = this.calculateSellAmount(amount, priceData);
      const priceImpact = this.calculatePriceImpact(amount, priceData, false);

      if (priceImpact > maxSlippage) {
        throw new Error(`Price impact (${priceImpact}%) exceeds max slippage (${maxSlippage}%)`);
      }

      // Create trade record
      const trade = new TradeModel({
        user: userId,
        token: tokenAddress,
        chain,
        type: 'sell',
        amount,
        expectedETH,
        maxSlippage,
        priceImpact,
        socialNote,
        status: 'pending',
        timestamp: new Date()
      });

      await trade.save();

      return {
        tradeId: trade._id,
        contractAddress: tradingEngine.target,
        expectedETH,
        priceImpact,
        fees: this.calculateTradingFees(expectedETH),
        gasEstimate: await this.estimateGas(chain, 'sellTokens', [tokenAddress, amount, maxSlippage * 100])
      };

    } catch (error) {
      logger.error('Error in executeSellOrder:', error);
      throw error;
    }
  }

  async getTokenPriceData(address, chain) {
    try {
      const bondingCurveIntegrator = this.contractManager.getContract(chain, 'bondingCurveIntegrator');
      
      // Get bonding curve data
      const curveData = await bondingCurveIntegrator.getBondingCurve(address);
      
      return {
        currentPrice: ethers.formatEther(curveData.currentPrice),
        marketCap: ethers.formatEther(curveData.marketCap),
        virtualReserves: {
          token: ethers.formatEther(curveData.virtualTokenReserves),
          eth: ethers.formatEther(curveData.virtualSolReserves)
        },
        realReserves: {
          token: ethers.formatEther(curveData.realTokenReserves),
          eth: ethers.formatEther(curveData.realSolReserves)
        },
        isGraduated: curveData.isGraduated,
        graduationProgress: (parseFloat(ethers.formatEther(curveData.marketCap)) / 69000) * 100
      };
    } catch (error) {
      logger.error('Error getting token price data:', error);
      throw error;
    }
  }

  calculateBuyAmount(ethAmount, priceData) {
    // Implement bonding curve calculation
    // This is a simplified version - use actual bonding curve formula
    const price = parseFloat(priceData.currentPrice);
    return ethAmount / price;
  }

  calculateSellAmount(tokenAmount, priceData) {
    // Implement bonding curve calculation for selling
    const price = parseFloat(priceData.currentPrice);
    return tokenAmount * price * 0.99; // Account for slippage
  }

  calculatePriceImpact(amount, priceData, isBuy = true) {
    // Simplified price impact calculation
    const currentPrice = parseFloat(priceData.currentPrice);
    const virtualReserves = parseFloat(priceData.virtualReserves.eth);
    
    const impact = (amount / virtualReserves) * 100;
    return Math.min(impact, 15); // Cap at 15%
  }

  calculateTradingFees(amount) {
    const feePercentage = 0.01; // 1%
    return amount * feePercentage;
  }

  async estimateGas(chain, method, params) {
    try {
      const tradingEngine = this.contractManager.getContract(chain, 'tradingEngine');
      const gasEstimate = await tradingEngine[method].estimateGas(...params);
      return gasEstimate.toString();
    } catch (error) {
      logger.error('Error estimating gas:', error);
      return '500000'; // Default fallback
    }
  }
}

module.exports = TradingService;

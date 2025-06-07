
const { ethers } = require('ethers');
const { getContractManager } = require('../config/contracts');
const TokenModel = require('../models/Token');
const UserModel = require('../models/User');
const logger = require('../utils/logger');

class TokenService {
  constructor() {
    this.contractManager = null;
  }

  async initialize() {
    this.contractManager = getContractManager();
  }

  async createToken({ userId, name, symbol, description, image, chain, socialLinks }) {
    try {
      if (!this.contractManager) {
        await this.initialize();
      }

      // Check for duplicate name/symbol
      const existing = await TokenModel.findOne({
        $or: [
          { name, chain },
          { symbol, chain }
        ]
      });

      if (existing) {
        throw new Error('Token with this name or symbol already exists on this chain');
      }

      const tokenFactory = this.contractManager.getContract(chain, 'tokenFactory');
      
      // Create token record (will be updated with actual address after deployment)
      const token = new TokenModel({
        address: '0x0000000000000000000000000000000000000000', // Placeholder
        name,
        symbol,
        description,
        image,
        creator: userId,
        chain,
        bondingCurve: '0x0000000000000000000000000000000000000000', // Will be set after deployment
        socialLinks: socialLinks || {}
      });

      await token.save();

      // Return deployment info for frontend
      return {
        tokenId: token._id,
        contractAddress: tokenFactory.target,
        creationFee: ethers.parseEther('0.02').toString(), // 0.02 ETH
        gasEstimate: '2000000'
      };

    } catch (error) {
      logger.error('Error creating token:', error);
      throw error;
    }
  }

  async getTokens({ chain, category, search, sortBy, order, page, limit }) {
    try {
      let query = { isActive: true };
      
      if (chain) query.chain = chain;
      if (category) query.category = category;
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { symbol: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const sort = {};
      sort[sortBy] = order === 'asc' ? 1 : -1;

      const tokens = await TokenModel.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('creator', 'address username reputation');

      const total = await TokenModel.countDocuments(query);

      return {
        tokens,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error getting tokens:', error);
      throw error;
    }
  }

  async getTokenByAddress(address, chain) {
    try {
      const token = await TokenModel.findOne({ address, chain })
        .populate('creator', 'address username reputation avatar');

      if (!token) {
        throw new Error('Token not found');
      }

      return token;

    } catch (error) {
      logger.error('Error getting token by address:', error);
      throw error;
    }
  }

  async getTrendingTokens(chain, limit) {
    try {
      const tokens = await TokenModel.find({ 
        chain, 
        isActive: true,
        isGraduated: false
      })
        .sort({ trendingScore: -1 })
        .limit(limit)
        .populate('creator', 'address username reputation');

      return tokens;

    } catch (error) {
      logger.error('Error getting trending tokens:', error);
      throw error;
    }
  }

  async getNewTokens(chain, limit) {
    try {
      const tokens = await TokenModel.find({ 
        chain, 
        isActive: true 
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('creator', 'address username reputation');

      return tokens;

    } catch (error) {
      logger.error('Error getting new tokens:', error);
      throw error;
    }
  }

  async updateToken(address, chain, userId, updates) {
    try {
      const token = await TokenModel.findOne({ address, chain });
      
      if (!token) {
        throw new Error('Token not found');
      }

      // Check if user is the creator
      if (token.creator.toString() !== userId) {
        throw new Error('Only the creator can update this token');
      }

      const allowedUpdates = ['description', 'socialLinks'];
      const updateData = {};
      
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      });

      const updatedToken = await TokenModel.findByIdAndUpdate(
        token._id,
        updateData,
        { new: true }
      ).populate('creator', 'address username reputation');

      return updatedToken;

    } catch (error) {
      logger.error('Error updating token:', error);
      throw error;
    }
  }
}

module.exports = TokenService;

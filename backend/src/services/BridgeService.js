
const { ethers } = require('ethers');
const { getContractManager } = require('../config/contracts');
const BridgeModel = require('../models/Bridge');
const UserModel = require('../models/User');
const logger = require('../utils/logger');

class BridgeService {
  constructor() {
    this.contractManager = null;
  }

  async initialize() {
    this.contractManager = getContractManager();
  }

  async initiateBridge({ userId, amount, sourceChain, destinationChain, destinationAddress, tokenAddress }) {
    try {
      if (!this.contractManager) {
        await this.initialize();
      }

      // Validate bridge request
      await this._validateBridgeRequest(amount, sourceChain, destinationChain);

      // Calculate fees
      const fee = await this.calculateBridgeFees({
        sourceChain,
        destinationChain,
        amount,
        tokenAddress
      });

      // Create bridge record
      const bridge = new BridgeModel({
        user: userId,
        sourceChain,
        destinationChain,
        sourceAddress: destinationAddress, // Will be updated with actual tx
        destinationAddress,
        tokenAddress,
        amount,
        fee: fee.totalFee,
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        pointsEarned: 20
      });

      await bridge.save();

      return {
        bridgeId: bridge._id,
        estimatedFee: fee,
        estimatedTime: '7 days',
        contractAddress: this.contractManager.getContract(sourceChain, 'bridgeCore').target
      };

    } catch (error) {
      logger.error('Error initiating bridge:', error);
      throw error;
    }
  }

  async getBridgeStatus(transactionId) {
    try {
      const bridge = await BridgeModel.findById(transactionId).populate('user', 'address username');
      
      if (!bridge) {
        throw new Error('Bridge transaction not found');
      }

      return {
        id: bridge._id,
        status: bridge.status,
        sourceChain: bridge.sourceChain,
        destinationChain: bridge.destinationChain,
        amount: bridge.amount,
        fee: bridge.fee,
        sourceTxHash: bridge.sourceTxHash,
        destinationTxHash: bridge.destinationTxHash,
        estimatedCompletion: bridge.estimatedCompletion,
        validatorSignatures: bridge.validatorSignatures.length,
        requiredSignatures: 5, // From env
        pointsEarned: bridge.pointsEarned,
        createdAt: bridge.createdAt
      };

    } catch (error) {
      logger.error('Error getting bridge status:', error);
      throw error;
    }
  }

  async getUserBridgeHistory({ userId, page, limit, status }) {
    try {
      let query = { user: userId };
      if (status) {
        query.status = status;
      }

      const bridges = await BridgeModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await BridgeModel.countDocuments(query);

      return {
        bridges,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error getting bridge history:', error);
      throw error;
    }
  }

  async calculateBridgeFees({ sourceChain, destinationChain, amount, tokenAddress }) {
    try {
      const baseAmount = parseFloat(ethers.formatEther(amount));
      const baseFeePercentage = 0.003; // 0.3%
      const baseFee = baseAmount * baseFeePercentage;
      
      // Gas estimation
      const gasEstimate = 150000; // Estimated gas
      const gasPrice = 1000000000; // 1 gwei
      const gasFee = parseFloat(ethers.formatEther((gasEstimate * gasPrice).toString()));
      
      const totalFee = baseFee + gasFee;

      return {
        baseFee: baseFee.toString(),
        gasFee: gasFee.toString(),
        totalFee: totalFee.toString(),
        feePercentage: baseFeePercentage * 100
      };

    } catch (error) {
      logger.error('Error calculating bridge fees:', error);
      throw error;
    }
  }

  async getSupportedChainsAndTokens() {
    return {
      chains: [
        {
          id: 'risechain',
          name: 'RiseChain Testnet',
          chainId: 11155931,
          rpcUrl: process.env.RISE_RPC_URL,
          explorerUrl: process.env.RISE_EXPLORER_URL
        },
        {
          id: 'megaeth',
          name: 'MegaETH Testnet',
          chainId: 6342,
          rpcUrl: process.env.MEGA_RPC_URL,
          explorerUrl: process.env.MEGA_EXPLORER_URL
        },
        {
          id: 'sepolia',
          name: 'Sepolia Testnet',
          chainId: 11155111,
          rpcUrl: process.env.SEPOLIA_RPC_URL,
          explorerUrl: process.env.SEPOLIA_EXPLORER_URL
        }
      ],
      supportedTokens: [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          address: null, // Native token
          decimals: 18
        }
      ]
    };
  }

  async _validateBridgeRequest(amount, sourceChain, destinationChain) {
    const minAmount = ethers.parseEther(process.env.BRIDGE_MIN_AMOUNT || '0.01');
    const maxAmount = ethers.parseEther(process.env.BRIDGE_MAX_AMOUNT || '1000');
    
    if (ethers.getBigInt(amount) < minAmount) {
      throw new Error(`Minimum bridge amount is ${ethers.formatEther(minAmount)} ETH`);
    }
    
    if (ethers.getBigInt(amount) > maxAmount) {
      throw new Error(`Maximum bridge amount is ${ethers.formatEther(maxAmount)} ETH`);
    }
    
    if (sourceChain === destinationChain) {
      throw new Error('Source and destination chains cannot be the same');
    }
  }
}

module.exports = BridgeService;

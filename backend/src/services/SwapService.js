
const { ethers } = require('ethers');
const { getContractManager } = require('../config/contracts');
const SwapModel = require('../models/Swap');
const UserModel = require('../models/User');
const logger = require('../utils/logger');

class SwapService {
  constructor() {
    this.contractManager = null;
  }

  async initialize() {
    this.contractManager = getContractManager();
  }

  async executeSwap({ userId, tokenIn, tokenOut, amountIn, slippage, chain }) {
    try {
      if (!this.contractManager) {
        await this.initialize();
      }

      const swapRouter = this.contractManager.getContract(chain, 'swapRouter');
      
      // Calculate expected output
      const quote = await this.getSwapQuote({
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn,
        chain
      });

      // Calculate fees
      const fee = this.calculateSwapFee(amountIn);
      
      // Create swap record
      const swap = new SwapModel({
        user: userId,
        chain,
        tokenIn: {
          address: tokenIn.address,
          symbol: tokenIn.symbol,
          amount: amountIn
        },
        tokenOut: {
          address: tokenOut.address,
          symbol: tokenOut.symbol,
          amount: quote.amountOut
        },
        route: quote.route,
        slippage,
        priceImpact: quote.priceImpact,
        fee,
        pointsEarned: 15
      });

      await swap.save();

      return {
        swapId: swap._id,
        contractAddress: swapRouter.target,
        quote,
        fee,
        gasEstimate: await this.estimateSwapGas(chain, tokenIn.address, tokenOut.address, amountIn)
      };

    } catch (error) {
      logger.error('Error executing swap:', error);
      throw error;
    }
  }

  async getSwapQuote({ tokenIn, tokenOut, amountIn, chain }) {
    try {
      // Simplified quote calculation
      // In production, this would use actual DEX pools
      const mockPrice = 1500; // ETH price in USD
      const amountOut = (parseFloat(ethers.formatEther(amountIn)) * mockPrice * 0.997).toString(); // 0.3% fee
      
      return {
        amountOut: ethers.parseEther(amountOut).toString(),
        priceImpact: 0.1, // 0.1%
        route: [{
          tokenIn,
          tokenOut,
          fee: 3000, // 0.3%
          pool: '0x...' // Mock pool address
        }],
        gasEstimate: '150000'
      };

    } catch (error) {
      logger.error('Error getting swap quote:', error);
      throw error;
    }
  }

  async getUserSwapHistory({ userId, page, limit, chain }) {
    try {
      let query = { user: userId };
      if (chain) {
        query.chain = chain;
      }

      const swaps = await SwapModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await SwapModel.countDocuments(query);

      return {
        swaps,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Error getting swap history:', error);
      throw error;
    }
  }

  calculateSwapFee(amountIn) {
    const feePercentage = 0.0025; // 0.25%
    const amount = parseFloat(ethers.formatEther(amountIn));
    return (amount * feePercentage).toString();
  }

  async estimateSwapGas(chain, tokenIn, tokenOut, amountIn) {
    try {
      // Simplified gas estimation
      return '150000';
    } catch (error) {
      logger.error('Error estimating swap gas:', error);
      return '200000'; // Fallback
    }
  }

  async getSupportedTokens(chain) {
    // Mock supported tokens
    return [
      {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
      },
      {
        address: '0xa0b86a33e6776e6a8b88f6a7e8e1a9f1b8c7d2e3',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI: 'https://tokens.1inch.io/0xa0b86a33e6776e6a8b88f6a7e8e1a9f1b8c7d2e3.png'
      }
    ];
  }
}

module.exports = SwapService;


const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Import contract ABIs
const RiseChainBridgeABI = require('../abis/RiseChainBridge.json');
const TokenFactoryABI = require('../abis/TokenFactory.json');
const TradingEngineABI = require('../abis/TradingEngine.json');
const SwapRouterABI = require('../abis/SwapRouter.json');

class ContractManager {
  constructor() {
    this.contracts = {
      risechain: {},
      megaeth: {},
      sepolia: {}
    };
    this.providers = {};
    this.wsProviders = {};
    this.initialized = false;
  }

  async initialize() {
    try {
      logger.info('Initializing Contract Manager...');
      
      await this.setupProviders();
      await this.initializeRiseChainContracts();
      await this.initializeMegaETHContracts();
      
      if (process.env.SEPOLIA_RPC_URL) {
        await this.initializeSepoliaContracts();
      }
      
      this.initialized = true;
      logger.info('All blockchain contracts initialized successfully');
      
      // Log contract addresses for verification
      this.logContractAddresses();
      
    } catch (error) {
      logger.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  async setupProviders() {
    try {
      // RiseChain providers
      this.providers.risechain = new ethers.JsonRpcProvider(
        process.env.RISE_RPC_URL,
        {
          chainId: parseInt(process.env.RISE_CHAIN_ID),
          name: 'risechain'
        }
      );
      
      if (process.env.RISE_WS_URL) {
        this.wsProviders.risechain = new ethers.WebSocketProvider(process.env.RISE_WS_URL);
      }

      // MegaETH providers
      this.providers.megaeth = new ethers.JsonRpcProvider(
        process.env.MEGA_RPC_URL,
        {
          chainId: parseInt(process.env.MEGA_CHAIN_ID),
          name: 'megaeth'
        }
      );
      
      if (process.env.MEGA_WS_URL) {
        this.wsProviders.megaeth = new ethers.WebSocketProvider(process.env.MEGA_WS_URL);
      }

      // Sepolia provider (for testing bridge)
      if (process.env.SEPOLIA_RPC_URL) {
        this.providers.sepolia = new ethers.JsonRpcProvider(
          process.env.SEPOLIA_RPC_URL,
          {
            chainId: parseInt(process.env.SEPOLIA_CHAIN_ID),
            name: 'sepolia'
          }
        );
      }

      // Test connections
      await this.testProviderConnections();
      
      logger.info('Blockchain providers initialized and tested');
      
    } catch (error) {
      logger.error('Failed to setup providers:', error);
      throw error;
    }
  }

  async testProviderConnections() {
    try {
      // Test RiseChain connection
      const riseBlock = await this.providers.risechain.getBlockNumber();
      logger.info(`RiseChain connected - Latest block: ${riseBlock}`);

      // Test MegaETH connection
      const megaBlock = await this.providers.megaeth.getBlockNumber();
      logger.info(`MegaETH connected - Latest block: ${megaBlock}`);

      // Test Sepolia connection if available
      if (this.providers.sepolia) {
        const sepoliaBlock = await this.providers.sepolia.getBlockNumber();
        logger.info(`Sepolia connected - Latest block: ${sepoliaBlock}`);
      }

    } catch (error) {
      logger.error('Provider connection test failed:', error);
      throw error;
    }
  }

  async initializeRiseChainContracts() {
    try {
      const provider = this.providers.risechain;
      const wsProvider = this.wsProviders.risechain;

      // Bridge contracts
      if (process.env.RISE_BRIDGE_CORE_ADDRESS) {
        this.contracts.risechain.bridgeCore = new ethers.Contract(
          process.env.RISE_BRIDGE_CORE_ADDRESS,
          RiseChainBridgeABI,
          provider
        );

        if (wsProvider) {
          this.contracts.risechain.bridgeCoreWS = new ethers.Contract(
            process.env.RISE_BRIDGE_CORE_ADDRESS,
            RiseChainBridgeABI,
            wsProvider
          );
        }
      }

      // Trading contracts
      if (process.env.RISE_TRADING_ENGINE_ADDRESS) {
        this.contracts.risechain.tradingEngine = new ethers.Contract(
          process.env.RISE_TRADING_ENGINE_ADDRESS,
          TradingEngineABI,
          provider
        );

        if (wsProvider) {
          this.contracts.risechain.tradingEngineWS = new ethers.Contract(
            process.env.RISE_TRADING_ENGINE_ADDRESS,
            TradingEngineABI,
            wsProvider
          );
        }
      }

      // Token Factory contracts
      if (process.env.RISE_TOKEN_FACTORY_ADDRESS) {
        this.contracts.risechain.tokenFactory = new ethers.Contract(
          process.env.RISE_TOKEN_FACTORY_ADDRESS,
          TokenFactoryABI,
          provider
        );

        if (wsProvider) {
          this.contracts.risechain.tokenFactoryWS = new ethers.Contract(
            process.env.RISE_TOKEN_FACTORY_ADDRESS,
            TokenFactoryABI,
            wsProvider
          );
        }
      }

      // Swap contracts
      if (process.env.RISE_SWAP_ROUTER_ADDRESS) {
        this.contracts.risechain.swapRouter = new ethers.Contract(
          process.env.RISE_SWAP_ROUTER_ADDRESS,
          SwapRouterABI,
          provider
        );
      }

      logger.info('RiseChain contracts initialized');

    } catch (error) {
      logger.error('Failed to initialize RiseChain contracts:', error);
      throw error;
    }
  }

  async initializeMegaETHContracts() {
    try {
      const provider = this.providers.megaeth;
      const wsProvider = this.wsProviders.megaeth;

      // Bridge contracts
      if (process.env.MEGA_BRIDGE_CORE_ADDRESS) {
        this.contracts.megaeth.bridgeCore = new ethers.Contract(
          process.env.MEGA_BRIDGE_CORE_ADDRESS,
          RiseChainBridgeABI,
          provider
        );

        if (wsProvider) {
          this.contracts.megaeth.bridgeCoreWS = new ethers.Contract(
            process.env.MEGA_BRIDGE_CORE_ADDRESS,
            RiseChainBridgeABI,
            wsProvider
          );
        }
      }

      // Trading contracts
      if (process.env.MEGA_TRADING_ENGINE_ADDRESS) {
        this.contracts.megaeth.tradingEngine = new ethers.Contract(
          process.env.MEGA_TRADING_ENGINE_ADDRESS,
          TradingEngineABI,
          provider
        );
      }

      logger.info('MegaETH contracts initialized');

    } catch (error) {
      logger.error('Failed to initialize MegaETH contracts:', error);
      throw error;
    }
  }

  async initializeSepoliaContracts() {
    try {
      const provider = this.providers.sepolia;

      // Bridge contracts for testing
      if (process.env.SEPOLIA_BRIDGE_ADDRESS) {
        this.contracts.sepolia.bridgeCore = new ethers.Contract(
          process.env.SEPOLIA_BRIDGE_ADDRESS,
          RiseChainBridgeABI,
          provider
        );
      }

      logger.info('Sepolia contracts initialized');

    } catch (error) {
      logger.error('Failed to initialize Sepolia contracts:', error);
      throw error;
    }
  }

  logContractAddresses() {
    logger.info('📋 CONTRACT ADDRESSES LOADED:');
    logger.info('==========================================');
    
    // RiseChain contracts
    logger.info('🔗 RISECHAIN CONTRACTS:');
    logger.info(`  Bridge Core: ${process.env.RISE_BRIDGE_CORE_ADDRESS || 'NOT SET'}`);
    logger.info(`  Trading Engine: ${process.env.RISE_TRADING_ENGINE_ADDRESS || 'NOT SET'}`);
    logger.info(`  Token Factory: ${process.env.RISE_TOKEN_FACTORY_ADDRESS || 'NOT SET'}`);
    logger.info(`  Swap Router: ${process.env.RISE_SWAP_ROUTER_ADDRESS || 'NOT SET'}`);
    logger.info(`  Bonding Curve: ${process.env.RISE_BONDING_CURVE_ADDRESS || 'NOT SET'}`);
    
    // MegaETH contracts
    logger.info('🔗 MEGAETH CONTRACTS:');
    logger.info(`  Bridge Core: ${process.env.MEGA_BRIDGE_CORE_ADDRESS || 'NOT SET'}`);
    logger.info(`  Trading Engine: ${process.env.MEGA_TRADING_ENGINE_ADDRESS || 'NOT SET'}`);
    
    logger.info('==========================================');
  }

  getContract(chain, contractName) {
    if (!this.initialized) {
      throw new Error('ContractManager not initialized');
    }
    
    if (!this.contracts[chain] || !this.contracts[chain][contractName]) {
      throw new Error(`Contract ${contractName} not found for chain ${chain}`);
    }
    
    return this.contracts[chain][contractName];
  }

  getProvider(chain) {
    if (!this.providers[chain]) {
      throw new Error(`Provider not found for chain ${chain}`);
    }
    return this.providers[chain];
  }

  getWSProvider(chain) {
    if (!this.wsProviders[chain]) {
      throw new Error(`WebSocket provider not found for chain ${chain}`);
    }
    return this.wsProviders[chain];
  }

  async getBlockNumber(chain) {
    const provider = this.getProvider(chain);
    return await provider.getBlockNumber();
  }

  async getBalance(chain, address) {
    const provider = this.getProvider(chain);
    return await provider.getBalance(address);
  }

  async estimateGas(chain, transaction) {
    const provider = this.getProvider(chain);
    return await provider.estimateGas(transaction);
  }

  async getGasPrice(chain) {
    const provider = this.getProvider(chain);
    return await provider.getFeeData();
  }

  async getTransactionReceipt(chain, txHash) {
    const provider = this.getProvider(chain);
    return await provider.getTransactionReceipt(txHash);
  }

  async waitForTransaction(chain, txHash, confirmations = 1) {
    const provider = this.getProvider(chain);
    return await provider.waitForTransaction(txHash, confirmations);
  }

  // Utility method to check if contract exists
  hasContract(chain, contractName) {
    return !!(this.contracts[chain] && this.contracts[chain][contractName]);
  }

  // Get all available contracts for a chain
  getAvailableContracts(chain) {
    if (!this.contracts[chain]) {
      return [];
    }
    return Object.keys(this.contracts[chain]);
  }
}

let contractManager;

async function initializeContracts() {
  try {
    contractManager = new ContractManager();
    await contractManager.initialize();
    return contractManager;
  } catch (error) {
    logger.error('Contract initialization failed:', error);
    throw error;
  }
}

function getContractManager() {
  if (!contractManager) {
    throw new Error('Contract manager not initialized. Call initializeContracts() first.');
  }
  return contractManager;
}

module.exports = {
  initializeContracts,
  getContractManager,
  ContractManager
};


const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Contract ABIs (simplified for example)
const BridgeCoreABI = require('../abis/BridgeCore.json');
const TradingEngineABI = require('../abis/TradingEngine.json');
const SwapRouterABI = require('../abis/SwapRouter.json');
const TokenFactoryABI = require('../abis/TokenFactory.json');

class ContractManager {
  constructor() {
    this.contracts = {
      risechain: {},
      megaeth: {}
    };
    this.providers = {};
    this.wsProviders = {};
  }

  async initialize() {
    try {
      await this.setupProviders();
      await this.initializeRiseChainContracts();
      await this.initializeMegaETHContracts();
      
      logger.info('All blockchain contracts initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  async setupProviders() {
    // RiseChain providers
    this.providers.risechain = new ethers.JsonRpcProvider(process.env.RISE_RPC_URL);
    this.wsProviders.risechain = new ethers.WebSocketProvider(process.env.RISE_WS_URL);

    // MegaETH providers
    this.providers.megaeth = new ethers.JsonRpcProvider(process.env.MEGA_RPC_URL);
    this.wsProviders.megaeth = new ethers.WebSocketProvider(process.env.MEGA_WS_URL);

    // Sepolia provider (for testing)
    if (process.env.SEPOLIA_RPC_URL) {
      this.providers.sepolia = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    }

    logger.info('Blockchain providers initialized');
  }

  async initializeRiseChainContracts() {
    const provider = this.providers.risechain;
    const wsProvider = this.wsProviders.risechain;

    // Bridge contracts
    this.contracts.risechain.bridgeCore = new ethers.Contract(
      process.env.RISE_BRIDGE_CORE_ADDRESS,
      BridgeCoreABI,
      provider
    );

    this.contracts.risechain.bridgeCoreWS = new ethers.Contract(
      process.env.RISE_BRIDGE_CORE_ADDRESS,
      BridgeCoreABI,
      wsProvider
    );

    // Trading contracts
    this.contracts.risechain.tradingEngine = new ethers.Contract(
      process.env.RISE_TRADING_ENGINE_ADDRESS,
      TradingEngineABI,
      provider
    );

    this.contracts.risechain.tradingEngineWS = new ethers.Contract(
      process.env.RISE_TRADING_ENGINE_ADDRESS,
      TradingEngineABI,
      wsProvider
    );

    // Swap contracts
    this.contracts.risechain.swapRouter = new ethers.Contract(
      process.env.RISE_SWAP_ROUTER_ADDRESS,
      SwapRouterABI,
      provider
    );

    // Token creation contracts
    this.contracts.risechain.tokenFactory = new ethers.Contract(
      process.env.RISE_TOKEN_FACTORY_ADDRESS,
      TokenFactoryABI,
      provider
    );

    logger.info('RiseChain contracts initialized');
  }

  async initializeMegaETHContracts() {
    const provider = this.providers.megaeth;
    const wsProvider = this.wsProviders.megaeth;

    // Bridge contracts
    this.contracts.megaeth.bridgeCore = new ethers.Contract(
      process.env.MEGA_BRIDGE_CORE_ADDRESS,
      BridgeCoreABI,
      provider
    );

    // Trading contracts
    this.contracts.megaeth.tradingEngine = new ethers.Contract(
      process.env.MEGA_TRADING_ENGINE_ADDRESS,
      TradingEngineABI,
      provider
    );

    logger.info('MegaETH contracts initialized');
  }

  getContract(chain, contractName) {
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
}

let contractManager;

async function initializeContracts() {
  contractManager = new ContractManager();
  await contractManager.initialize();
  return contractManager;
}

function getContractManager() {
  if (!contractManager) {
    throw new Error('Contract manager not initialized');
  }
  return contractManager;
}

module.exports = {
  initializeContracts,
  getContractManager
};

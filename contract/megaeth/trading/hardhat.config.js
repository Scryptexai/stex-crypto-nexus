
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("hardhat-contract-sizer");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
        details: {
          yul: true,
          yulDetails: {
            stackAllocation: true,
            optimizerSteps: "dhfoDgvulfnTUtnIf"
          }
        }
      },
      viaIR: true
    }
  },
  networks: {
    megaTestnet: {
      url: "https://6342.rpc.thirdweb.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 6342,
      gasPrice: 1000000, // 0.001 gwei (ultra low)
      timeout: 30000, // Faster timeout for real-time
      confirmations: 1, // Ultra-fast confirmations
      // MegaETH optimizations
      blockGasLimit: 2000000000, // 2 Giga gas
      allowUnlimitedContractSize: true
    },
    hardhat: {
      chainId: 31337,
      gas: "auto",
      gasPrice: "auto",
      blockGasLimit: 2000000000,
      allowUnlimitedContractSize: true
    }
  },
  etherscan: {
    apiKey: {
      megaTestnet: "dummy" // No official API key needed yet
    },
    customChains: [
      {
        network: "megaTestnet",
        chainId: 6342,
        urls: {
          apiURL: "https://megaexplorer.xyz/api",
          browserURL: "https://megaexplorer.xyz",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 0.001, // Ultra low gas price
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [
      "TradingEngine",
      "BondingCurveIntegrator", 
      "TokenListingManager",
      "SocialTradingHub"
    ]
  },
  mocha: {
    timeout: 60000 // Faster tests for real-time environment
  }
};

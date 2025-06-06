
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
    riseTestnet: {
      url: "https://testnet.rizelabs.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155931,
      gasPrice: 1000000000, // 1 gwei
      timeout: 60000,
      confirmations: 5,
      // pEVM optimizations
      blockGasLimit: 30000000,
      allowUnlimitedContractSize: true
    },
    hardhat: {
      chainId: 31337,
      gas: "auto",
      gasPrice: "auto",
      blockGasLimit: 30000000,
      allowUnlimitedContractSize: true
    }
  },
  etherscan: {
    apiKey: {
      riseTestnet: process.env.RISE_API_KEY || ""
    },
    customChains: [
      {
        network: "riseTestnet",
        chainId: 11155931,
        urls: {
          apiURL: "https://explorer.testnet.rizelabs.xyz/api",
          browserURL: "https://explorer.testnet.rizelabs.xyz",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    gasPrice: 1,
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
    timeout: 120000
  }
};

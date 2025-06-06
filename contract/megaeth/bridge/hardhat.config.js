
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
        runs: 200
      },
      viaIR: true
    }
  },
  networks: {
    megaTestnet: {
      url: "https://6342.rpc.thirdweb.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 6342,
      gasPrice: 1000000, // 0.001 gwei base fee
      timeout: 30000,    // Faster timeout for real-time operations
      confirmations: 1   // Ultra-fast confirmations
    },
    riseTestnet: {
      url: process.env.RISE_RPC_URL || "https://testnet.rizelabs.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155931,
      gasPrice: 1000000000, // 1 gwei
      timeout: 60000
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/demo",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
      timeout: 60000
    }
  },
  etherscan: {
    apiKey: {
      megaTestnet: "dummy", // No official API key needed yet
      riseTestnet: process.env.RISE_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || ""
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
    gasPrice: 0.001 // 0.001 gwei for MegaETH
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true
  },
  mocha: {
    timeout: 20000 // Faster tests for MegaETH
  }
};


const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying RiseChain Token Creation System...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const contracts = {};

  // 1. Deploy BondingCurve
  console.log("\n📝 Deploying BondingCurve...");
  const BondingCurve = await ethers.getContractFactory("BondingCurve");
  contracts.bondingCurve = await BondingCurve.deploy();
  await contracts.bondingCurve.waitForDeployment();
  const bondingCurveAddress = await contracts.bondingCurve.getAddress();
  console.log("✅ BondingCurve deployed to:", bondingCurveAddress);

  // 2. Deploy TokenFactory
  console.log("Deploying TokenFactory...");
  const TokenFactory = await ethers.getContractFactory("TokenFactory");
  contracts.tokenFactory = await TokenFactory.deploy();
  await contracts.tokenFactory.waitForDeployment();
  const tokenFactoryAddress = await contracts.tokenFactory.getAddress();
  console.log("✅ TokenFactory deployed to:", tokenFactoryAddress);

  // 3. Setup integrations
  console.log("\n⚙️ Setting up integrations...");
  
  // Set bonding curve in token factory
  await contracts.tokenFactory.setBondingCurveIntegrator(bondingCurveAddress);
  console.log("✅ BondingCurve set in TokenFactory");

  // Set token factory as authorized in bonding curve
  await contracts.bondingCurve.setTradingEngine(tokenFactoryAddress);
  console.log("✅ TokenFactory authorized in BondingCurve");

  // Wait for confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  console.log("\n📋 TOKEN CREATION SYSTEM DEPLOYMENT SUMMARY");
  console.log("==========================================");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${await deployer.provider.getNetwork().then(n => n.chainId)}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("==========================================");
  console.log(`TokenFactory: ${tokenFactoryAddress}`);
  console.log(`BondingCurve: ${bondingCurveAddress}`);
  console.log("==========================================");
  console.log("\n📊 PUMP.FUN PARAMETERS CONFIGURED:");
  console.log("- Token Supply: 1,000,000,000 tokens");
  console.log("- Bonding Curve Supply: 800,000,000 tokens (80%)");
  console.log("- Liquidity Supply: 200,000,000 tokens (20%)");
  console.log("- Creation Fee: 0.02 ETH");
  console.log("- Graduation Threshold: $69,000");
  console.log("- Creator Reward: 0.5 ETH");
  console.log("- Trading Fee: 1%");

  // Generate environment file
  const envContent = `
# Token Creation System Deployment Results - ${new Date().toISOString()}
TOKEN_FACTORY_ADDRESS=${tokenFactoryAddress}
BONDING_CURVE_ADDRESS=${bondingCurveAddress}
DEPLOYMENT_BLOCK=${await contracts.tokenFactory.deploymentTransaction().blockNumber}
DEPLOYER_ADDRESS=${deployer.address}
NETWORK=${hre.network.name}
CHAIN_ID=${await deployer.provider.getNetwork().then(n => n.chainId)}

# Pump.fun Configuration
TOKEN_SUPPLY=1000000000000000000000000000
BONDING_CURVE_SUPPLY=800000000000000000000000000
LIQUIDITY_SUPPLY=200000000000000000000000000
CREATION_FEE=20000000000000000
GRADUATION_THRESHOLD=69000000000000000000000
CREATOR_REWARD=500000000000000000
TRADING_FEE=100

# Virtual Reserves (Pump.fun exact)
VIRTUAL_TOKEN_RESERVES=800000000000000000000000000
VIRTUAL_SOL_RESERVES=30000000000000000000
`;

  require('fs').writeFileSync('.env.token-deployment', envContent);
  console.log("✅ Token deployment details saved to .env.token-deployment");

  console.log("\n🎉 Token creation system deployment completed successfully!");
  console.log("💡 Next steps:");
  console.log("   1. Integrate with TradingEngine contract");
  console.log("   2. Deploy GraduationManager contract");
  console.log("   3. Set up fee treasury integration");
  console.log("   4. Configure frontend with contract addresses");
  console.log("   5. Test token creation flow end-to-end");

  return contracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Token creation deployment failed:", error);
    process.exit(1);
  });

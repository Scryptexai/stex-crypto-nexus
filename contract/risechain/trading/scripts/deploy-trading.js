
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying RiseChain Trading System...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  const contracts = {};

  console.log("\n📝 Deploying Trading System Modules...");

  // 1. Deploy FeeTreasury (needed by other contracts)
  console.log("Deploying FeeTreasury...");
  const FeeTreasury = await ethers.getContractFactory("FeeTreasury");
  contracts.feeTreasury = await FeeTreasury.deploy();
  await contracts.feeTreasury.waitForDeployment();
  const treasuryAddress = await contracts.feeTreasury.getAddress();
  console.log("✅ FeeTreasury deployed to:", treasuryAddress);

  // 2. Deploy PointsModule
  console.log("Deploying PointsModule...");
  const PointsModule = await ethers.getContractFactory("PointsModule");
  contracts.pointsModule = await PointsModule.deploy();
  await contracts.pointsModule.waitForDeployment();
  const pointsAddress = await contracts.pointsModule.getAddress();
  console.log("✅ PointsModule deployed to:", pointsAddress);

  // 3. Deploy BondingCurveIntegrator
  console.log("Deploying BondingCurveIntegrator...");
  const BondingCurveIntegrator = await ethers.getContractFactory("BondingCurveIntegrator");
  contracts.bondingCurveIntegrator = await BondingCurveIntegrator.deploy(
    ethers.ZeroAddress // Graduation manager - will be set later
  );
  await contracts.bondingCurveIntegrator.waitForDeployment();
  const bondingAddress = await contracts.bondingCurveIntegrator.getAddress();
  console.log("✅ BondingCurveIntegrator deployed to:", bondingAddress);

  // 4. Deploy TradingEngine
  console.log("Deploying TradingEngine...");
  const TradingEngine = await ethers.getContractFactory("TradingEngine");
  contracts.tradingEngine = await TradingEngine.deploy(
    bondingAddress,
    treasuryAddress,
    pointsAddress,
    ethers.ZeroAddress // Token factory - will be set later
  );
  await contracts.tradingEngine.waitForDeployment();
  const tradingAddress = await contracts.tradingEngine.getAddress();
  console.log("✅ TradingEngine deployed to:", tradingAddress);

  // 5. Deploy TokenListingManager
  console.log("Deploying TokenListingManager...");
  const TokenListingManager = await ethers.getContractFactory("TokenListingManager");
  contracts.tokenListingManager = await TokenListingManager.deploy(
    ethers.ZeroAddress, // Token factory - will be set later
    tradingAddress
  );
  await contracts.tokenListingManager.waitForDeployment();
  const listingAddress = await contracts.tokenListingManager.getAddress();
  console.log("✅ TokenListingManager deployed to:", listingAddress);

  // 6. Deploy SocialTradingHub
  console.log("Deploying SocialTradingHub...");
  const SocialTradingHub = await ethers.getContractFactory("SocialTradingHub");
  contracts.socialTradingHub = await SocialTradingHub.deploy(tradingAddress);
  await contracts.socialTradingHub.waitForDeployment();
  const socialAddress = await contracts.socialTradingHub.getAddress();
  console.log("✅ SocialTradingHub deployed to:", socialAddress);

  console.log("\n⚙️ Setting up configurations...");

  // Setup authorizations
  console.log("Setting up FeeTreasury authorizations...");
  await contracts.feeTreasury.addCollector(tradingAddress);
  console.log("✅ Authorized TradingEngine in FeeTreasury");

  console.log("Setting up PointsModule authorizations...");
  await contracts.pointsModule.authorizeAdder(tradingAddress);
  await contracts.pointsModule.authorizeAdder(socialAddress);
  console.log("✅ Authorized TradingEngine and SocialTradingHub in PointsModule");

  console.log("Setting up BondingCurveIntegrator...");
  await contracts.bondingCurveIntegrator.setTradingEngine(tradingAddress);
  console.log("✅ Set TradingEngine in BondingCurveIntegrator");

  // Wait for confirmations
  console.log("\n⏳ Waiting for confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000));

  console.log("\n📋 TRADING SYSTEM DEPLOYMENT SUMMARY");
  console.log("==========================================");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${await deployer.provider.getNetwork().then(n => n.chainId)}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("==========================================");
  console.log(`TradingEngine: ${tradingAddress}`);
  console.log(`BondingCurveIntegrator: ${bondingAddress}`);
  console.log(`TokenListingManager: ${listingAddress}`);
  console.log(`SocialTradingHub: ${socialAddress}`);
  console.log(`FeeTreasury: ${treasuryAddress}`);
  console.log(`PointsModule: ${pointsAddress}`);
  console.log("==========================================");

  // Generate environment file
  const envContent = `
# Trading System Deployment Results - ${new Date().toISOString()}
TRADING_ENGINE_ADDRESS=${tradingAddress}
BONDING_CURVE_INTEGRATOR_ADDRESS=${bondingAddress}
TOKEN_LISTING_MANAGER_ADDRESS=${listingAddress}
SOCIAL_TRADING_HUB_ADDRESS=${socialAddress}
FEE_TREASURY_ADDRESS=${treasuryAddress}
POINTS_MODULE_ADDRESS=${pointsAddress}
DEPLOYMENT_BLOCK=${await contracts.tradingEngine.deploymentTransaction().blockNumber}
DEPLOYER_ADDRESS=${deployer.address}
NETWORK=${hre.network.name}
CHAIN_ID=${await deployer.provider.getNetwork().then(n => n.chainId)}

# Trading Configuration
TRADING_FEE_PERCENTAGE=100
MAX_SLIPPAGE_PERCENTAGE=1500
GRADUATION_THRESHOLD=69000000000000000000000
CREATOR_REWARD=500000000000000000
SERVICE_FEE=2300000000000000000

# Bonding Curve Parameters
VIRTUAL_TOKEN_RESERVES=800000000000000000000000000
VIRTUAL_SOL_RESERVES=30000000000000000000
GRADUATION_TOKENS=206900000000000000000000000
`;

  require('fs').writeFileSync('.env.trading-deployment', envContent);
  console.log("✅ Trading deployment details saved to .env.trading-deployment");

  console.log("\n🎉 Trading system deployment completed successfully!");
  console.log("💡 Next steps:");
  console.log("   1. Deploy TokenFactory contract");
  console.log("   2. Deploy GraduationManager contract");
  console.log("   3. Configure frontend with contract addresses");
  console.log("   4. Set up monitoring and analytics");
  console.log("   5. Test end-to-end trading flow");

  return contracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Trading deployment failed:", error);
    process.exit(1);
  });

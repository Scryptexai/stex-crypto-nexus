
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Modular Bridge System to MegaETH Real-time...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Validator addresses optimized for real-time consensus
  const validators = [
    process.env.VALIDATOR_1 || "0x742d35Cc6634C0532925a3b8D6c6a682edc44BeE",
    process.env.VALIDATOR_2 || "0x5c7Be6c5a8F9d8ae5d7f6a0c7F4e3B2A1C9D8E7F",
    process.env.VALIDATOR_3 || "0x8A4B9c2D3E1F0A5B6C7D8E9F1A2B3C4D5E6F7A8B"
  ];

  console.log("\n📝 Deploying Bridge Modules with MegaETH Optimizations...");

  // Deploy with optimized gas settings for MegaETH
  const deployOptions = {
    gasLimit: 10000000,  // High limit due to 2 Giga gas blocks
    gasPrice: 1000000    // Low price (0.001 gwei)
  };

  // 1. Deploy PointsModule
  console.log("Deploying PointsModule...");
  const PointsModule = await ethers.getContractFactory("PointsModule");
  const pointsModule = await PointsModule.deploy(deployOptions);
  await pointsModule.waitForDeployment();
  const pointsAddress = await pointsModule.getAddress();
  console.log("✅ PointsModule deployed to:", pointsAddress);

  // 2. Deploy FeeTreasury
  console.log("Deploying FeeTreasury...");
  const FeeTreasury = await ethers.getContractFactory("FeeTreasury");
  const feeTreasury = await FeeTreasury.deploy(deployOptions);
  await feeTreasury.waitForDeployment();
  const treasuryAddress = await feeTreasury.getAddress();
  console.log("✅ FeeTreasury deployed to:", treasuryAddress);

  // 3. Deploy ValidatorRegistry
  console.log("Deploying ValidatorRegistry...");
  const ValidatorRegistry = await ethers.getContractFactory("ValidatorRegistry");
  const validatorRegistry = await ValidatorRegistry.deploy(validators, deployOptions);
  await validatorRegistry.waitForDeployment();
  const validatorAddress = await validatorRegistry.getAddress();
  console.log("✅ ValidatorRegistry deployed to:", validatorAddress);

  // 4. Deploy BridgeReceiver
  console.log("Deploying BridgeReceiver...");
  const BridgeReceiver = await ethers.getContractFactory("BridgeReceiver");
  const bridgeReceiver = await BridgeReceiver.deploy(pointsAddress, deployOptions);
  await bridgeReceiver.waitForDeployment();
  const receiverAddress = await bridgeReceiver.getAddress();
  console.log("✅ BridgeReceiver deployed to:", receiverAddress);

  // 5. Deploy BridgeMessageRouter
  console.log("Deploying BridgeMessageRouter...");
  const BridgeMessageRouter = await ethers.getContractFactory("BridgeMessageRouter");
  const messageRouter = await BridgeMessageRouter.deploy(receiverAddress, deployOptions);
  await messageRouter.waitForDeployment();
  const routerAddress = await messageRouter.getAddress();
  console.log("✅ BridgeMessageRouter deployed to:", routerAddress);

  // 6. Deploy BridgeCore (MegaETH optimized)
  console.log("Deploying BridgeCore (MegaETH optimized)...");
  const BridgeCore = await ethers.getContractFactory("BridgeCore");
  const bridgeCore = await BridgeCore.deploy(routerAddress, treasuryAddress, deployOptions);
  await bridgeCore.waitForDeployment();
  const coreAddress = await bridgeCore.getAddress();
  console.log("✅ BridgeCore deployed to:", coreAddress);

  // Real-time confirmation setup
  console.log("\n⚡ Setting up MegaETH real-time configurations...");

  // Setup with immediate confirmations (optimized for 10ms blocks)
  await pointsModule.authorizeAdder(receiverAddress);
  await feeTreasury.addCollector(coreAddress);
  await bridgeReceiver.addTrustedSender(11155111, process.env.SEPOLIA_BRIDGE_CORE || coreAddress); // Sepolia
  await bridgeReceiver.addTrustedSender(11155931, process.env.RISE_BRIDGE_CORE || coreAddress); // RiseChain
  await messageRouter.addAuthorizedSender(coreAddress);
  await bridgeCore.addSupportedChain(11155111); // Sepolia
  await bridgeCore.addSupportedChain(11155931); // RiseChain

  // Set real-time confirmation window (100 mini-blocks = 1 second)
  await bridgeCore.updateRealtimeWindow(100);
  console.log("✅ Set real-time confirmation window to 100 mini-blocks (~1 second)");

  console.log("\n📋 MEGAETH BRIDGE DEPLOYMENT SUMMARY");
  console.log("==========================================");
  console.log(`Network: ${hre.network.name} (Real-time Blockchain)`);
  console.log(`Chain ID: ${await deployer.provider.getNetwork().then(n => n.chainId)}`);
  console.log(`Block Time: ~10ms (Mini Blocks)`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("==========================================");
  console.log(`BridgeCore: ${coreAddress}`);
  console.log(`BridgeReceiver: ${receiverAddress}`);
  console.log(`BridgeMessageRouter: ${routerAddress}`);
  console.log(`ValidatorRegistry: ${validatorAddress}`);
  console.log(`FeeTreasury: ${treasuryAddress}`);
  console.log(`PointsModule: ${pointsAddress}`);
  console.log("==========================================");
  console.log("🚀 Real-time Features:");
  console.log("   • 10ms block confirmations");
  console.log("   • Real-time transaction status");
  console.log("   • Optimized gas settings");
  console.log("   • Lower bridge fees (0.25%)");
  console.log("==========================================");

  // Generate environment file with MegaETH specifics
  const envContent = `
# MegaETH Bridge Deployment Results - ${new Date().toISOString()}
BRIDGE_CORE_ADDRESS=${coreAddress}
BRIDGE_RECEIVER_ADDRESS=${receiverAddress}
BRIDGE_MESSAGE_ROUTER_ADDRESS=${routerAddress}
VALIDATOR_REGISTRY_ADDRESS=${validatorAddress}
FEE_TREASURY_ADDRESS=${treasuryAddress}
POINTS_MODULE_ADDRESS=${pointsAddress}
DEPLOYMENT_BLOCK=${await bridgeCore.deploymentTransaction().blockNumber}
DEPLOYER_ADDRESS=${deployer.address}
NETWORK=${hre.network.name}
CHAIN_ID=${await deployer.provider.getNetwork().then(n => n.chainId)}

# MegaETH Real-time Specific
MINI_BLOCK_TIME=10
REALTIME_CONFIRMATION_WINDOW=100
BRIDGE_FEE_PERCENTAGE=25
MAX_GAS_LIMIT=10000000
MIN_GAS_PRICE=1000000
`;

  require('fs').writeFileSync('.env.megaeth-bridge-deployment', envContent);
  console.log("✅ MegaETH bridge deployment details saved to .env.megaeth-bridge-deployment");

  console.log("\n🎉 MegaETH Bridge deployment completed successfully!");
  console.log("⚡ Real-time bridge ready for 10ms confirmations!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ MegaETH Bridge deployment failed:", error);
    process.exit(1);
  });

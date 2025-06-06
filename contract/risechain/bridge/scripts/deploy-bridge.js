
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Modular Bridge System to RiseChain...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Validator addresses for ValidatorRegistry
  const validators = [
    process.env.VALIDATOR_1 || "0x742d35Cc6634C0532925a3b8D6c6a682edc44BeE",
    process.env.VALIDATOR_2 || "0x5c7Be6c5a8F9d8ae5d7f6a0c7F4e3B2A1C9D8E7F",
    process.env.VALIDATOR_3 || "0x8A4B9c2D3E1F0A5B6C7D8E9F1A2B3C4D5E6F7A8B"
  ];

  console.log("\n📝 Deploying Bridge Modules...");

  // 1. Deploy PointsModule
  console.log("Deploying PointsModule...");
  const PointsModule = await ethers.getContractFactory("PointsModule");
  const pointsModule = await PointsModule.deploy();
  await pointsModule.waitForDeployment();
  const pointsAddress = await pointsModule.getAddress();
  console.log("✅ PointsModule deployed to:", pointsAddress);

  // 2. Deploy FeeTreasury
  console.log("Deploying FeeTreasury...");
  const FeeTreasury = await ethers.getContractFactory("FeeTreasury");
  const feeTreasury = await FeeTreasury.deploy();
  await feeTreasury.waitForDeployment();
  const treasuryAddress = await feeTreasury.getAddress();
  console.log("✅ FeeTreasury deployed to:", treasuryAddress);

  // 3. Deploy ValidatorRegistry
  console.log("Deploying ValidatorRegistry...");
  const ValidatorRegistry = await ethers.getContractFactory("ValidatorRegistry");
  const validatorRegistry = await ValidatorRegistry.deploy(validators);
  await validatorRegistry.waitForDeployment();
  const validatorAddress = await validatorRegistry.getAddress();
  console.log("✅ ValidatorRegistry deployed to:", validatorAddress);

  // 4. Deploy BridgeReceiver
  console.log("Deploying BridgeReceiver...");
  const BridgeReceiver = await ethers.getContractFactory("BridgeReceiver");
  const bridgeReceiver = await BridgeReceiver.deploy(pointsAddress);
  await bridgeReceiver.waitForDeployment();
  const receiverAddress = await bridgeReceiver.getAddress();
  console.log("✅ BridgeReceiver deployed to:", receiverAddress);

  // 5. Deploy BridgeMessageRouter
  console.log("Deploying BridgeMessageRouter...");
  const BridgeMessageRouter = await ethers.getContractFactory("BridgeMessageRouter");
  const messageRouter = await BridgeMessageRouter.deploy(receiverAddress);
  await messageRouter.waitForDeployment();
  const routerAddress = await messageRouter.getAddress();
  console.log("✅ BridgeMessageRouter deployed to:", routerAddress);

  // 6. Deploy BridgeCore
  console.log("Deploying BridgeCore...");
  const BridgeCore = await ethers.getContractFactory("BridgeCore");
  const bridgeCore = await BridgeCore.deploy(routerAddress, treasuryAddress);
  await bridgeCore.waitForDeployment();
  const coreAddress = await bridgeCore.getAddress();
  console.log("✅ BridgeCore deployed to:", coreAddress);

  console.log("\n⚙️ Setting up configurations...");

  // Setup PointsModule authorizations
  await pointsModule.authorizeAdder(receiverAddress);
  console.log("✅ Authorized BridgeReceiver in PointsModule");

  // Setup FeeTreasury authorizations
  await feeTreasury.addCollector(coreAddress);
  console.log("✅ Authorized BridgeCore in FeeTreasury");

  // Setup BridgeReceiver trusted senders
  await bridgeReceiver.addTrustedSender(11155111, process.env.SEPOLIA_BRIDGE_CORE || coreAddress); // Sepolia
  await bridgeReceiver.addTrustedSender(6342, process.env.MEGAETH_BRIDGE_CORE || coreAddress); // MegaETH
  console.log("✅ Added trusted senders to BridgeReceiver");

  // Setup MessageRouter authorizations
  await messageRouter.addAuthorizedSender(coreAddress);
  console.log("✅ Authorized BridgeCore in MessageRouter");

  // Setup BridgeCore supported chains
  await bridgeCore.addSupportedChain(11155111); // Sepolia
  await bridgeCore.addSupportedChain(6342); // MegaETH
  console.log("✅ Added supported chains to BridgeCore");

  console.log("\n📋 BRIDGE DEPLOYMENT SUMMARY");
  console.log("==========================================");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${await deployer.provider.getNetwork().then(n => n.chainId)}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("==========================================");
  console.log(`BridgeCore: ${coreAddress}`);
  console.log(`BridgeReceiver: ${receiverAddress}`);
  console.log(`BridgeMessageRouter: ${routerAddress}`);
  console.log(`ValidatorRegistry: ${validatorAddress}`);
  console.log(`FeeTreasury: ${treasuryAddress}`);
  console.log(`PointsModule: ${pointsAddress}`);
  console.log("==========================================");

  // Generate environment file
  const envContent = `
# Bridge Deployment Results - ${new Date().toISOString()}
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
`;

  require('fs').writeFileSync('.env.bridge-deployment', envContent);
  console.log("✅ Bridge deployment details saved to .env.bridge-deployment");

  console.log("\n🎉 Bridge deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Bridge deployment failed:", error);
    process.exit(1);
  });


const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Modular Swap System to RiseChain...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // RiseChain WETH address
  const WETH = process.env.WETH_ADDRESS || "0x4200000000000000000000000000000000000006";

  console.log("\n📝 Deploying Swap Modules...");

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

  // 3. Deploy SwapFactory
  console.log("Deploying SwapFactory...");
  const SwapFactory = await ethers.getContractFactory("SwapFactory");
  const swapFactory = await SwapFactory.deploy(treasuryAddress, pointsAddress);
  await swapFactory.waitForDeployment();
  const factoryAddress = await swapFactory.getAddress();
  console.log("✅ SwapFactory deployed to:", factoryAddress);

  // 4. Deploy SwapRouter
  console.log("Deploying SwapRouter...");
  const SwapRouter = await ethers.getContractFactory("SwapRouter");
  const swapRouter = await SwapRouter.deploy(factoryAddress, WETH);
  await swapRouter.waitForDeployment();
  const routerAddress = await swapRouter.getAddress();
  console.log("✅ SwapRouter deployed to:", routerAddress);

  console.log("\n⚙️ Setting up configurations...");

  // Setup PointsModule authorizations
  await pointsModule.authorizeAdder(factoryAddress);
  console.log("✅ Authorized SwapFactory in PointsModule");

  // Setup FeeTreasury authorizations
  await feeTreasury.addCollector(factoryAddress);
  console.log("✅ Authorized SwapFactory in FeeTreasury");

  // Create initial pairs for RiseChain tokens
  const tokens = {
    USDC: "0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849",
    USDT: "0xf32d39ff9f6aa7a7a64d7a4f00a54826ef791a55",
    DAI: "0xd6e1afe5ca8d00a2efc01b89997abe2de47fdfaf"
  };

  console.log("\n🔄 Creating initial trading pairs...");
  
  // Create WETH/USDC pair
  try {
    const tx1 = await swapFactory.createPair(WETH, tokens.USDC);
    await tx1.wait();
    console.log("✅ Created WETH/USDC pair");
  } catch (error) {
    console.log("ℹ️ WETH/USDC pair may already exist");
  }

  // Create WETH/USDT pair
  try {
    const tx2 = await swapFactory.createPair(WETH, tokens.USDT);
    await tx2.wait();
    console.log("✅ Created WETH/USDT pair");
  } catch (error) {
    console.log("ℹ️ WETH/USDT pair may already exist");
  }

  // Create USDC/USDT pair
  try {
    const tx3 = await swapFactory.createPair(tokens.USDC, tokens.USDT);
    await tx3.wait();
    console.log("✅ Created USDC/USDT pair");
  } catch (error) {
    console.log("ℹ️ USDC/USDT pair may already exist");
  }

  console.log("\n📋 SWAP DEPLOYMENT SUMMARY");
  console.log("==========================================");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${await deployer.provider.getNetwork().then(n => n.chainId)}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("==========================================");
  console.log(`SwapFactory: ${factoryAddress}`);
  console.log(`SwapRouter: ${routerAddress}`);
  console.log(`FeeTreasury: ${treasuryAddress}`);
  console.log(`PointsModule: ${pointsAddress}`);
  console.log(`WETH: ${WETH}`);
  console.log("==========================================");

  // Generate environment file
  const envContent = `
# Swap Deployment Results - ${new Date().toISOString()}
SWAP_FACTORY_ADDRESS=${factoryAddress}
SWAP_ROUTER_ADDRESS=${routerAddress}
SWAP_FEE_TREASURY_ADDRESS=${treasuryAddress}
SWAP_POINTS_MODULE_ADDRESS=${pointsAddress}
WETH_ADDRESS=${WETH}
DEPLOYMENT_BLOCK=${await swapFactory.deploymentTransaction().blockNumber}
DEPLOYER_ADDRESS=${deployer.address}
NETWORK=${hre.network.name}
CHAIN_ID=${await deployer.provider.getNetwork().then(n => n.chainId)}

# Token Addresses
RISE_USDC=${tokens.USDC}
RISE_USDT=${tokens.USDT}
RISE_DAI=${tokens.DAI}
`;

  require('fs').writeFileSync('.env.swap-deployment', envContent);
  console.log("✅ Swap deployment details saved to .env.swap-deployment");

  console.log("\n🎉 Swap deployment completed successfully!");
  console.log("💡 Next steps:");
  console.log("   1. Add liquidity to the created pairs");
  console.log("   2. Configure frontend with contract addresses");
  console.log("   3. Set up monitoring and analytics");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Swap deployment failed:", error);
    process.exit(1);
  });

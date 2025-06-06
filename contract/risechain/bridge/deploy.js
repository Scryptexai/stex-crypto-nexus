
const { ethers } = require("hardhat");
const { verify } = require("@nomicfoundation/hardhat-verify");

async function main() {
  console.log("🚀 Deploying ScryptexBridge to RiseChain...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Validator addresses for multi-sig consensus
  const validators = [
    process.env.VALIDATOR_1 || "0x742d35Cc6634C0532925a3b8D6c6a682edc44BeE",
    process.env.VALIDATOR_2 || "0x5c7Be6c5a8F9d8ae5d7f6a0c7F4e3B2A1C9D8E7F",
    process.env.VALIDATOR_3 || "0x8A4B9c2D3E1F0A5B6C7D8E9F1A2B3C4D5E6F7A8B",
    process.env.VALIDATOR_4 || "0x1F2E3D4C5B6A9B8C7D6E5F4A3B2C1D0E9F8A7B6C",
    process.env.VALIDATOR_5 || "0x6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2C3D4E5F"
  ];

  console.log("Validators:", validators);

  // Deploy ScryptexBridge
  console.log("\n📝 Deploying ScryptexBridge contract...");
  const ScryptexBridge = await ethers.getContractFactory("ScryptexBridge");
  
  const bridge = await ScryptexBridge.deploy(validators, {
    gasLimit: 10000000,
    gasPrice: 1000000000 // 1 gwei
  });

  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  
  console.log("✅ ScryptexBridge deployed to:", bridgeAddress);

  // Wait for a few confirmations
  console.log("⏳ Waiting for confirmations...");
  await bridge.deploymentTransaction().wait(5);

  // Setup trusted remote chains
  console.log("\n🔗 Setting up trusted remote chains...");
  
  // Sepolia testnet
  if (process.env.SEPOLIA_BRIDGE_ADDRESS) {
    const sepoliaTx = await bridge.setTrustedRemote(11155111, process.env.SEPOLIA_BRIDGE_ADDRESS);
    await sepoliaTx.wait();
    console.log("✅ Sepolia trusted remote set");
  }

  // MegaETH testnet
  if (process.env.MEGAETH_BRIDGE_ADDRESS) {
    const megaETHTx = await bridge.setTrustedRemote(6342, process.env.MEGAETH_BRIDGE_ADDRESS);
    await megaETHTx.wait();
    console.log("✅ MegaETH trusted remote set");
  }

  // Setup initial configuration
  console.log("\n⚙️ Setting up initial configuration...");
  
  // Set bridge fee
  const bridgeFee = process.env.BRIDGE_FEE_PERCENTAGE || 30; // 0.3%
  const feeTransaction = await bridge.updateFee(bridgeFee);
  await feeTransaction.wait();
  console.log(`✅ Bridge fee set to ${bridgeFee / 100}%`);

  // Set daily bridge limit
  const dailyLimit = process.env.DAILY_BRIDGE_LIMIT || 10;
  const limitTransaction = await bridge.updateDailyBridgeLimit(dailyLimit);
  await limitTransaction.wait();
  console.log(`✅ Daily bridge limit set to ${dailyLimit}`);

  // Contract verification
  if (process.env.RISE_API_KEY && hre.network.name !== "hardhat") {
    console.log("\n🔍 Verifying contract on RiseChain explorer...");
    try {
      await verify(bridgeAddress, [validators]);
      console.log("✅ Contract verified successfully");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  // Display deployment summary
  console.log("\n📋 DEPLOYMENT SUMMARY");
  console.log("==========================================");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Chain ID: ${await deployer.provider.getNetwork().then(n => n.chainId)}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`ScryptexBridge: ${bridgeAddress}`);
  console.log(`Validators: ${validators.length}`);
  console.log(`Bridge Fee: ${bridgeFee / 100}%`);
  console.log(`Daily Limit: ${dailyLimit}`);
  console.log("==========================================");

  // Generate environment file
  console.log("\n📄 Generating environment file...");
  const envContent = `
# Contract Deployment Results - ${new Date().toISOString()}
BRIDGE_CONTRACT_ADDRESS=${bridgeAddress}
DEPLOYMENT_BLOCK=${await bridge.deploymentTransaction().blockNumber}
DEPLOYMENT_TX=${bridge.deploymentTransaction().hash}
DEPLOYER_ADDRESS=${deployer.address}
NETWORK=${hre.network.name}
CHAIN_ID=${await deployer.provider.getNetwork().then(n => n.chainId)}

# Copy these values to your main .env file
`;

  require('fs').writeFileSync('.env.deployment', envContent);
  console.log("✅ Deployment details saved to .env.deployment");

  console.log("\n🎉 Deployment completed successfully!");
  console.log("💡 Don't forget to:");
  console.log("   1. Update your frontend with the new contract address");
  console.log("   2. Set up cross-chain trusted remotes");
  console.log("   3. Fund the contract with initial liquidity");
  console.log("   4. Configure monitoring and alerting");
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

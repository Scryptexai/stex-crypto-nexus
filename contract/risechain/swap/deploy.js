
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying ScryptexSwap to RiseChain...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Deploy ScryptexSwap
  console.log("\n📝 Deploying ScryptexSwap contract...");
  const ScryptexSwap = await ethers.getContractFactory("ScryptexSwap");
  
  const swap = await ScryptexSwap.deploy({
    gasLimit: 10000000,
    gasPrice: 1000000000 // 1 gwei
  });

  await swap.waitForDeployment();
  const swapAddress = await swap.getAddress();
  
  console.log("✅ ScryptexSwap deployed to:", swapAddress);

  // Wait for confirmations
  console.log("⏳ Waiting for confirmations...");
  await swap.deploymentTransaction().wait(5);

  // Setup initial configuration
  console.log("\n⚙️ Setting up initial configuration...");
  
  // Set swap fee
  const swapFee = process.env.SWAP_FEE_PERCENTAGE || 25; // 0.25%
  const feeTransaction = await swap.updateFee(swapFee);
  await feeTransaction.wait();
  console.log(`✅ Swap fee set to ${swapFee / 100}%`);

  // Contract verification
  if (process.env.RISE_API_KEY && hre.network.name !== "hardhat") {
    console.log("\n🔍 Verifying contract...");
    try {
      await verify(swapAddress, []);
      console.log("✅ Contract verified successfully");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  console.log("\n📋 DEPLOYMENT SUMMARY");
  console.log("==========================================");
  console.log(`ScryptexSwap: ${swapAddress}`);
  console.log(`Swap Fee: ${swapFee / 100}%`);
  console.log("==========================================");

  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

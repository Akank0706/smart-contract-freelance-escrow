const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=================================================");
  console.log(" Deploying FreelanceEscrow Smart Contract");
  console.log("=================================================");

  const [deployer, client, freelancer, arbitrator] = await hre.ethers.getSigners();

  console.log(`Deploying with account: ${deployer.address}`);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balance)} ETH`);

  // 1. Deploy Contract
  const FreelanceEscrow = await hre.ethers.getContractFactory("FreelanceEscrow");
  const escrow = await FreelanceEscrow.deploy();
  await escrow.waitForDeployment();

  const contractAddress = await escrow.getAddress();
  console.log(` FreelanceEscrow deployed to: ${contractAddress}`);

  // 2. Optional: Seed demo escrow on local network
  if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
    console.log("\n--- Seeding Initial Demo Escrows for Local Testing ---");

    const sampleAmount = hre.ethers.parseEther("0.5");

    // Client creates an escrow for freelancer
    const tx = await escrow.connect(client).createEscrow(
      freelancer.address,
      arbitrator.address,
      "Decentralized E-Commerce Smart Contract Suite",
      "Build ERC-721 product inventory & ERC-20 payment gateway contracts with comprehensive test coverage.",
      sampleAmount,
      { value: sampleAmount } // Immediate funding
    );
    await tx.wait();
    console.log(` Created and funded Escrow #1 (Amount: 0.5 ETH)`);

    // Freelancer starts work
    const startTx = await escrow.connect(freelancer).startWork(1);
    await startTx.wait();
    console.log(` Freelancer started work on Escrow #1`);
  }

  console.log("\n=================================================");
  console.log(" Deployment Completed Successfully");
  console.log(` Target Address: ${contractAddress}`);
  console.log("=================================================");

  // Output config to frontend
  const frontendConfig = {
    address: contractAddress,
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
  };

  const configPath = path.join(__dirname, "../src/contract/deployedAddress.json");
  fs.writeFileSync(configPath, JSON.stringify(frontendConfig, null, 2));
  console.log(`Saved deployment info to ${configPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

import { ethers } from "hardhat";

async function main() {
    const positionManagerAddress = "0x..."; // Uniswap V4 Position Manager
    const poolManagerAddress = "0x...";     // Uniswap V4 Pool Manager

    const PoolCreator = await ethers.getContractFactory("PoolCreator");
    const poolCreator = await PoolCreator.deploy(
        positionManagerAddress,
        poolManagerAddress
    );

    await poolCreator.waitForDeployment();
    console.log("PoolCreator deployed to:", await poolCreator.getAddress());
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 
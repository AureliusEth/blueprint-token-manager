import { ethers } from "hardhat";
import dotenv from 'dotenv';
import { TokenFactory__factory } from "../../../types/contracts";
dotenv.config();

async function main() {
    if (!process.env.EVM_TEST_PRIV_KEY) {
        throw new Error("PRIVATE_KEY not found in .env");
    }

    const deployer = new ethers.Wallet(
        process.env.EVM_TEST_PRIV_KEY,
        ethers.provider
    );
    
    console.log("Deploying TokenFactory with account:", deployer.address);

    const tokenFactory = await new TokenFactory__factory(deployer).deploy(deployer.address);
    await tokenFactory.waitForDeployment();

    const tokenFactoryAddress = await tokenFactory.getAddress();
    console.log("TokenFactory deployed to:", tokenFactoryAddress);
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 
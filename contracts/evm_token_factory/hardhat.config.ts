import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";
import dotenv from 'dotenv';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  typechain: {
    outDir: "../../types/contracts",
    target: "ethers-v6",
  },
  networks: {
    arbitrum: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.EVM_TEST_PRIV_KEY ? [process.env.EVM_TEST_PRIV_KEY] : [],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.EVM_TEST_PRIV_KEY ? [process.env.EVM_TEST_PRIV_KEY] : [],
    }
  }
};

export default config;

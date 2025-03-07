import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-foundry";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      evmVersion: "cancun"
    },
  },
  paths: {
    sources: "./contracts",
  },
  // Add remappings for Uniswap V4 dependencies
  networks: {
    // ... your networks
  },
  // Add remappings
};

export default config; 

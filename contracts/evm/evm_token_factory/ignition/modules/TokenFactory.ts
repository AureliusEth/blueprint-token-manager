import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenFactoryModule = buildModule("TokenFactoryModule", (m) => {
    // Get deployer address as the owner parameter
    const owner = m.getParameter("owner");

    // Deploy TokenFactory contract
    const tokenFactory = m.contract("TokenFactory", [owner]);

    return { tokenFactory };
});

export default TokenFactoryModule; 
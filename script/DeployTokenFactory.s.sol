// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/evm_token_factory/contracts/token_factory.sol";

contract DeployTokenFactory is Script {
    function setUp() public {}

    function run() public {
        // Get deployer wallet
        uint256 deployerPrivateKey = vm.envUint("EVM_TEST_PRIV_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy TokenFactory contract
        TokenFactory tokenFactory = new TokenFactory(address(this));

        // Verify deployment
        console.log("TokenFactory deployed to:", address(tokenFactory));

        vm.stopBroadcast();
    }
} 
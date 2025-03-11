// SPDX-License-Identifier: MIT
pragma solidity =0.8.26;

import "forge-std/Script.sol";
import {PoolCreator} from "../contracts/uniswap/PoolCreator.sol";

contract DeployPoolCreator is Script {
    // Mainnet addresses
    address public constant POSITION_MANAGER = 0x000000000004444c5dc75cB358380D2e3dE08A90; // Official address
    address public constant POOL_MANAGER = 0x000000000004444c5dc75cB358380D2e3dE08A90;     // Official address
    address public constant SEPOLIA_POSITION_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;     // Official 
    address public constant SEPOLIA_POOL_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;     // Official 
    
    // Load addresses based on network
    function getAddresses() internal view returns (address positionManager, address poolManager) {
        string memory network;
        
        // Try to get NETWORK from environment, default to "mainnet" if not set
        try vm.envString("NETWORK") returns (string memory value) {
            network = value;
        } catch {
            network = "mainnet";
        }
        
        if (keccak256(bytes(network)) == keccak256(bytes("mainnet"))) {
            return (POSITION_MANAGER, POOL_MANAGER); // Mainnet
        } else if (keccak256(bytes(network)) == keccak256(bytes("sepolia"))) {
            return (SEPOLIA_POSITION_MANAGER, SEPOLIA_POOL_MANAGER); // Sepolia testnet
        } else {
            revert("Unsupported network");
        }
    }

    function run() public {
        // Make sure your PRIVATE_KEY environment variable has the 0x prefix
        uint256 deployerPrivateKey = vm.envUint("EVM_TEST_PRIV_KEY");
        
        // Get addresses based on network
        (address positionManager, address poolManager) = getAddresses();
        
        vm.startBroadcast(deployerPrivateKey);

        PoolCreator poolCreator = new PoolCreator(
            payable(positionManager),
            poolManager
        );
        console.log("PoolCreator deployed at:", address(poolCreator));

        vm.stopBroadcast();
    }
} 
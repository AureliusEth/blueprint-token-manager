// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenFactory
 * @dev Contract for creating new ERC20 tokens
 */
contract TokenFactory is Ownable {

    constructor(
        address owner
    ) Ownable(owner) {
    }
    event TokenCreated(address indexed tokenAddress, string name, string symbol, uint8 decimals, uint256 initialSupply);
    
    /**
     * @dev Creates a new ERC20 token
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param decimals The number of decimals for the token
     * @param initialSupply The initial supply of tokens to mint
     * @param owner The address that will own the token contract
     * @return The address of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply,
        address owner
    ) external returns (address) {
        CustomToken newToken = new CustomToken(
            name,
            symbol,
            decimals,
            initialSupply,
            owner
        );
        
        emit TokenCreated(
            address(newToken),
            name,
            symbol,
            decimals,
            initialSupply
        );
        
        return address(newToken);
    }
}

/**
 * @title CustomToken
 * @dev Implementation of the CustomToken
 */
contract CustomToken is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimalsArg,
        uint256 initialSupply,
        address owner
    ) ERC20(name, symbol) Ownable(owner) {
        _decimals = decimalsArg;
        _mint(owner, initialSupply * (10 ** decimalsArg));
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mints new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burns tokens
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) public {
        _burn(_msgSender(), amount);
    }
}

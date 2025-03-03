// If you've imported the script differently, adjust the import path above

// The token factory code as a multi-line template literal
export const generateCustomToken = (name: string, decimals = 6, symbol: string, description = "") => {
    return `
    /// Module: token_factory
        module token_factory::token_factory {
        use sui::tx_context::TxContext;
        use sui::coin::{Self, TreasuryCap, CoinMetadata};
        use sui::transfer;
        use sui::object::UID;
        use std::ascii::String;
        use std::option;
        use sui::package::{Self, Publisher, UpgradeCap};
        /// One-time witness
        public struct TOKEN_FACTORY has drop {}
        /// Public struct for token metadata
        public struct TokenMetadata has key, store {
            id: UID,
            symbol: vector<u8>,
            name: vector<u8>,
            description: vector<u8>,
            icon_url: String,
            decimals: u8
        }
        fun init(witness: TOKEN_FACTORY, ctx: &mut TxContext) {
            // Create basic token first
            let (treasury_cap, metadata) = coin::create_currency(
                witness,
                ${decimals}, // Default decimals
                b"${symbol}", // Placeholder symbol
                b"${name}", // Placeholder name
                b"${description}", // Empty description
                option::none(), // No URL yet
                ctx
            );
            // Transfer treasury cap and metadata to sender
            let sender = tx_context::sender(ctx);
            transfer::public_transfer(treasury_cap, sender);
            transfer::public_transfer(metadata, sender);
        }
        /// Set/Update token metadata - must be called with publisher
        public entry fun set_metadata(
            upgrade_cap: &UpgradeCap,
            symbol: vector<u8>,
            name: vector<u8>,
            description: vector<u8>,
            icon_url: String,
            decimals: u8,
            ctx: &mut TxContext
        ) {
            // Verify the upgrade cap is for this package
            assert!(package::upgrade_policy(upgrade_cap) == 0, 0);

        let metadata = TokenMetadata {
            id: object::new(ctx),
            symbol,
            name,
            description,
            icon_url,
            decimals
        };
        transfer::public_transfer(metadata, tx_context::sender(ctx));
        }
        public entry fun mint(
            treasury_cap: &mut TreasuryCap<TOKEN_FACTORY>,
            amount: u64,
            recipient: address,
            ctx: &mut TxContext
        ) {
            let coin = coin::mint(treasury_cap, amount, ctx);
            transfer::public_transfer(coin, recipient)
        }
    }
    `;

}

// Write the token factory code to a file
//
export const generateCustomPoolToken = (
        name: string, 
        decimals = 6, 
        symbol: string, 
        description = "",
        protocol_config: string ,
        coin_b: string,
        coin_b_symbol: string, 
        coin_b_decimals: string,
        tick_spacing: string,
        fee_basis_points: string,
        current_sqrt_price: string,
        initial_supply: string,
        ) => {
    return `
    /// Module: token_factory
module token_factory::pool_token_factory {
    use sui::tx_context::TxContext;
    use sui::coin::{Self, TreasuryCap, CoinMetadata};
    use sui::transfer;
    use sui::object::UID;
    use std::ascii::String;
    use std::option;
    use sui::package::{Self, Publisher, UpgradeCap};
    use executor::executor; 
    /// One-time witness
    public struct POOL_TOKEN_FACTORY has drop {}
    /// Public struct for token metadata
    public struct TokenMetadata has key, store {
        id: UID,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: String,
        decimals: u8
    }
    fun init(
    witness: POOL_TOKEN_FACTORY, 
    ctx: &mut TxContext,
    ) {
        // Create basic token first
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            ${decimals}, // Default decimals
            ${symbol}// Placeholder symbol
            ${name}", // Placeholder name
            ${description}, // Empty description
            option::none(), // No URL yet
            ctx
        );
        // Transfer treasury cap and metadata to sender
        let sender = tx_context::sender(ctx);
        let coins = internal_mint(&mut treasury_cap,initial_supply,ctx);
        executor::create_pool_with_liquidity_only<POOL_TOKEN_FACTORY,CoinTypeB>(
        0x6,
        ${protocol_config},
        coins,
        ${coin_b},
        ${symbol}, //Coin A Symbol
        ${decimals}, // Coin A Decimals
        vector::empty(),// No URL yet
        ${coin_b_symbol}, 
        ${coin_b_decimals},
        vector::empty(),
        ${tick_spacing},
        ${fee_basis_points},
        ${current_sqrt_price},
        ${initial_supply},
        ctx
        );
        transfer::public_transfer(treasury_cap, sender);
        transfer::public_transfer(metadata, sender);
    }
    /// Set/Update token metadata - must be called with publisher
    public fun internal_mint(
        treasury_cap: &mut TreasuryCap<TOKEN_FACTORY>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
    }
    public entry fun mint(
        treasury_cap: &mut TreasuryCap<TOKEN_FACTORY>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient)
    }
}

    `;

}

// Write the token factory code to a file

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
    fun init<CoinTypeB>(
    witness: TOKEN_FACTORY, 
    ctx: &mut TxContext,
    ) {
        // Create basic token first
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6, // Default decimals
            b"TESTB", // Placeholder symbol
            b"Blue Token", // Placeholder name
            b"Test Token for Pool Creation", // Empty description
            option::none(), // No URL yet
            ctx
        );
        // Transfer treasury cap and metadata to sender
        let sender = tx_context::sender(ctx);
        let coins = internal_mint(&mut treasury_cap,initial_supply,ctx);
        executor::create_pool_with_liquidity_only<TOKEN_FACTORY,CoinTypeB>(
        clock,
        protocol_config,
        coins,
        coin_b,
        b"TESTB", //Coin A Symbol
        6, // Coin A Decimals
        vector::empty(),// No URL yet
        coin_b_symbol, 
        coin_b_decimals,
        vector::empty(),
        tick_spacing,
        fee_basis_points,
        current_sqrt_price,
        initial_supply,
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


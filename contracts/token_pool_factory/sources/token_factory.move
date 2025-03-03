/// Module: token_factory
module token_factory::pool_token_factory {
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, TreasuryCap, CoinMetadata};
    use sui::transfer;
    use sui::object::{Self, UID};
    use std::ascii::{Self, String};
    use std::option::{Self, Option};
    use sui::package::{Self, Publisher, UpgradeCap};
    use sui::clock::Clock;
    use sui::url::{Self, Url};
    use bluefin_spot::config::GlobalConfig;
    use executor::executor;

    /// One-time witness
    struct POOL_TOKEN_FACTORY has drop {}

    /// Public struct for token metadata
    struct TokenMetadata has key, store {
        id: UID,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: String,
        decimals: u8
    }

    fun init(witness: POOL_TOKEN_FACTORY, ctx: &mut TxContext) {
        // Create basic token first
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6, // Default decimals
            b"BFISHT", // Symbol
            b"Blue Fish Token", // Name
            b"Test Token for Pool Creation", // Description
            option::none<Url>(), // No URL yet
            ctx
        );

        // Transfer treasury cap and metadata to sender
        let sender = tx_context::sender(ctx);
        transfer::public_transfer(treasury_cap, sender);
        transfer::public_transfer(metadata, sender);
    }

    public fun internal_mint(
        treasury_cap: &mut TreasuryCap<POOL_TOKEN_FACTORY>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<POOL_TOKEN_FACTORY> {
        coin::mint(treasury_cap, amount, ctx)
    }

    public entry fun create_pool_with_token<CoinTypeB>(
        clock: &Clock,
        protocol_config: &mut GlobalConfig,
        treasury_cap: &mut TreasuryCap<POOL_TOKEN_FACTORY>,
        coin_b: Coin<CoinTypeB>,
        coin_b_symbol: vector<u8>,
        coin_b_decimals: u8,
        initial_supply: u64,
        tick_spacing: u32,
        fee_basis_points: u64,
        current_sqrt_price: u128,
        amount_a: u64,
        amount_b: u64,
        ctx: &mut TxContext
    ) {
        let coins = internal_mint(treasury_cap, initial_supply, ctx);
        
        executor::create_pool_with_liquidity_only<POOL_TOKEN_FACTORY, CoinTypeB>(
            clock,
            protocol_config,
            coins,
            coin_b,
            b"BFISHT",
            6,
            vector::empty(),
            coin_b_symbol,
            coin_b_decimals,
            vector::empty(),
            tick_spacing,
            fee_basis_points,
            current_sqrt_price,
            amount_a,
            amount_b,
            ctx
        );
    }
}

    
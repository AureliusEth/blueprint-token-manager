module executor::token_factory {
    use sui::coin::{Self, TreasuryCap, CoinMetadata};
    use sui::url;
    use sui::tx_context::{Self, TxContext};
    use std::ascii::String;
    use sui::transfer;
    use std::option;

    /// Witness type for all factory-created tokens
    public struct MANAGED_TOKEN has drop {}

    // Error codes
    const E_INVALID_DECIMALS: u64 = 0;
    const E_ZERO_SUPPLY: u64 = 1;

    /// Create a new token - public entry point for direct token creation
    public entry fun create_token(
        initial_supply: u64,
        decimals: u8,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: String,
        ctx: &mut TxContext,
    ) {
        let (treasury_cap, metadata, coins) = create_token_internal(
            initial_supply,
            decimals,
            symbol,
            name,
            description,
            icon_url,
            ctx
        );

        // Transfer everything to creator
        let sender = tx_context::sender(ctx);
        transfer::public_transfer(treasury_cap, sender);
        transfer::public_transfer(metadata, sender);
        transfer::public_transfer(coins, sender);
    }

    /// Internal function to create a token and return the components
    public fun create_token_internal(
        initial_supply: u64,
        decimals: u8,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: String,
        ctx: &mut TxContext,
    ): (TreasuryCap<MANAGED_TOKEN>, CoinMetadata<MANAGED_TOKEN>, coin::Coin<MANAGED_TOKEN>) {
        // Input validation
        assert!(decimals <= 18, E_INVALID_DECIMALS);
        assert!(initial_supply > 0, E_ZERO_SUPPLY);

        // Create the currency
        let (mut treasury_cap, metadata) = coin::create_currency(
            MANAGED_TOKEN {},
            decimals,
            symbol,
            name,
            description,
            option::some(url::new_unsafe(icon_url)),
            ctx
        );

        // Mint initial supply
        let coins = coin::mint(&mut treasury_cap, initial_supply, ctx);

        (treasury_cap, metadata, coins)
    }
}

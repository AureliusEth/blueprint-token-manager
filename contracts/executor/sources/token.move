module executor::token_factory {
    use sui::coin::{Self, TreasuryCap, CoinMetadata};
    use sui::url;
    use sui::tx_context::{Self, TxContext};
    use std::ascii::String;
    use sui::transfer;
    use std::option;
    use sui::object::{Self, UID};
    use sui::dynamic_field;
    use std::vector;
    use sui::bcs;

    /// Witness type for all factory-created tokens
    public struct MANAGED_TOKEN has drop {}

    // Error codes
    const E_INVALID_DECIMALS: u64 = 0;
    const E_ZERO_SUPPLY: u64 = 1;

    /// One-time witness for module initialization
    struct TOKEN_FACTORY has drop {}

    // Counter to track number of tokens created
    struct TokenCounter has key {
        id: UID,
        count: u64
    }

    // Unique token type for each token
    struct TokenType has drop {
        id: UID
    }

    // Witness type with phantom parameter
    struct TokenWitness<phantom T: drop> has drop {}

    fun init(witness: TOKEN_FACTORY, ctx: &mut TxContext) {
        // Create counter on module init
        transfer::share_object(TokenCounter {
            id: object::new(ctx),
            count: 0
        })
    }

    /// Create a new token - public entry point for direct token creation
    public entry fun create_token(
        counter: &mut TokenCounter,
        initial_supply: u64,
        decimals: u8,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: String,
        ctx: &mut TxContext,
    ) {
        // Create a unique token type
        let token_type = TokenType {
            id: object::new(ctx)
        };

        // Create unique witness using the token type
        let witness = TokenWitness<TokenType> {};

        // Input validation
        assert!(decimals <= 18, E_INVALID_DECIMALS);
        assert!(initial_supply > 0, E_ZERO_SUPPLY);

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
        let witness = TokenWitness<TokenType> {};
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
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

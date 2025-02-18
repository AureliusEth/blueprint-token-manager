module token::token_factory {
    use sui::coin;
    use sui::url;
    use std::ascii::String;

    /// Witness type for all factory-created tokens
    public struct MANAGED_TOKEN has drop {}

    // Error codes
    const E_INVALID_DECIMALS: u64 = 0;
    const E_ZERO_SUPPLY: u64 = 1;

    /// Create a new token
    public entry fun create_token(
        initial_supply: u64,
        decimals: u8,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: String,
        ctx: &mut TxContext,
    ) {
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

        // Transfer everything to creator
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        transfer::public_transfer(metadata, tx_context::sender(ctx));
        transfer::public_transfer(coins, tx_context::sender(ctx));
    }
}

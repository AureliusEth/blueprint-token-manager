module executor::executor {
    use sui::tx_context;
    use sui::coin::{Self, Coin};
    use sui::clock::Clock;
    use sui::transfer;
    use std::ascii::{Self, String};
    use bluefin_spot::config::GlobalConfig;
    use bluefin_spot::pool;
    use executor::token_factory::{Self, MANAGED_TOKEN};
    use sui::sui::SUI;

    const PROTOCOL_CONFIG_ID: address = @0x03db251ba509a8d5d8777b6338836082335d93eecbdd09a11e190a1cff51c352;

    /// Creates a token and immediately creates a liquidity pool for it
    #[allow(unused_variable)]
    public entry fun create_token_and_pool<CoinTypeB>(
        clock: &Clock,
        protocol_config: &mut GlobalConfig,
        initial_supply: u64,
        decimals: u8,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        icon_url: String,
        pool_icon_url: vector<u8>,
        coin_b: Coin<CoinTypeB>,
        coin_b_symbol: vector<u8>,
        coin_b_decimals: u8,
        tick_spacing: u32,
        fee_basis_points: u64,
        current_sqrt_price: u128,
        creation_fee: Coin<SUI>,
        amount: u64,
        ctx: &mut tx_context::TxContext,
    ) {
        // === Step 1: Create the Token using token_factory ===
        let (treasury_cap, metadata, initial_coins) = token_factory::create_token_internal(
            initial_supply,
            decimals,
            symbol,
            name,
            description,
            icon_url,
            ctx
        );

        // Convert coins to balances for pool creation
        let coin_a_balance = coin::into_balance(initial_coins);
        let coin_b_balance = coin::into_balance(coin_b);
        let creation_fee_balance = coin::into_balance(creation_fee);
        let lower_tick_bits: u32 = 2146983648;
        let upper_tick_bits: u32 = 2147983648;

        // === Step 2: Create the Pool with Initial Liquidity ===
        let (_pool_id, position, _min_a, _min_b, remaining_balance_a, remaining_balance_b) = 
            pool::create_pool_with_liquidity<MANAGED_TOKEN, CoinTypeB, SUI>(
                clock,
                protocol_config,
                name,                   // pool_name
                pool_icon_url,          // icon_url
                symbol,                 // coin_a_symbol
                decimals,               // coin_a_decimals
                icon_url.into_bytes(),  // coin_a_url
                coin_b_symbol,          // coin_b_symbol (from parameter)
                coin_b_decimals,        // coin_b_decimals (from parameter)
                vector::empty(),        // coin_b_url
                tick_spacing,
                fee_basis_points,
                current_sqrt_price,
                creation_fee_balance,
                lower_tick_bits,
                upper_tick_bits,
                coin_a_balance,
                coin_b_balance,
                amount,
                true,
                ctx
            );

        // Convert remaining balances back to coins
        let remaining_coins_a = coin::from_balance(remaining_balance_a, ctx);
        let remaining_coins_b = coin::from_balance(remaining_balance_b, ctx);

        // Transfer assets to the creator
        let creator = tx_context::sender(ctx);
        transfer::public_transfer(treasury_cap, creator);
        transfer::public_transfer(metadata, creator);
        transfer::public_transfer(remaining_coins_a, creator);
        transfer::public_transfer(remaining_coins_b, creator);
        transfer::public_transfer(position, creator);
    }
}


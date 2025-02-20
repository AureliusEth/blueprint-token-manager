#[test_only]
module executor::executor_tests {
    use sui::test_scenario::{Self as test, Scenario, next_tx, ctx};
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::object::ID;
    use sui::object;
    use std::ascii::{Self, String};
    use bluefin_spot::config::{Self, GlobalConfig};
    use executor::executor::{Self, create_token_and_pool};
    use executor::token_factory::{Self, MANAGED_TOKEN};

    const ADMIN: address = @0xAD;
    const USER: address = @0xB0B;

    fun test_setup(): Scenario {
        let mut scenario = test::begin(ADMIN);
        
        // Create and share clock
        next_tx(&mut scenario, ADMIN); {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            test::return_shared(clock);  // Share the clock object
        };
        
        // Create and share config
        next_tx(&mut scenario, ADMIN); {
            // Instead of create_for_testing, we need to use the actual initialization
            // This depends on how bluefin_spot::config is implemented
            // You might need to add a test-only initialization function there
            let config = test::take_shared<GlobalConfig>(&scenario);
            test::return_shared(config);
        };
        
        scenario
    }

    #[test]
    fun test_create_token_and_pool() {
        let mut scenario = test_setup();
        let test = &mut scenario;

        // Setup test values
        let initial_supply = 1000000;
        let decimals = 9;
        let symbol = b"TEST";
        let name = b"Test Token";
        let description = b"Test Description";
        let _icon_url = ascii::string(b"https://test.com/icon.png");
        let pool_icon_url = b"https://test.com/pool-icon.png";
        let tick_spacing = 1;
        let fee_basis_points = 30;
        let current_sqrt_price = 1000000;
        let amount = 1000;

        next_tx(test, USER); {
            let clock = test::take_shared<Clock>(test);
            let mut config = test::take_shared<GlobalConfig>(test);
            
            let coin_b = coin::mint_for_testing<SUI>(1000000, ctx(test));
            let creation_fee = coin::mint_for_testing<SUI>(1000, ctx(test));

            create_token_and_pool<SUI>(
                &clock,
                &mut config,
                initial_supply,
                decimals,
                symbol,
                name,
                description,
                ascii::string(b"https://test.com/icon.png"),
                pool_icon_url,
                coin_b,
                b"SUI",
                9,
                tick_spacing,
                fee_basis_points,
                current_sqrt_price,
                creation_fee,
                amount,
                ctx(test)
            );

            test::return_shared(clock);
            test::return_shared(config);
        };

        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 1)]
    fun test_create_token_and_pool_insufficient_balance() {
        let mut scenario = test_setup();
        let test = &mut scenario;

        next_tx(test, USER); 
        {
            let clock = test::take_shared<Clock>(test);
            let mut config = test::take_shared<GlobalConfig>(test);
            
            let coin_b = coin::mint_for_testing<SUI>(100, ctx(test));
            let creation_fee = coin::mint_for_testing<SUI>(10, ctx(test));

            create_token_and_pool<SUI>(
                &clock,
                &mut config,
                1000000,
                9,
                b"TEST",
                b"Test Token",
                b"Test Description",
                ascii::string(b"https://test.com/icon.png"),
                b"https://test.com/pool-icon.png",
                coin_b,
                b"SUI",
                9,
                1,
                30,
                1000000,
                creation_fee,
                1000,
                ctx(test)
            );

            test::return_shared(clock);
            test::return_shared(config);
        };

        test::end(scenario);
    }

    #[test]
    fun test_create_token_success() {
        let mut scenario = test::begin(ADMIN);
        let test = &mut scenario;

        // Test parameters
        let initial_supply = 1000000;
        let decimals = 6;
        let symbol = b"TEST";
        let name = b"Test Token";
        let description = b"Test Description";
        let icon_url = ascii::string(b"https://test.com/icon.png");

        next_tx(test, ADMIN); {
            token_factory::create_token(
                initial_supply,
                decimals,
                symbol,
                name,
                description,
                icon_url,
                ctx(test)
            );
        };

        // Verify token was created and transferred to ADMIN
        next_tx(test, ADMIN); {
            assert!(test::has_most_recent_for_address<TreasuryCap<MANAGED_TOKEN>>(ADMIN), 0);
        };

        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = token_factory::E_INVALID_DECIMALS)]
    fun test_create_token_invalid_decimals() {
        let mut scenario = test::begin(ADMIN);
        let test = &mut scenario;

        next_tx(test, ADMIN); {
            token_factory::create_token(
                1000000,
                19, // Invalid: more than 18 decimals
                b"TEST",
                b"Test Token",
                b"Test Description",
                ascii::string(b"https://test.com/icon.png"),
                ctx(test)
            );
        };

        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = token_factory::E_ZERO_SUPPLY)]
    fun test_create_token_zero_supply() {
        let mut scenario = test::begin(ADMIN);
        let test = &mut scenario;

        next_tx(test, ADMIN); {
            token_factory::create_token(
                0, // Invalid: zero supply
                6,
                b"TEST",
                b"Test Token",
                b"Test Description",
                ascii::string(b"https://test.com/icon.png"),
                ctx(test)
            );
        };

        test::end(scenario);
    }
} 
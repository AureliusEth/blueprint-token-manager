#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    let config = GlobalConfig {
        // Initialize with test values
    };
    transfer::share_object(config)
} 
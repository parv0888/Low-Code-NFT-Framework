use concordium_cis2::{OnReceivingCis2Params, Receiver};
use concordium_std::*;

use crate::{cis2_client::Cis2Client, error::*, events::AuctionEvent, state::*};

pub type ContractOnReceivingCis2Params =
    OnReceivingCis2Params<ContractTokenId, ContractTokenAmount>;

/// Type of the parameter to the `init` function
#[derive(Serialize, SchemaType)]
pub struct InitParameter {
    /// Time when auction ends using the RFC 3339 format (https://tools.ietf.org/html/rfc3339)
    pub end: Timestamp,
    /// Time when auction starts using the RFC 3339 format (https://tools.ietf.org/html/rfc3339)
    pub start: Timestamp,
    /// The minimum accepted raise to over bid the current bidder in Euro cent.
    pub minimum_raise: u64,
    /// Token needed to participate in the Auction.
    pub participation_token: Option<ParticipationTokenIdentifier>,
}

/// Init function that creates a new auction
#[init(
    contract = "auction",
    parameter = "InitParameter",
    event = "AuctionEvent"
)]
pub fn auction_init<S: HasStateApi>(
    ctx: &impl HasInitContext,
    state_builder: &mut StateBuilder<S>,
) -> InitResult<State<S>> {
    let parameter: InitParameter = ctx.parameter_cursor().get()?;
    Ok(State::new(parameter, state_builder))
}

#[receive(
    contract = "auction",
    name = "onReceivingCIS2",
    error = "ReceiveError",
    mutable,
    enable_logger
)]
fn auction_on_auction_cis2_received<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    logger: &mut impl HasLogger,
) -> Result<(), ReceiveError> {
    // Ensure the sender is a contract.
    let sender = if let Address::Contract(contract) = ctx.sender() {
        contract
    } else {
        bail!(ReceiveError::ContractOnly)
    };

    // Parse the parameter.
    let params: ContractOnReceivingCis2Params = ctx
        .parameter_cursor()
        .get()
        .map_err(|_| ReceiveError::ParseParams)?;

    let from_account = match params.from {
        Address::Account(a) => a,
        Address::Contract(_) => bail!(ReceiveError::OnlyAccount),
    };

    let token_identifier = AuctionTokenIdentifier::new(sender, params.token_id, params.amount);
    let state = host.state_mut();

    // If the token being sent is not the participation token
    // Start an auction from the sent token
    ensure!(from_account.eq(&ctx.owner()), ReceiveError::UnAuthorized);
    ensure_eq!(
        state.auction_state,
        AuctionState::NotInitialized,
        ReceiveError::AuctionAlreadyInitialized
    );
    state.auction_state = AuctionState::NotSoldYet(token_identifier);
    logger
        .log(&AuctionEvent::AuctionUpdated(
            crate::events::AuctionUpdatedEvent {
                auction_state: state.auction_state.clone(),
                highest_bidder: state.highest_bidder,
                minimum_raise: state.minimum_raise,
                end: state.end,
                start: state.start,
                participation_token: state.participation_token.clone(),
                highest_bid: host
                    .exchange_rates()
                    .convert_amount_to_euro_cent(host.self_balance()),
            },
        ))
        .map_err(|_| ReceiveError::LogError)?;

    Ok(())
}

#[receive(
    contract = "auction",
    name = "onReceivingParticipationCIS2",
    error = "ReceiveError",
    mutable,
    enable_logger
)]
fn auction_on_participation_cis2_received<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    logger: &mut impl HasLogger,
) -> Result<(), ReceiveError> {
    // Ensure the sender is a contract.
    let sender = if let Address::Contract(contract) = ctx.sender() {
        contract
    } else {
        bail!(ReceiveError::ContractOnly)
    };

    // Parse the parameter.
    let params: ContractOnReceivingCis2Params = ctx
        .parameter_cursor()
        .get()
        .map_err(|_| ReceiveError::ParseParams)?;

    let from_account = match params.from {
        Address::Account(a) => a,
        Address::Contract(_) => bail!(ReceiveError::OnlyAccount),
    };

    let token_identifier = ParticipationTokenIdentifier::new(sender, params.token_id);
    let state = host.state_mut();

    // If the token sent is a participation token
    // then add the sender as a participant
    if let Some(pt) = state.participation_token.clone() {
        if pt.token_eq(&token_identifier) {
            state.participants.insert(from_account);
            logger
                .log(&AuctionEvent::ParticipantAdded(from_account))
                .map_err(|_| ReceiveError::LogError)?;
            return Ok(());
        } else {
            // If the token sent is not the participation token
            bail!(ReceiveError::InvalidParticipationToken)
        }
    } else {
        // If the auction does not have a participation token
        bail!(ReceiveError::PublicAuction)
    }
}

/// Receive function for accounts to place a bid in the auction
#[receive(
    contract = "auction",
    name = "bid",
    payable,
    mutable,
    error = "BidError",
    enable_logger
)]
pub fn auction_bid<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    amount: Amount,
    logger: &mut impl HasLogger,
) -> Result<(), BidError> {
    let state = host.state();
    let sender = state.can_bid(&ctx.sender(), ctx.metadata().slot_time())?;

    // Balance of the contract
    let balance = host.self_balance();

    // Balance of the contract before the call
    let highest_bid_ccd = balance - amount;

    // Ensure that the new bid exceeds the highest bid so far
    ensure!(amount > highest_bid_ccd, BidError::BidBelowCurrentBid);

    // Calculate the difference between the previous bid and the new bid in CCD.
    let amount_difference = amount - highest_bid_ccd;
    // Get the current exchange rate used by the chain
    // Convert the CCD difference to EUR
    let euro_cent_difference = host
        .exchange_rates()
        .convert_amount_to_euro_cent(amount_difference);

    // Ensure that the bid is at least the `minimum_raise` more than the previous
    // bid
    ensure!(
        euro_cent_difference >= state.minimum_raise,
        BidError::BidBelowMinimumRaise
    );

    if let Some(address) = host.state_mut().highest_bidder.replace(sender) {
        // Refunding old highest bidder;
        // This transfer (given enough NRG of course) always succeeds because the
        // `account_address` exists since it was recorded when it placed a bid.
        // If an `account_address` exists, and the contract has the funds then the
        // transfer will always succeed.
        // Please consider using a pull-over-push pattern when expanding this smart
        // contract to allow smart contract instances to participate in the auction as
        // well. https://consensys.github.io/smart-contract-best-practices/attacks/denial-of-service/
        host.invoke_transfer(&address, highest_bid_ccd)
            .map_err(|_e| BidError::TransferError)?;
    }

    {
        let state = host.state();
        logger
            .log(&AuctionEvent::AuctionUpdated(
                crate::events::AuctionUpdatedEvent {
                    auction_state: state.auction_state.clone(),
                    highest_bidder: state.highest_bidder,
                    minimum_raise: state.minimum_raise,
                    end: state.end,
                    start: state.start,
                    participation_token: state.participation_token.clone(),
                    highest_bid: host
                        .exchange_rates()
                        .convert_amount_to_euro_cent(host.self_balance()),
                },
            ))
            .map_err(|_| BidError::LogError)?;
    }

    Ok(())
}

/// Receive function used to finalize the auction. It sends the highest bid (the
/// current balance of this smart contract) to the owner of the smart contract
/// instance.
#[receive(
    contract = "auction",
    name = "finalize",
    mutable,
    error = "FinalizeError",
    enable_logger
)]
pub fn auction_finalize<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &mut impl HasHost<State<S>, StateApiType = S>,
    logger: &mut impl HasLogger,
) -> Result<(), FinalizeError> {
    let state = host.state();
    let slot_time = ctx.metadata().slot_time();

    // Ensure the auction has not been finalized yet
    ensure!(state.auction_state.is_open(), FinalizeError::AuctionNotOpen);
    // Ensure the auction has ended already
    ensure!(slot_time > state.end, FinalizeError::AuctionStillActive);

    if let Some(account_address) = state.highest_bidder {
        if let AuctionState::NotSoldYet(token_identifier) = &state.auction_state {
            Cis2Client::transfer(
                host,
                token_identifier.token_id,
                token_identifier.contract,
                token_identifier.amount,
                Address::Contract(ctx.self_address()),
                Receiver::Account(account_address),
            )
            .map_err(|_| FinalizeError::Cis2TransferError)?
        }

        // Marking the highest bid (the last bidder) as winner of the auction
        host.state_mut().auction_state = AuctionState::Sold(account_address);
        let owner = ctx.owner();
        let balance = host.self_balance();
        // Sending the highest bid (the balance of this contract) to the owner of the
        // smart contract instance;
        // This transfer (given enough NRG of course) always succeeds because the
        // `owner` exists since it deployed the smart contract instance.
        // If an account exists, and the contract has the funds then the
        // transfer will always succeed.
        host.invoke_transfer(&owner, balance).unwrap_abort();
        let state = host.state();
        logger
            .log(&AuctionEvent::AuctionUpdated(
                crate::events::AuctionUpdatedEvent {
                    auction_state: state.auction_state.clone(),
                    highest_bidder: state.highest_bidder,
                    minimum_raise: state.minimum_raise,
                    end: state.end,
                    start: state.start,
                    participation_token: state.participation_token.clone(),
                    highest_bid: host
                        .exchange_rates()
                        .convert_amount_to_euro_cent(host.self_balance()),
                },
            ))
            .map_err(|_| FinalizeError::LogError)?;
    }
    Ok(())
}

#[receive(
    contract = "auction",
    name = "convertEuroCentToCcd",
    parameter = "u64",
    error = "GenericError",
    return_value = "Amount"
)]
pub fn auction_convert_euro_cent_to_ccd<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> Result<Amount, GenericError> {
    let euro_cent_amount: u64 = ctx
        .parameter_cursor()
        .get()
        .map_err(|_e| GenericError::ParseParams)?;

    let exchange_rates = host.exchange_rates();

    Ok(exchange_rates.convert_euro_cent_to_amount(euro_cent_amount))
}

#[receive(
    contract = "auction",
    name = "canBid",
    error = "CanBidError",
    return_value = "Amount"
)]
fn can_bid<S: HasStateApi>(
    ctx: &impl HasReceiveContext,
    host: &impl HasHost<State<S>, StateApiType = S>,
) -> Result<Amount, CanBidError> {
    let state = host.state();
    let slot_time = ctx.metadata().slot_time();
    let highest_bid_ccd = host.self_balance();
    let highest_bid_euro_cent = host
        .exchange_rates()
        .convert_amount_to_euro_cent(highest_bid_ccd);
    let next_bid_euro_cent = highest_bid_euro_cent + state.minimum_raise;
    let next_bid_ccd = host
        .exchange_rates()
        .convert_euro_cent_to_amount(next_bid_euro_cent);
    state.can_bid(&ctx.sender(), slot_time)?;

    Ok(next_bid_ccd)
}

#[concordium_cfg_test]
mod tests {
    use super::*;
    use concordium_cis2::{AdditionalData, TokenAmountU64, TokenIdU8};
    use core::fmt::Debug;
    use std::sync::atomic::{AtomicU8, Ordering};
    use test_infrastructure::*;

    // A counter for generating new accounts
    static ADDRESS_COUNTER: AtomicU8 = AtomicU8::new(0);
    const AUCTION_START: u64 = 1;
    const AUCTION_END: u64 = 10;
    const OWNER_ACCOUNT: AccountAddress = AccountAddress([
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 1,
    ]);
    const PARTICIPATION_TOKEN: ParticipationTokenIdentifier = ParticipationTokenIdentifier {
        contract: ContractAddress {
            index: 1,
            subindex: 0,
        },
        token_id: TokenIdU8(1),
    };

    fn expect_error<E, T>(expr: Result<T, E>, err: E, msg: &str)
    where
        E: Eq + Debug,
        T: Debug,
    {
        let actual = expr.expect_err_report(msg);
        unsafe {
            claim_eq!(actual, err);
        }
    }

    fn item_end_parameter() -> InitParameter {
        InitParameter {
            start: Timestamp::from_timestamp_millis(AUCTION_START),
            end: Timestamp::from_timestamp_millis(AUCTION_END),
            minimum_raise: 100,
            participation_token: Some(PARTICIPATION_TOKEN),
        }
    }

    fn create_parameter_bytes(parameter: &InitParameter) -> Vec<u8> {
        to_bytes(parameter)
    }

    fn parametrized_init_ctx(parameter_bytes: &[u8]) -> TestInitContext {
        let mut ctx = TestInitContext::empty();
        ctx.set_parameter(parameter_bytes);
        ctx
    }

    fn new_account() -> AccountAddress {
        let account = AccountAddress([ADDRESS_COUNTER.load(Ordering::SeqCst); 32]);
        ADDRESS_COUNTER.fetch_add(1, Ordering::SeqCst);
        account
    }

    fn new_account_ctx<'a>() -> (AccountAddress, TestReceiveContext<'a>) {
        let account = new_account();
        let ctx = new_ctx(account, Address::Account(account), AUCTION_END);

        (account, ctx)
    }

    fn new_ctx<'a>(
        owner: AccountAddress,
        sender: Address,
        slot_time: u64,
    ) -> TestReceiveContext<'a> {
        let mut ctx = TestReceiveContext::empty();
        ctx.set_sender(sender);
        ctx.set_owner(owner);
        ctx.set_metadata_slot_time(Timestamp::from_timestamp_millis(slot_time));
        ctx
    }

    fn bid(
        host: &mut TestHost<State<TestStateApi>>,
        ctx: &TestContext<TestReceiveOnlyData>,
        logger: &mut TestLogger,
        amount: Amount,
        current_smart_contract_balance: Amount,
    ) {
        // Setting the contract balance.
        // This should be the sum of the contract’s initial balance and
        // the amount you wish to invoke it with when using the TestHost.
        // https://docs.rs/concordium-std/latest/concordium_std/test_infrastructure/struct.TestHost.html#method.set_self_balance
        // This is because the `self_balance` function on-chain behaves as follows:
        // https://docs.rs/concordium-std/latest/concordium_std/trait.HasHost.html#tymethod.self_balance
        host.set_self_balance(amount + current_smart_contract_balance);

        // Invoking the bid function.
        auction_bid(ctx, host, amount, logger).expect_report("Bidding should pass.");
    }

    fn initialize_auction(host: &mut TestHost<State<TestStateApi>>, logger: &mut TestLogger) {
        let sender = Address::Contract(PARTICIPATION_TOKEN.contract);
        let mut ctx = new_ctx(OWNER_ACCOUNT, sender, 0);
        let params = ContractOnReceivingCis2Params {
            amount: TokenAmountU64::from(1),
            data: AdditionalData::empty(),
            from: Address::Account(OWNER_ACCOUNT),
            token_id: TokenIdU8(2),
        };
        let param_bytes = to_bytes(&params);
        ctx.set_parameter(&param_bytes);

        auction_on_auction_cis2_received(&ctx, host, logger)
            .expect("should add a token for Auction");
    }

    fn add_auction_participant(
        host: &mut TestHost<State<TestStateApi>>,
        participant: Address,
        logger: &mut TestLogger,
    ) {
        let sender = Address::Contract(PARTICIPATION_TOKEN.contract);
        let mut ctx = new_ctx(OWNER_ACCOUNT, sender, 0);
        let params = ContractOnReceivingCis2Params {
            amount: TokenAmountU64::from(1),
            data: AdditionalData::empty(),
            from: participant,
            token_id: PARTICIPATION_TOKEN.token_id,
        };
        let param_bytes = to_bytes(&params);
        ctx.set_parameter(&param_bytes);

        auction_on_participation_cis2_received(&ctx, host, logger)
            .expect("should add a participant");
    }

    #[concordium_test]
    /// Test that the smart-contract initialization sets the state correctly
    /// (no bids, active state, indicated auction-end time and item name).
    fn test_init() {
        let parameter_bytes = create_parameter_bytes(&item_end_parameter());
        let ctx = parametrized_init_ctx(&parameter_bytes);

        let mut state_builder = TestStateBuilder::new();

        let state_result = auction_init(&ctx, &mut state_builder);
        state_result.expect_report("Contract initialization results in error");
    }

    #[concordium_test]
    /// Test a sequence of bids and finalizations:
    /// 0. Auction is initialized.
    /// 1. Alice successfully bids 0.1 CCD.
    /// 2. Alice successfully bids 0.2 CCD, highest
    /// bid becomes 0.2 CCD. Alice gets her 0.1 CCD refunded.
    /// 3. Bob successfully bids 0.3 CCD, highest
    /// bid becomes 0.3 CCD. Alice gets her 0.2 CCD refunded.
    /// 4. Someone tries to finalize the auction before
    /// its end time. Attempt fails.
    /// 5. Dave successfully finalizes the auction after its end time.
    /// Carol (the owner of the contract) collects the highest bid amount.
    /// 6. Attempts to subsequently bid or finalize fail.
    fn test_auction_bid_and_finalize() {
        let parameter_bytes = create_parameter_bytes(&item_end_parameter());
        let ctx0 = parametrized_init_ctx(&parameter_bytes);

        let amount = Amount::from_micro_ccd(100);
        let winning_amount = Amount::from_micro_ccd(300);
        let big_amount = Amount::from_micro_ccd(500);

        let mut state_builder = TestStateBuilder::new();

        // Initializing auction
        let initial_state =
            auction_init(&ctx0, &mut state_builder).expect("Initialization should pass");

        let mut host = TestHost::new(initial_state, state_builder);
        let mut logger = TestLogger::init();

        host.set_exchange_rates(ExchangeRates {
            euro_per_energy: ExchangeRate::new_unchecked(1, 1),
            micro_ccd_per_euro: ExchangeRate::new_unchecked(1, 1),
        });

        initialize_auction(&mut host, &mut logger);

        // 1st bid: Alice bids `amount`.
        // The current_smart_contract_balance before the invoke is 0.
        let (alice, alice_ctx) = new_account_ctx();
        add_auction_participant(&mut host, alice_ctx.sender(), &mut logger);
        bid(
            &mut host,
            &alice_ctx,
            &mut logger,
            amount,
            Amount::from_micro_ccd(0),
        );

        // 2nd bid: Alice bids `amount + amount`.
        // Alice gets her initial bid refunded.
        // The current_smart_contract_balance before the invoke is amount.
        bid(&mut host, &alice_ctx, &mut logger, amount + amount, amount);

        // 3rd bid: Bob bids `winning_amount`.
        // Alice gets refunded.
        // The current_smart_contract_balance before the invoke is amount + amount.
        let (bob, bob_ctx) = new_account_ctx();
        add_auction_participant(&mut host, bob_ctx.sender(), &mut logger);
        bid(
            &mut host,
            &bob_ctx,
            &mut logger,
            winning_amount,
            amount + amount,
        );

        // Trying to finalize auction that is still active
        // (specifically, the tx is submitted at the last moment,
        // at the AUCTION_END time)
        let mut ctx4 = TestReceiveContext::empty();
        ctx4.set_metadata_slot_time(Timestamp::from_timestamp_millis(AUCTION_END));
        ctx4.set_self_address(ContractAddress {
            index: 1,
            subindex: 0,
        });
        let fin_res = auction_finalize(&ctx4, &mut host, &mut logger);
        expect_error(
            fin_res,
            FinalizeError::AuctionStillActive,
            "Finalizing the auction should fail when it's before auction end time",
        );

        // Finalizing auction
        let carol = new_account();
        let dave = new_account();
        let mut ctx5 = new_ctx(carol, Address::Account(dave), AUCTION_END + 1);
        ctx5.set_self_address(ContractAddress {
            index: 1,
            subindex: 0,
        });
        host.setup_mock_entrypoint(
            ContractAddress {
                index: 1,
                subindex: 0,
            },
            OwnedEntrypointName::new_unchecked("transfer".into()),
            MockFn::returning_ok(()),
        );
        let fin_res2 = auction_finalize(&ctx5, &mut host, &mut logger);
        fin_res2.expect_report("Finalizing the auction should work");
        let transfers = host.get_transfers();
        // The input arguments of all executed `host.invoke_transfer`
        // functions are checked here.
        unsafe {
            claim_eq!(
                &transfers[..],
                &[
                    (alice, amount),
                    (alice, amount + amount),
                    (carol, winning_amount),
                ],
                "Transferring CCD to Alice/Carol should work"
            );
            claim_eq!(
                host.state().auction_state,
                AuctionState::Sold(bob),
                "Finalizing the auction should change the auction state to `Sold(bob)`"
            );
            claim_eq!(
                host.state().highest_bidder,
                Some(bob),
                "Finalizing the auction should mark bob as highest bidder"
            );
        }

        // Attempting to finalize auction again should fail.
        let fin_res3 = auction_finalize(&ctx5, &mut host, &mut logger);
        expect_error(
            fin_res3,
            FinalizeError::AuctionNotOpen,
            "Finalizing the auction a second time should fail",
        );

        // Attempting to bid again should fail.
        let res4 = auction_bid(&bob_ctx, &mut host, big_amount, &mut logger);
        expect_error(
            res4,
            BidError::AuctionNotOpen,
            "Bidding should fail because the auction is finalized",
        );
    }

    #[concordium_test]
    /// Bids for amounts lower or equal to the highest bid should be rejected.
    fn test_auction_bid_repeated_bid() {
        let ctx1 = new_account_ctx().1;
        let ctx2 = new_account_ctx().1;

        let parameter_bytes = create_parameter_bytes(&item_end_parameter());
        let ctx0 = parametrized_init_ctx(&parameter_bytes);

        let amount = Amount::from_micro_ccd(100);

        let mut state_builder = TestStateBuilder::new();

        // Initializing auction
        let initial_state =
            auction_init(&ctx0, &mut state_builder).expect("Initialization should succeed.");

        let mut host = TestHost::new(initial_state, state_builder);
        let mut logger = TestLogger::init();

        host.set_exchange_rates(ExchangeRates {
            euro_per_energy: ExchangeRate::new_unchecked(1, 1),
            micro_ccd_per_euro: ExchangeRate::new_unchecked(1, 1),
        });

        initialize_auction(&mut host, &mut logger);
        add_auction_participant(&mut host, ctx1.sender(), &mut logger);
        add_auction_participant(&mut host, ctx2.sender(), &mut logger);

        // 1st bid: Account1 bids `amount`.
        // The current_smart_contract_balance before the invoke is 0.
        bid(
            &mut host,
            &ctx1,
            &mut logger,
            amount,
            Amount::from_micro_ccd(0),
        );

        // Setting the contract balance.
        // This should be the sum of the contract’s initial balance and
        // the amount you wish to invoke it with when using the TestHost.
        // The current_smart_contract_balance before the invoke is `amount`.
        // The balance we wish to invoke the next function with is `amount` as well.
        // https://docs.rs/concordium-std/latest/concordium_std/test_infrastructure/struct.TestHost.html#method.set_self_balance
        // This is because the `self_balance` function on-chain behaves as follows:
        // https://docs.rs/concordium-std/latest/concordium_std/trait.HasHost.html#tymethod.self_balance
        host.set_self_balance(amount + amount);

        // 2nd bid: Account2 bids `amount` (should fail
        // because amount is equal to highest bid).
        let res2 = auction_bid(&ctx2, &mut host, amount, &mut logger);
        expect_error(
            res2,
            BidError::BidBelowCurrentBid,
            "Bidding 2 should fail because bid amount must be higher than highest bid",
        );
    }

    #[concordium_test]
    /// Bids for 0 CCD should be rejected.
    fn test_auction_bid_zero() {
        let mut state_builder = TestStateBuilder::new();

        // initializing auction
        let parameter_bytes = create_parameter_bytes(&item_end_parameter());
        let ctx = parametrized_init_ctx(&parameter_bytes);
        let initial_state =
            auction_init(&ctx, &mut state_builder).expect("Initialization should succeed.");

        let mut host = TestHost::new(initial_state, state_builder);
        host.set_exchange_rates(ExchangeRates {
            euro_per_energy: ExchangeRate::new_unchecked(1, 1),
            micro_ccd_per_euro: ExchangeRate::new_unchecked(1, 1),
        });
        let mut logger = TestLogger::init();

        initialize_auction(&mut host, &mut logger);
        let ctx1 = new_account_ctx().1;
        add_auction_participant(&mut host, ctx1.sender(), &mut logger);

        let res = auction_bid(&ctx1, &mut host, Amount::zero(), &mut logger);
        expect_error(
            res,
            BidError::BidBelowCurrentBid,
            "Bidding zero should fail",
        );
    }
}

use concordium_std::*;

use crate::state::CanBidErrorResponse;

/// `bid` function errors
#[derive(Debug, PartialEq, Eq, Clone, Reject, Serial, SchemaType)]
pub enum BidError {
    /// Raised when a contract tries to bid; Only accounts
    /// are allowed to bid.
    OnlyAccount,
    /// Raised when new bid amount is lower than current highest bid.
    BidBelowCurrentBid,
    /// Raised when a new bid amount is raising the current highest bid
    /// with less than the minimum raise.
    BidBelowMinimumRaise,
    /// Raised when bid is placed after auction end time.
    BidTooLate,
    /// Raised when bid is placed before auction start time.
    BidTooEarly,
    /// Raised when bid is placed after auction has been finalized.
    AuctionNotOpen,
    NotAParticipant,
    LogError,
    /// Raised when the previous balance could not be transferred back
    TransferError,
}

impl From<CanBidError> for BidError {
    fn from(error: CanBidError) -> Self {
        match error {
            CanBidError::NoNotOpen => BidError::AuctionNotOpen,
            CanBidError::NoNotStarted => BidError::BidTooEarly,
            CanBidError::NoEnded => BidError::BidTooLate,
            CanBidError::NoNotAParticipant => BidError::NotAParticipant,
            CanBidError::NoContractAddress => BidError::OnlyAccount,
        }
    }
}

/// `finalize` function errors
#[derive(Debug, PartialEq, Eq, Clone, Reject, Serial, SchemaType)]
pub enum FinalizeError {
    /// Raised when finalizing an auction before auction end time passed
    AuctionStillActive,
    /// Raised when finalizing an auction that is already finalized
    AuctionNotOpen,
    Cis2TransferError,
    LogError,
}

#[derive(Debug, PartialEq, Eq, Clone, Reject, Serial, SchemaType)]
pub enum ReceiveError {
    ParseParams,
    ContractOnly,
    OnlyAccount,
    UnAuthorized,
    AuctionAlreadyInitialized,
    LogError,
    InvalidParticipationToken,
    PublicAuction,
}

#[derive(Debug, PartialEq, Eq, Clone, Reject, Serial, SchemaType)]
pub enum GenericError {
    ParseParams,
}

#[derive(Debug, PartialEq, Eq, Clone, Reject, Serial, SchemaType)]
pub enum CanBidError {
    NoNotOpen,
    NoNotStarted,
    NoEnded,
    NoNotAParticipant,
    NoContractAddress,
}

impl From<CanBidErrorResponse> for CanBidError {
    fn from(response: CanBidErrorResponse) -> Self {
        match response {
            CanBidErrorResponse::NoNotOpen => CanBidError::NoNotOpen,
            CanBidErrorResponse::NoNotStarted => CanBidError::NoNotStarted,
            CanBidErrorResponse::NoEnded => CanBidError::NoEnded,
            CanBidErrorResponse::NoNotAParticipant => CanBidError::NoNotAParticipant,
            CanBidErrorResponse::NoContractAddress => CanBidError::NoContractAddress,
        }
    }
}

export interface Auction {
	type: string;
	start: number;
	end: number;
	highest_bid: number;
	minimum_raise: number;
	auction_state: AuctionState;
	highest_bidder?: string;
	address: { index: string; subindex: string };
	participation_token?: {
		contract: Contract
		token_id: string;
	}
}

export interface AuctionState {
	name: string;
	amount: string;
	token_id: string;
	contract: Contract;
}

export interface Contract {
	index: number;
	subindex: number;
}

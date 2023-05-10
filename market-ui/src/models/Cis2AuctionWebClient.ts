import { Auction } from "./AuctionTypes";
import { WEB_AUCTIONS_ENDED_LIST_URL, WEB_AUCTIONS_LIVE_LIST_URL } from "../Constants";

export enum CanParticipateResponseReason {
	Public,
	PrivateParticipant,
	PrivateNonParticipant,
}

/**
 * Lists all auctions that are currently live.
 * @returns List of live auctions.
 */
export async function list(): Promise<Auction[]> {
	const res = await fetch(WEB_AUCTIONS_LIVE_LIST_URL);

	return res.json();
}

export async function ended(account: string): Promise<Auction[]> {
	const res = await fetch(WEB_AUCTIONS_ENDED_LIST_URL.replace(":account", account));

	return res.json();
}

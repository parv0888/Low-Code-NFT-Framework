import { Auction } from "./AuctionTypes";
import { WEB_AUCTIONS_LIVE_LIST_URL } from "../Constants";

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

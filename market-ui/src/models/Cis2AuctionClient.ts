import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { AccountAddress, ContractAddress, deserializeReceiveReturnValue } from "@concordium/web-sdk";

import { invokeContract, toCcd, updateContract } from "./ConcordiumContractClient";
import { AUCTION_CONTRACT_INFO } from "../Constants";

export const canBid = async (
	provider: WalletApi,
	contractAddress: ContractAddress,
	account: string
): Promise<bigint> => {
	try {
		const res = await invokeContract(
			provider,
			AUCTION_CONTRACT_INFO,
			contractAddress,
			"canBid",
			null,
			new AccountAddress(account)
		);
		let ret = deserializeReceiveReturnValue(
			res,
			AUCTION_CONTRACT_INFO.schemaBuffer,
			AUCTION_CONTRACT_INFO.contractName,
			"canBid"
		);
		return ret;
	} catch (err) {
		throw err;
	}
};

export const bid = async (
	provider: WalletApi,
	account: string,
	auctionContractAddress: ContractAddress,
	amountCcd: bigint
) => {
	try {
		await updateContract(
			provider,
			AUCTION_CONTRACT_INFO,
			undefined,
			account,
			auctionContractAddress,
			"bid",
			BigInt(9999),
			amountCcd
		);
	} catch (err: any) {
		if (err.cause && err.cause.length) {
			switch (err?.cause[0]?.rejectReason) {
				case -1:
					throw new Error("Only Accounts Can Bid");
				case -2:
					throw new Error("Bid Below Current Bid");
				case -3:
					throw new Error("Bid Below Minimum Raise");
				case -4:
					throw new Error("Bid Too Late");
				case -5:
					throw new Error("Bid Too Early");
				case -6:
					throw new Error("Auction Not Open");
				case -7:
					throw new Error("Not a Participant");
				case -8:
					throw new Error("Logging error");
				case -9:
					throw new Error("Last Bid amount Transfer Error");
			};
		}
		
		throw err;
	}
};

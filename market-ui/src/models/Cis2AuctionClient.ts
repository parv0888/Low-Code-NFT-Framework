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
		console.log(ret);
		return ret;
	} catch (err) {
		console.log(err);
		throw err;
	}
};

export const bid = async (
	provider: WalletApi,
	account: string,
	auctionContractAddress: ContractAddress,
	amountMicroCcd: bigint
) => {
	// bid amount is added with 1 ccd to increase the default value
	const amountCcd = toCcd(amountMicroCcd) + BigInt(1);

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
};

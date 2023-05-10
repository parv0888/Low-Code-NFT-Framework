import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { ContractAddress } from "@concordium/web-sdk";

import MarketplaceTokensList from "../components/MarketplaceTokensList";
import { Cis2ContractInfo } from "../models/ConcordiumContractClient";

function BuyPage(props: {
	provider: WalletApi;
	marketContractAddress: ContractAddress;
	contractInfo: Cis2ContractInfo;
	account: string;
}) {
	return (
		<MarketplaceTokensList
			provider={props.provider as WalletApi}
			marketContractAddress={props.marketContractAddress}
			account={props.account}
			contractInfo={props.contractInfo}
		/>
	);
}

export default BuyPage;

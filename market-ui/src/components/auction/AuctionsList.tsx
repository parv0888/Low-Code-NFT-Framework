import { useState, useEffect } from "react";
import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import ImageList from "@mui/material/ImageList";
import Container from "@mui/material/Container";
import { Cis2ContractInfo, ContractInfo } from "../../models/ConcordiumContractClient";
import { Auction } from "../../models/AuctionTypes";
import { list } from "../../models/Cis2AuctionWebClient";
import Cis2AuctionsListItem from "./Cis2AuctionsListItem";
import Cis2AuctionBidDialog from "./Cis2AuctionBidDialog";

/**
 * Gets the List of buyable tokens from Marketplace contract and displays them.
 */
export default function AuctionsList(props: {
	cis2ContractInfo: Cis2ContractInfo;
	provider: WalletApi;
	contractInfo: ContractInfo;
	account: string;
}) {
	let [state, setState] = useState<{
		selected?: Auction;
		auctions: Auction[];
	}>({ auctions: [] });

	useEffect(() => {
		list().then((auctions) => setState({ ...state, auctions }));
	}, [props.account]);

	const setSelected = (auction?: Auction) => setState({ ...state, selected: auction });

	return (
		<Container maxWidth={"md"}>
			<ImageList key="nft-image-list" cols={3}>
				{state.auctions.map((t) => (
					<Cis2AuctionsListItem
						provider={props.provider}
						account={props.account}
						contractInfo={props.contractInfo}
						item={t}
						key={t.address.index}
						onBidClicked={setSelected}
						auctionTokenContractInfo={props.cis2ContractInfo}
					/>
				))}
			</ImageList>
			{state.selected && (
				<Cis2AuctionBidDialog
					participationContractInfo={props.cis2ContractInfo}
					provider={props.provider}
					account={props.account}
					auction={state.selected!}
					isOpen={true}
					onClose={() => setSelected(undefined)}
				/>
			)}
		</Container>
	);
}

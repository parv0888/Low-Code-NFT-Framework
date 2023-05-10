import { useState, useEffect } from "react";
import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import ImageList from "@mui/material/ImageList";
import { Cis2ContractInfo, ContractInfo } from "../../models/ConcordiumContractClient";
import { Auction } from "../../models/AuctionTypes";
import { list } from "../../models/Cis2AuctionWebClient";
import Cis2AuctionsListItem from "./Cis2AuctionsListItem";
import Cis2AuctionBidDialog from "./Cis2AuctionBidDialog";
import { Typography } from "@mui/material";

/**
 * Gets the List of buyable tokens from Marketplace contract and displays them.
 */
export default function LiveAuctionsList(props: {
	provider: WalletApi;
	cis2ContractInfo: Cis2ContractInfo;
	contractInfo: ContractInfo;
	account: string;
}) {
	let [refresh, setRefresh] = useState({ refresh: 0 });
	let [selected, setSelected] = useState<Auction>();
	let [auctions, setAuctions] = useState<Auction[]>([]);

	useEffect(() => {
		list().then((auctions) => setAuctions(auctions));
	}, [props.account, refresh.refresh]);

	const handleClose = () => {
		setRefresh({ refresh: refresh.refresh + 1 });
		setSelected(undefined);
		console.log(refresh);
	};

	return (
		<>
			{auctions.length === 0 && (
				<Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
					No live auctions
				</Typography>
			)}
			<ImageList key="nft-image-list" cols={3}>
				{auctions.map((auction) => (
					<Cis2AuctionsListItem
						provider={props.provider}
						account={props.account}
						contractInfo={props.contractInfo}
						item={auction}
						key={auction.address.index}
						onBidClicked={setSelected}
						auctionTokenContractInfo={props.cis2ContractInfo}
					/>
				))}
			</ImageList>
			{selected && (
				<Cis2AuctionBidDialog
					participationContractInfo={props.cis2ContractInfo}
					tokenContractInfo={props.cis2ContractInfo}
					provider={props.provider}
					account={props.account}
					auction={selected!}
					isOpen={true}
					onClose={handleClose}
				/>
			)}
		</>
	);
}

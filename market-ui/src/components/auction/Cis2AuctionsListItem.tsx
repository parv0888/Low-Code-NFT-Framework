import { useEffect, useState } from "react";
import ImageListItem from "@mui/material/ImageListItem";
import ImageListItemBar from "@mui/material/ImageListItemBar";
import IconButton from "@mui/material/IconButton";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CheckIcon from "@mui/icons-material/Check";
import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { Typography } from "@mui/material";

import { Auction } from "../../models/AuctionTypes";
import { Cis2ContractInfo, ContractInfo } from "../../models/ConcordiumContractClient";
import { Metadata } from "../../models/Cis2Types";
import { fetchJson, toLocalStorageKey } from "../../models/Utils";
import { getTokenMetadata } from "../../models/Cis2Client";
import Cis2MetadataImageLazy from "../Cis2MetadataImageLazy";
import moment from "moment";

/**
 * Displays a single token from the list of all the tokens listed on Marketplace.
 */
export default function Cis2AuctionsListItem(props: {
	item: Auction;
	provider: WalletApi;
	account: string;
	contractInfo: ContractInfo;
	auctionTokenContractInfo: Cis2ContractInfo;
	onBidClicked: (token: Auction) => void;
}) {
	const { item, provider, account } = props;

	let [metadata, setMetadata] = useState<Metadata>();
	let [loading, setLoading] = useState(true);
	let [price, setPrice] = useState(item.highest_bid + item.minimum_raise);

	useEffect(() => {
		setPrice(item.highest_bid + item.minimum_raise);
	}, [item]);

	useEffect(() => {
		let setStateMetadata = (metadata: Metadata) => {
			setLoading(false);
			setMetadata(metadata);
		};

		let metadataJson = localStorage.getItem(
			toLocalStorageKey(item.auction_state.token_id, item.auction_state.contract)
		);
		if (metadataJson) {
			setStateMetadata(JSON.parse(metadataJson));
		} else {
			getTokenMetadata(
				provider,
				account,
				props.auctionTokenContractInfo,
				{
					index: BigInt(item.auction_state.contract.index),
					subindex: BigInt(item.auction_state.contract.subindex),
				},
				item.auction_state.token_id
			)
				.then((m) => fetchJson<Metadata>(m.url))
				.then((metadata) => {
					setStateMetadata(metadata);
				});
		}
	}, [item]);

	return (
		<ImageListItem key={item.auction_state.contract.index + "/" + item.auction_state.token_id}>
			<Cis2MetadataImageLazy
				provider={props.provider}
				account={props.account}
				contractInfo={props.auctionTokenContractInfo}
				contractAddress={{
					index: BigInt(item.auction_state.contract.index),
					subindex: BigInt(item.auction_state.contract.subindex),
				}}
				tokenId={item.auction_state.token_id}
			/>
			<ImageListItemBar
				title={`Price: ${price} Euro Cent`}
				position="below"
				subtitle={
					<>
						<Typography variant="caption" component={"div"}>
							{metadata?.name}
						</Typography>
						<Typography variant="caption" component={"div"}>
							{metadata?.description}
						</Typography>
						<Typography variant="caption" component={"div"}>
							Index : {item.auction_state.contract.index.toString()} / {item.auction_state.contract.subindex.toString()}
						</Typography>
						{item.highest_bidder && (
							<Typography variant="caption" component={"div"} title={item.highest_bidder}>
								Bidder : {item.highest_bidder?.slice(0, 5)}...
							</Typography>
						)}
						<Typography variant="caption" component={"div"} title={moment(props.item.end, "X").format()}>
							Ends: {moment(props.item.end, "X").fromNow()}
						</Typography>
					</>
				}
				actionIcon={
					<IconButton
						sx={{ height: "100%" }}
						aria-label={`buy ${item.auction_state.token_id}`}
						onClick={() => props.onBidClicked(item)}>
						{item.highest_bidder === props.account ? <CheckIcon /> : <ShoppingCartIcon />}
					</IconButton>
				}
			/>
		</ImageListItem>
	);
}

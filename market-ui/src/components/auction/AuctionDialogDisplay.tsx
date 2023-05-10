import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { ContractAddress } from "@concordium/web-sdk";
import { Card, CardContent, Typography, CardMedia, Stack } from "@mui/material";
import { Cis2ContractInfo, toContractAddress } from "../../models/ConcordiumContractClient";
import Cis2MetadataImageLazy from "../Cis2MetadataImageLazy";
import { Auction } from "../../models/AuctionTypes";

export default function AuctionDialogDisplay(props: {
    auction: Auction;
    account: string;
    provider: WalletApi;
    tokenContractInfo: Cis2ContractInfo;
    participationContractInfo: Cis2ContractInfo;
}) {
	const CIS2Display = (props: {
		title: string;
		account: string;
		contract: ContractAddress;
		tokenId: string;
		tokenContractInfo: Cis2ContractInfo;
		provider: WalletApi;
	}) => {
		return (
			<Card variant="outlined">
				<CardContent>
					<Typography variant="body2" textAlign={"center"}>
						{props.title}
					</Typography>
                    <CardMedia sx={{maxWidth: '25em'}}>
						<Cis2MetadataImageLazy
							account={props.account}
							contractAddress={props.contract}
							contractInfo={props.tokenContractInfo}
							tokenId={props.tokenId}
							provider={props.provider}
						/>
					</CardMedia>

					<Typography textAlign={"center"} variant="body2">
						{props.contract.index.toString()} / {props.contract.subindex.toString()}
					</Typography>
					<Typography textAlign={"center"} variant="body2">
						Token Id : {props.tokenId}
					</Typography>
				</CardContent>
			</Card>
		);
	};

	return (
		<Stack spacing={2} sx={{ width: "100%" }} direction={"row"} justifyContent="center" alignItems="normal">
			<Card variant="outlined">
				<CardContent>
					<Typography variant="body2" textAlign={"center"}>
						{" "}
						Auction Contract{" "}
					</Typography>
					<Typography textAlign={"center"}>
						{props.auction.address.index} / {props.auction.address.subindex}
					</Typography>
				</CardContent>
			</Card>
			<CIS2Display
				title="Auction Token"
				account={props.account}
				tokenContractInfo={props.tokenContractInfo}
				provider={props.provider}
				contract={toContractAddress(props.auction.auction_state.contract)}
				tokenId={props.auction.auction_state.token_id}
			/>
			{props.auction.participation_token && (
				<CIS2Display
					title="Participation Token"
					account={props.account}
					tokenContractInfo={props.participationContractInfo}
					provider={props.provider}
					contract={toContractAddress(props.auction.participation_token!.contract)}
					tokenId={props.auction.participation_token!.token_id}
				/>
			)}
		</Stack>
	);
}

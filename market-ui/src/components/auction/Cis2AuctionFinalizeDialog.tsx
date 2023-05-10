import { useState } from "react";

import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { ContractAddress } from "@concordium/web-sdk";
import { Button, Dialog, DialogTitle, Grid, Paper, Typography } from "@mui/material";
import { Container } from "@mui/system";

import { Auction } from "../../models/AuctionTypes";
import { finalize } from "../../models/Cis2AuctionClient";
import { Cis2ContractInfo, toContractAddress } from "../../models/ConcordiumContractClient";
import Cis2MetadataImageLazy from "../Cis2MetadataImageLazy";
import DisplayError from "../ui/DisplayError";
import AuctionDialogDisplay from "./AuctionDialogDisplay";

export default function Cis2AuctionFinalizeDialog(props: {
	tokenContractInfo: Cis2ContractInfo;
	participationContractInfo: Cis2ContractInfo;
	isOpen: boolean;
	auction: Auction;
	provider: WalletApi;
	account: string;
	onClose: () => void;
}) {
	const [open, setOpen] = useState(props.isOpen);
	const [isInProgress, setIsInProgress] = useState(false);
	const [error, setError] = useState("");

	const finalizeAuction = async () => {
		setIsInProgress(true);
		try {
			await finalize(props.provider, props.account, toContractAddress(props.auction.address));
			setIsInProgress(false);
			handleClose();
		} catch (e: any) {
			setIsInProgress(false);
			setError(e.message);
		}
	};

	const handleClose = () => {
		setOpen(false);
		props.onClose();
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
			<DialogTitle>Finalize Token: {props.auction.auction_state.token_id}</DialogTitle>
			<Container sx={{ maxWidth: "xl", pt: "10px" }}>
				<Paper sx={{ padding: "20px" }} variant="outlined">
					<Grid container>
						<Grid item xs={12}>
							<AuctionDialogDisplay
								auction={props.auction}
								account={props.account}
								provider={props.provider}
								tokenContractInfo={props.tokenContractInfo}
								participationContractInfo={props.participationContractInfo}
							/>
						</Grid>
					</Grid>
				</Paper>
				<DisplayError error={error} />
				<Button onClick={finalizeAuction} fullWidth disabled={isInProgress}>
					Finalize
				</Button>
			</Container>
		</Dialog>
	);
}

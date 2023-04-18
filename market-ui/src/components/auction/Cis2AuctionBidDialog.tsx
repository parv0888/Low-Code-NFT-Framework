import { useState } from "react";
import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { Dialog, DialogTitle, Grid, IconButton, Paper, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { Container } from "@mui/system";
import { ArrowBackRounded } from "@mui/icons-material";

import { Auction } from "../../models/AuctionTypes";
import Cis2AuctionCheckCanBid from "./Cis2AuctionCheckCanBid";
import { Cis2ContractInfo, toContractAddress } from "../../models/ConcordiumContractClient";
import Cis2AuctionBid from "./Cis2AuctionBid";

enum Steps {
	CheckCanBid,
	Participate,
	Bid,
}

type StepType = { step: Steps; title: string };

export default function Cis2AuctionBidDialog(props: {
	participationContractInfo: Cis2ContractInfo;
	isOpen: boolean;
	auction: Auction;
	provider: WalletApi;
	account: string;
	onClose: () => void;
}) {
	const steps: StepType[] = [
		{ step: Steps.CheckCanBid, title: "Can Bid?" },
		{ step: Steps.Bid, title: "Bid" },
	];
	const [activeStep, setActiveStep] = useState(steps[0]);
	const [open, setOpen] = useState(props.isOpen);
	const [state, setState] = useState({
		amount: BigInt(0),
	});
	const handleClose = () => {
		setOpen(false);
		props.onClose();
	};

	const goBack = (): void => {
		var activeStepIndex = steps.findIndex((s) => s.step === activeStep.step);
		var previousStepIndex = Math.max(activeStepIndex - 1, 0);
		setActiveStep(steps[previousStepIndex]);
	};

	const StepContent = () => {
		switch (activeStep.step) {
			case Steps.CheckCanBid:
				return (
					<Cis2AuctionCheckCanBid
						provider={props.provider}
						account={props.account}
						auctionContractAddress={toContractAddress(props.auction.address)}
						onCancel={handleClose}
						onContinue={(amount) => {
							setState({ ...state, amount: amount });
							setActiveStep(steps[1]);
						}}
						participationContractInfo={props.participationContractInfo}
						participationTokenId={props.auction.participation_token?.token_id}
						participationTokenAddress={
							props.auction.participation_token?.contract
								? toContractAddress(props.auction.participation_token?.contract)
								: undefined
						}
					/>
				);
			case Steps.Bid:
				return (
					<Cis2AuctionBid
						minAmountMicroCcd={state.amount}
						provider={props.provider}
						account={props.account}
						auctionContractAddress={toContractAddress(props.auction.address)}
						onCancel={handleClose}
						onDone={() => {
							alert("bid completed");
							handleClose();
						}}
					/>
				);
			default:
				return <div>Unknown step</div>;
		}
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
			<DialogTitle>Bid Token: {props.auction.auction_state.token_id}</DialogTitle>
			<Container sx={{ maxWidth: "xl", pt: "10px" }}>
				<Stepper activeStep={activeStep.step} alternativeLabel sx={{ padding: "20px" }}>
					{steps.map((step) => (
						<Step key={step.step}>
							<StepLabel>{step.title}</StepLabel>
						</Step>
					))}
				</Stepper>
				<Paper sx={{ padding: "20px" }} variant="outlined">
					<Grid container>
						<Grid item xs={1}>
							<IconButton sx={{ border: "1px solid black", borderRadius: "100px" }} onClick={() => goBack()}>
								<ArrowBackRounded></ArrowBackRounded>
							</IconButton>
						</Grid>
						<Grid item xs={11}>
							<Typography variant="h4" gutterBottom sx={{ pt: "20px", width: "100%" }} textAlign="center">
								{activeStep.title}
							</Typography>
						</Grid>
					</Grid>
					<StepContent />
				</Paper>
			</Container>
		</Dialog>
	);
}

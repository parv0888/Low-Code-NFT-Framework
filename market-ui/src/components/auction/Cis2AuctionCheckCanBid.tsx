import { useEffect, useState } from "react";
import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { AccountAddress, ContractAddress, InvokeContractFailedResultV1, RejectReasonTag } from "@concordium/web-sdk";

import { canBid } from "../../models/Cis2AuctionClient";
import { balanceOf } from "../../models/Cis2Client";
import { Cis2ContractInfo, toParamContractAddress } from "../../models/ConcordiumContractClient";
import { transfer } from "../../models/Cis2Client";
import DisplayError from "../ui/DisplayError";
import { Button, Stack } from "@mui/material";

export default function Cis2AuctionCheckCanBid(props: {
	participationContractInfo: Cis2ContractInfo;
	participationTokenId?: string;
	participationTokenAddress?: ContractAddress;
	provider: WalletApi;
	auctionContractAddress: ContractAddress;
	account: string;
	onCancel: () => void;
	onContinue: (amount: bigint) => void;
}) {
	const [retry, setRetry] = useState(0);
	const [state, setState] = useState({
		isInProgress: false,
		error: "",
	});

	useEffect(() => {
		setState({ ...state, isInProgress: true });
		canBid(props.provider, props.auctionContractAddress, props.account)
			.then((ccdAmount) => {
				setState({ ...state, isInProgress: false });
				console.log(`Can bid ${(BigInt(ccdAmount) / BigInt(1000000)).toString()} CCD`);
				props.onContinue(ccdAmount);
			})
			.catch((err) => {
				let cause = err.cause as InvokeContractFailedResultV1;
				switch (cause.reason.tag) {
					case RejectReasonTag.RejectedReceive:
						if (cause.reason.rejectReason === -4) {
							balanceOf(
								props.provider,
								props.account,
								props.participationTokenAddress!,
								props.participationContractInfo,
								props.participationTokenId!
							)
								.then((amount) => {
									console.log("amount: " + amount);
									if (amount < 1) {
										setState({ ...state, isInProgress: false, error: "You do not have a participation token" });
										return;
									}

									console.log(
										"transfering participation token",
										props.participationTokenAddress,
										props.participationTokenId
									);
									return transfer(
										props.provider,
										props.account,
										[
											{
												amount: "1",
												from: { Account: [props.account] },
												to: {
													Contract: [
														toParamContractAddress(props.auctionContractAddress),
														"onReceivingParticipationCIS2",
													],
												},
												token_id: props.participationTokenId!,
												data: "",
											},
										],
										props.participationTokenAddress!,
										props.participationContractInfo
									)
										.then((_) => {
											console.log("transferred participation token");
											setState({ ...state, isInProgress: false });
											console.log("setting retry");
											setRetry(retry + 1);
										})
										.catch((err) => {
											console.error(err);
											setState({ ...state, isInProgress: false, error: err.message });
										});
								})
								.catch((err) => {
									setState({ ...state, isInProgress: false, error: err.message });
								});
						}
						break;
					default:
						console.error(cause);
						setState({ ...state, isInProgress: false, error: err.message });
						throw err;
				}
			});
	}, [props.provider, props.auctionContractAddress, retry]);

	return (
		<Stack spacing={2}>
			<div>
				Check Can Bid
				<br />
				{state.isInProgress ? "In progress" : "Not in progress"}
				{state.error ? <DisplayError error={state.error} /> : null}
			</div>
			<Button variant="outlined" disabled={state.isInProgress} type="button" onClick={props.onCancel}>
				Cancel
			</Button>
		</Stack>
	);
}

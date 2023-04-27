import { Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { ContractAddress } from "@concordium/web-sdk";

import { bid } from "../../models/Cis2AuctionClient";
import DisplayError from "../ui/DisplayError";
import { toCcd } from "../../models/ConcordiumContractClient";

export default function Cis2AuctionBid(props: {
	auctionContractAddress: ContractAddress;
	account: string;
	provider: WalletApi;
	minAmountMicroCcd: bigint;
	onCancel: () => void;
	onDone: () => void;
}) {
	const minAmountCcd = toCcd(props.minAmountMicroCcd);
	const minAmount = minAmountCcd > 1 ? BigInt(minAmountCcd.toString()) : BigInt(1);

	const [isInProgress, setIsInProgress] = useState(false);
	const [form, setForm] = useState({
		amount: minAmount
	});
	const [error, setError] = useState("");
	const submit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsInProgress(true);
		setError("");

		//validation
		if (form.amount <= BigInt(0)) { 
			setIsInProgress(false);
			setError("Amount must be greater than 0");
			return;
		}

		if (form.amount < minAmount) {
			setIsInProgress(false);
			setError("Amount must be greater than the minimum amount");
			return;
		}

		try {
			await bid(props.provider, props.account, props.auctionContractAddress, BigInt(form.amount));
			props.onDone();
		} catch (err: any) {
			console.error(err);
			setIsInProgress(false);
			setError(err.message);
		}
	};

	return (
		<Stack component={"form"} spacing={2} onSubmit={submit}>
			<TextField
				id="amount"
				label={"Bid Amount (CCD)"}
				name="Amount"
				type="number"
				variant="standard"
				InputLabelProps={{
					shrink: true,
				}}
				value={form.amount.toString()}
				onChange={(amount) => setForm({ amount: BigInt(amount.target.value) > 0 ? BigInt(amount.target.value) : BigInt(0) })}
				required
			/>
			<Button variant="contained" disabled={isInProgress} type="submit">
				Bid
			</Button>
			<Button variant="outlined" disabled={isInProgress} type="button" onClick={props.onCancel}>
				Cancel
			</Button>
			<DisplayError error={error} />
		</Stack>
	);
}

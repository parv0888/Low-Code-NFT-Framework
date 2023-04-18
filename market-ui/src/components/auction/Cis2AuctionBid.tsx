import { Button, Stack, TextField } from "@mui/material";
import { useState } from "react";
import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { ContractAddress } from "@concordium/web-sdk";

import { bid } from "../../models/Cis2AuctionClient";
import DisplayError from "../ui/DisplayError";

export default function Cis2AuctionBid(props: {
	auctionContractAddress: ContractAddress;
	account: string;
	provider: WalletApi;
	minAmountMicroCcd: bigint;
	onCancel: () => void;
	onDone: () => void;
}) {
	const [isInProgress, setIsInProgress] = useState(false);
	const [form, setForm] = useState({
		amount: props.minAmountMicroCcd.toString(),
	});
	const [error, setError] = useState("");
	const submit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsInProgress(true);
		setError("");
		console.log("submitting bid with amount: " + form.amount);

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
				label="Bid Amount"
				name="Amount"
				type="number"
				variant="standard"
				InputLabelProps={{
					shrink: true,
				}}
				value={form.amount}
				onChange={(amount) => setForm({ amount: amount.target.value })}
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

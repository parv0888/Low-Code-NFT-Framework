import { FormEvent, useState } from "react";
import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { ContractAddress } from "@concordium/web-sdk";
import { TextField, Typography, Button, Stack } from "@mui/material";

import {
	ContractInfo,
	getInstanceInfo,
} from "../../models/ConcordiumContractClient";

export default function Cis2AuctionFindInstance(props: {
	provider: WalletApi;
	contractInfo: ContractInfo;
	address?: ContractAddress;
	onDone: (address: ContractAddress, contractInfo: ContractInfo) => void;
}) {
	const [state, setState] = useState({
		error: "",
		checking: false,
	});
	const [form, setForm] = useState({
		index: props.address?.index.toString() || "0",
		subindex: props.address?.subindex.toString() || "0",
	});

	function setFormValue(key: string, value: string) {
		setForm({ ...form, [key]: value });
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setState({ ...state, error: "", checking: true });

		const index = BigInt(form.index);
		const subindex = BigInt(form.subindex);

		if (!(index >= 0)) {
			setState({ ...state, error: "Invalid Contract Index" });
			return;
		}

		if (!(subindex >= 0)) {
			setState({ ...state, error: "Invalid Contract Subindex" });
			return;
		}

		const address = { index, subindex };
		getInstanceInfo(props.provider, address)
			.then((instanceInfo) => {
				if (!(instanceInfo.sourceModule.moduleRef === props.contractInfo.moduleRef?.moduleRef)) {
					return Promise.reject(new Error("Contract is not a CIS2 Auction Contract"));
				}
			})
			.then(() => {
				setState({ ...state, checking: false, error: "" });
				props.onDone(address, props.contractInfo);
			})
			.catch((e: Error) => {
				setState({ ...state, checking: false, error: e.message });
			});
	}

	return (
		<Stack
			component={"form"}
			spacing={2}
			onSubmit={submit}
			autoComplete={"true"}
		>
			<TextField
				id="contract-index"
				name="contractIndex"
				label="Contract Index"
				variant="standard"
				type={"number"}
				value={form.index.toString()}
				onChange={(e) => setFormValue("index", e.target.value)}
				disabled={state.checking}
			/>
			<TextField
				id="contract-subindex"
				name="contractSubindex"
				label="Contract Sub Index"
				variant="standard"
				type={"number"}
				disabled={state.checking}
				value={form.subindex.toString()}
				onChange={(e) => setFormValue("subindex", e.target.value)}
			/>
			{state.error && (
				<Typography component="div" color="error">
					{state.error}
				</Typography>
			)}
			{state.checking && <Typography component="div">Checking..</Typography>}
			<Button
				type="submit"
				variant="contained"
				disabled={state.checking}
				fullWidth
				size="large"
				sx={{ maxWidth: "100px" }}
			>
				Find
			</Button>
		</Stack>
	);
}
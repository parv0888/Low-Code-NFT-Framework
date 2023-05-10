import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { CircularProgress } from "@mui/material";
import { useInterval } from "usehooks-ts";
import { getBlockHeight } from "../../models/ApiWebClient";
import { useState } from "react";

export default function BackendCatchupStatus(props: { provider: WalletApi; onUpdated?: (height: BigInt) => void }) {
	const [isCatchingUp, setIsCatchingUp] = useState(false);
	const [blockHeight, setBlockHeight] = useState(BigInt(0));

	useInterval(() => {
		props.provider
			.getJsonRpcClient()
			.getConsensusStatus()
			.then((status) => {
				getBlockHeight().then((height) => {
					if (height < status.lastFinalizedBlockHeight) {
						setIsCatchingUp(true);
					} else {
						setIsCatchingUp(false);
					}

					if (height !== blockHeight) {
						setBlockHeight(height);
						props.onUpdated && props.onUpdated(height);
					}
				});
			});
	}, 1000);

	return <>
		{isCatchingUp && <CircularProgress color="warning" />}
		{!isCatchingUp && <CircularProgress color="warning" variant="determinate" value={100} />}
	</>;
}

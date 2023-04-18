import { WalletApi } from "@concordium/browser-wallet-api-helpers";
import { Paper } from "@mui/material";

import {
  Cis2ContractInfo,
  ContractInfo,
} from "../../models/ConcordiumContractClient";
import AuctionsList from "../../components/auction/AuctionsList";

export default function ListAuctionsPage(props: {
  cis2ContractInfo: Cis2ContractInfo;
  provider: WalletApi;
  account: string;
  contractInfo: ContractInfo;
}) {
  return (
    <Paper variant="outlined">
      <AuctionsList
        provider={props.provider as WalletApi}
        account={props.account}
        contractInfo={props.contractInfo}
        cis2ContractInfo={props.cis2ContractInfo}
      />
    </Paper>
  );
}

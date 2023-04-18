import { WalletApi } from "@concordium/browser-wallet-api-helpers";

export default function Cis2AuctionParticipate(props: {
    provider: WalletApi;
    account: string;
}) {
    return <div>
        <h1>Participate</h1>
    </div>;
}
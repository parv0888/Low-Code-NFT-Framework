import "./App.css";

import { useEffect, useState } from "react";
import { detectConcordiumProvider, WalletApi } from "@concordium/browser-wallet-api-helpers";
import { AppBar, Box, Breadcrumbs, Button, Container, Icon, Link, Toolbar, Typography, colors } from "@mui/material";
import { Route, Routes, useParams, Navigate, useNavigate } from "react-router-dom";
import { ContractAddress } from "@concordium/web-sdk";

import BuyPage from "./pages/BuyPage";
import SellPage from "./pages/SellPage";
import ContractFindInstanceOrInit from "./pages/ContractFindInstanceOrInit";
import MintPage from "./pages/MintPage";
import {
	AUCTION_CONTRACT_INFO,
	CIS2_MULTI_CONTRACT_INFO,
	CREATE_NEW_MARKETPLACE,
	MARKETPLACE_CONTRACT_INFO,
	MARKET_CONTRACT_ADDRESS,
} from "./Constants";
import ConnectWallet from "./components/ConnectWallet";
import Header from "./components/ui/Header";
import { MINTING_UI_ONLY } from "./Constants";
import CreateAuction from "./pages/auction/CreateAuction";
import AuctionsPage from "./pages/AuctionsPage";
import EndedAuctions from "./pages/auction/EndedAuctions";
import LiveAuctionsList from "./components/auction/LiveAuctionsList";
import EndedAuctionsList from "./components/auction/EndedAuctionsList";
import MarketPage from "./pages/MarketPage";
import { toContractAddress } from "./models/ConcordiumContractClient";
import CIS2Page from "./pages/CIS2Page";
import BackendCatchupStatus from "./components/backend-info/BackendCatchupStatus";

function App() {
	const params = useParams();
	const navigate = useNavigate();
	const { index, subindex } = useParams();
	const marketContract = {
		index: BigInt(index || MARKET_CONTRACT_ADDRESS.index.toString()),
		subindex: BigInt(subindex || MARKET_CONTRACT_ADDRESS.subindex.toString()),
	};

	let marketplaceContractAddress: ContractAddress | undefined = undefined;
	if (!MINTING_UI_ONLY) {
		marketplaceContractAddress = MARKET_CONTRACT_ADDRESS;

		if (params.index && params.subindex) {
			marketplaceContractAddress = {
				index: BigInt(params.index),
				subindex: BigInt(params.subindex),
			};
		}
	}

	const [state, setState] = useState<{
		provider?: WalletApi;
		account?: string;
		marketplaceContractAddress?: ContractAddress;
	}>({
		marketplaceContractAddress,
	});

	function connect() {
		detectConcordiumProvider()
			.then((provider) => {
				provider
					.getMostRecentlySelectedAccount()
					.then((account) => (!!account ? Promise.resolve(account) : provider.connect()))
					.then((account) => {
						setState({ ...state, provider, account });
					})
					.catch((_) => {
						alert("Please allow wallet connection");
					});
				provider.on("accountDisconnected", () => {
					setState({ ...state, account: undefined });
				});
				provider.on("accountChanged", (account) => {
					setState({ ...state, account });
				});
				provider.on("chainChanged", () => {
					setState({ ...state, account: undefined, provider: undefined });
				});
			})
			.catch((_) => {
				console.error(`could not find provider`);
				alert("Please download Concordium Wallet");
			});
	}

	useEffect(() => {
		if (state.provider && state.account) {
			return;
		}

		connect();
		return () => {
			state.provider?.removeAllListeners();
		};
	}, [state.account]);

	function isConnected() {
		return !!state.provider && !!state.account;
	}

	if (!isConnected()) { 
		return (<ConnectWallet connect={connect} />)
	}

	return (
		<>
			<AppBar position="static">
				<Container maxWidth={"xl"}>
					<Toolbar>
						<Box sx={{ flexGrow: 1 }}>
							<Typography variant="h4" component="div">
								Concordium
							</Typography>
						</Box>
						<Button color="inherit" onClick={() => navigate("/market")}>
							Market
						</Button>
						<Button color="inherit" onClick={() => navigate("/auctions")}>
							Auctions
						</Button>
						<Button color="inherit" onClick={() => navigate("/cis2")}>
							CIS2 Token Tools
						</Button>
						<BackendCatchupStatus provider={state.provider!} />
					</Toolbar>
				</Container>
			</AppBar>
			<Box className="App">
				<Container maxWidth={"lg"}>
					<Routes>
						<Route path="/auctions" element={<AuctionsPage />} key="auctions">
							<Route
								path="live"
								element={
									<LiveAuctionsList
										provider={state.provider!}
										account={state.account!}
										contractInfo={AUCTION_CONTRACT_INFO}
										cis2ContractInfo={CIS2_MULTI_CONTRACT_INFO}
									/>
								}></Route>
							<Route
								path="ended"
								element={
									<EndedAuctionsList
										provider={state.provider!}
										account={state.account!}
										contractInfo={AUCTION_CONTRACT_INFO}
										cis2ContractInfo={CIS2_MULTI_CONTRACT_INFO}
									/>
								}
							/>
							<Route
								path="create"
								element={
									<CreateAuction
										tokenContractInfo={CIS2_MULTI_CONTRACT_INFO}
										provider={state.provider!}
										account={state.account!}
										auctionContractInfo={AUCTION_CONTRACT_INFO}
										onDone={function (
											auctionAddress: ContractAddress,
											tokenAddress: ContractAddress,
											tokenId: string
										): void {
											alert("auction created");
											navigate("live");
										}}
									/>
								}
							/>
							<Route path="" element={<Navigate to={"/auctions/live"} replace={true} />} />
						</Route>
						<Route path="/market" element={<MarketPage marketContract={marketContract} />} key="market">
							<Route
								path="buy/:index/:subindex"
								element={
									<BuyPage
										account={state.account!}
										provider={state.provider!}
										contractInfo={CIS2_MULTI_CONTRACT_INFO}
										marketContractAddress={marketContract}
									/>
								}
							/>
							<Route
								path="sell"
								element={
									<SellPage
										provider={state.provider!}
										account={state.account!}
										marketContractAddress={marketContract}
										contractInfo={CIS2_MULTI_CONTRACT_INFO}
									/>
								}
							/>
							<Route
								path="create"
								element={
									<ContractFindInstanceOrInit
										provider={state.provider!}
										account={state.account!}
										contractInfo={MARKETPLACE_CONTRACT_INFO}
										onDone={(address) => navigate(`buy/${address.index.toString()}/${address.subindex.toString()}`)}
									/>
								}
							/>
							<Route
								path=""
								element={
									<Navigate
										to={`buy/${marketContract.index.toString()}/${marketContract.subindex.toString()}`}
										replace={true}
									/>
								}
							/>
						</Route>
						<Route path="/cis2" element={<CIS2Page />} key="cis2">
							<Route
								path="mint"
								element={
									<MintPage
										key={CIS2_MULTI_CONTRACT_INFO.contractName}
										contractInfo={CIS2_MULTI_CONTRACT_INFO}
										provider={state.provider!}
										account={state.account!}
									/>
								}
							/>
							<Route path="" element={<Navigate to={"mint"} replace={true} />} />
						</Route>
						<Route path="*" element={<Navigate to={"/market"} replace={true} />} />
					</Routes>
				</Container>
			</Box>
			<footer className="footer">
				<Typography textAlign={"center"} sx={{ color: "white" }}>
					{/* <Link sx={{color: "white"}} href="https://developer.concordium.software/en/mainnet/index.html" target={"_blank"}>Concordium Developer Documentation</Link> */}
					<Link
						sx={{ color: "white" }}
						href="https://developer.concordium.software/en/mainnet/net/guides/low-code-nft-marketplace/introduction.html"
						target={"_blank"}>
						Visit the Concordium documentation portal to create your own marketplace in a few minutes!
					</Link>
				</Typography>
			</footer>
		</>
	);
}

export default App;

import { Outlet, useNavigate } from "react-router-dom";

import { AppBar, Button, Stack, Toolbar, Typography } from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import { ContractAddress } from "@concordium/web-sdk";

export default function AuctionsPage(props: { marketContract: ContractAddress }) {
	const navigate = useNavigate();

	return (
		<Stack spacing={2} mt={1}>
			<AppBar position="static" color="secondary">
				<Toolbar>
					<Typography textAlign={"left"} variant="h5" component={"div"} sx={{ flexGrow: 1 }}>
						Market
					</Typography>
					<Button
						color="inherit"
						onClick={(_) =>
							navigate(`buy/${props.marketContract.index.toString()}/${props.marketContract.subindex.toString()}`)
						}>
						Buy
					</Button>
					<Button color="inherit" onClick={(_) => navigate("sell")}>
						Sell
					</Button>
					<Button color="inherit" onClick={(_) => navigate("create")}>
						<AddCircleOutline sx={{ mr: 1 }} />
					</Button>
				</Toolbar>
			</AppBar>
			<Outlet />
		</Stack>
	);
}

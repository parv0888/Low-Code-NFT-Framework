import { Outlet, useNavigate } from 'react-router-dom';

import { AppBar, Button, Stack, Toolbar, Typography } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';

export default function AuctionsPage() {
	const navigate = useNavigate();

	return (
		<Stack spacing={2} mt={1}>
			<AppBar position="static" color="secondary">
				<Toolbar>
					<Typography textAlign={"left"} variant="h5" component={"div"} sx={{ flexGrow: 1 }}>
						Auctions
					</Typography>
					<Button color="inherit" onClick={(_) => navigate("live")}>
						Live
					</Button>
					<Button color="inherit" onClick={(_) => navigate("ended")}>
						Ended
					</Button>
					<Button color="inherit" onClick={(_) => navigate("create")}>
						<AddCircleOutline sx={{ mr: 1 }} />
					</Button>
				</Toolbar>
			</AppBar>
			<Outlet/>
		</Stack>
	);
}

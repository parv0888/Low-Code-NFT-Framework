import { WEB_BLOCK_HEIGHT_URL } from "../Constants";

export async function getBlockHeight(): Promise<bigint> {
    const res = await fetch(WEB_BLOCK_HEIGHT_URL);
    const text = await res.json();
	return BigInt(text);
}

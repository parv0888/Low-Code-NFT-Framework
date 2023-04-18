import { ContractAddress } from "@concordium/web-sdk";

export function toLocalStorageKey(
  tokenId: string,
  contract: ContractAddress | { index: number; subindex: number }
): string {
  return `NFT_${tokenId}_${contract.index.toString()}_${contract.subindex.toString()}`;
}

export async function fetchJson<T>(metadataUrl: string): Promise<T> {
  let res = await fetch(metadataUrl);

  if (!res.ok) {
    return Promise.reject(new Error("Could not load Metadata"));
  }

  let json = await res.json();

  return json as T;
}

export async function fetchJsonString(metadataUrl: string): Promise<string> {
  let res = await fetch(metadataUrl);

  if (!res.ok) {
    return Promise.reject(new Error("Could not load Metadata"));
  }

  return res.text();
}

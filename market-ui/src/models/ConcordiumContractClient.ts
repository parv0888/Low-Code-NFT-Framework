import { SmartContractParameters, WalletApi } from "@concordium/browser-wallet-api-helpers";
import { Buffer } from "buffer/";

import {
	ContractAddress,
	AccountAddress,
	AccountTransactionType,
	serializeUpdateContractParameters,
	ModuleReference,
	InstanceInfo,
	TransactionStatusEnum,
	TransactionSummary,
	CcdAmount,
} from "@concordium/web-sdk";
import { ParamContractAddress } from "./ConcordiumTypes";
import bigInt from "big-integer";

export interface ContractInfo {
	schemaBuffer: Buffer;
	contractName: "CIS2-Multi" | "Market-NFT" | "auction";
	moduleRef?: ModuleReference;
}

export interface Cis2ContractInfo extends ContractInfo {
	tokenIdByteSize: number;
}

/**
 * Initializes a Smart Contract.
 * @param provider Wallet Provider.
 * @param moduleRef Contract Module Reference. Hash of the Deployed Contract Module.
 * @param schemaBuffer Buffer of Contract Schema.
 * @param contractName Name of the Contract.
 * @param account Account to Initialize the contract with.
 * @param maxContractExecutionEnergy Maximum energy allowed to execute.
 * @param ccdAmount CCD Amount to initialize the contract with.
 * @returns Contract Address.
 */
export async function initContract(
	provider: WalletApi,
	contractInfo: ContractInfo,
	account: string,
	params?: SmartContractParameters,
	maxContractExecutionEnergy = BigInt(9999),
	ccdAmount = BigInt(0)
): Promise<ContractAddress> {
	const { moduleRef, schemaBuffer, contractName } = contractInfo;
	if (!moduleRef) {
		throw new Error("Cannot instantiate a Module without Provided Module Ref");
	}

	let txnHash = await provider.sendTransaction(
		account,
		AccountTransactionType.InitContract,
		{
			amount: toMicroCcd(ccdAmount),
			moduleRef,
			initName: contractName,
			maxContractExecutionEnergy,
		},
		params as SmartContractParameters,
		schemaBuffer.toString("base64")
	);

	let outcomes = await waitForTransaction(provider, txnHash);
	outcomes = ensureValidOutcome(outcomes);
	return parseContractAddress(outcomes);
}

/**
 * Invokes a Smart Contract.
 * @param provider Wallet Provider.
 * @param contractInfo Contract Constant Info.
 * @param contract Contract Address.
 * @param methodName Contract Method name to Call.
 * @param params Parameters to call the Contract Method with.
 * @param invoker Invoker Account.
 * @returns Buffer of the return value.
 */
export async function invokeContract<T>(
	provider: WalletApi,
	contractInfo: ContractInfo,
	contract: ContractAddress,
	methodName: string,
	params?: T,
	invoker?: ContractAddress | AccountAddress
): Promise<Buffer> {
	const { schemaBuffer, contractName } = contractInfo;
	const parameter = !!params ? serializeParams(contractName, schemaBuffer, methodName, params) : undefined;
	let res = await provider.getJsonRpcClient().invokeContract({
		parameter,
		contract,
		invoker,
		method: `${contractName}.${methodName}`,
	});

	if (!res || res.tag === "failure") {
		const msg =
			`failed invoking contract ` +
			`method:${methodName}, ` +
			`contract:(index: ${contract.index.toString()}, subindex: ${contract.subindex.toString()})`;
		return Promise.reject(new Error(msg, { cause: res }));
	}

	return Buffer.from(res.returnValue || "", "hex");
}

/**
 * Updates a Smart Contract.
 * @param provider Wallet Provider.
 * @param contractName Name of the Contract.
 * @param schema Buffer of Contract Schema.
 * @param paramJson Parameters to call the Contract Method with.
 * @param account  Account to Update the contract with.
 * @param contractAddress Contract Address.
 * @param methodName Contract Method name to Call.
 * @param maxContractExecutionEnergy Maximum energy allowed to execute.
 * @param amountCcd CCD Amount to update the contract with.
 * @returns Update contract Outcomes.
 */
export async function updateContract<T>(
	provider: WalletApi,
	contractInfo: ContractInfo,
	paramJson: T,
	account: string,
	contractAddress: ContractAddress,
	methodName: string,
	maxContractExecutionEnergy: bigint = BigInt(9999),
	amountCcd: bigint = BigInt(0)
): Promise<Record<string, TransactionSummary>> {
	const { schemaBuffer, contractName } = contractInfo;
	let txnHash = await provider.sendTransaction(
		account,
		AccountTransactionType.Update,
		{
			maxContractExecutionEnergy,
			address: contractAddress,
			amount: toMicroCcd(amountCcd),
			receiveName: `${contractName}.${methodName}`,
		},
		paramJson as SmartContractParameters,
		schemaBuffer.toString("base64")
	);

	let outcomes = await waitForTransaction(provider, txnHash);

	return ensureValidOutcome(outcomes);
}

/**
 * Gets Information about a Smart Contract Instance.
 * @param provider Wallet Provider.
 * @param address Contract Address.
 * @returns Smart Contract instance information.
 */
export async function getInstanceInfo(provider: WalletApi, address: ContractAddress): Promise<InstanceInfo> {
	let instanceInfo = await provider.getJsonRpcClient().getInstanceInfo(address);

	if (!instanceInfo) {
		throw Error("Could not get Contract Information. Please confirm the address is correct");
	}

	return instanceInfo;
}

/**
 * Waits for the input transaction to Finalize.
 * @param provider Wallet Provider.
 * @param txnHash Hash of Transaction.
 * @returns Transaction outcomes.
 */
function waitForTransaction(
	provider: WalletApi,
	txnHash: string
): Promise<Record<string, TransactionSummary> | undefined> {
	return new Promise((res, rej) => {
		_wait(provider, txnHash, res, rej);
	});
}

function ensureValidOutcome(outcomes?: Record<string, TransactionSummary>): Record<string, TransactionSummary> {
	if (!outcomes) {
		throw Error("Null Outcome");
	}

	let successTxnSummary = Object.keys(outcomes)
		.map((k) => outcomes[k])
		.find((s) => s.result.outcome === "success");

	if (!successTxnSummary) {
		let failures = Object.keys(outcomes)
			.map((k) => outcomes[k])
			.filter((s) => s.result.outcome === "reject")
			.map((s) => (s.result as any).rejectReason);
		throw Error(`Transaction failed, reasons: ${failures.map((f) => f.tag).join(",")}`, {
			cause: failures,
		});
	}

	return outcomes;
}

/**
 * Uses Contract Schema to serialize the contract parameters.
 * @param contractName Name of the Contract.
 * @param schema  Buffer of Contract Schema.
 * @param methodName Contract method name.
 * @param params Contract Method params in JSON.
 * @returns Serialize buffer of the input params.
 */
export function serializeParams<T>(contractName: string, schema: Buffer, methodName: string, params: T): Buffer {
	return serializeUpdateContractParameters(contractName, methodName, params, schema);
}

function _wait(
	provider: WalletApi,
	txnHash: string,
	res: (p: Record<string, TransactionSummary> | undefined) => void,
	rej: (reason: any) => void
) {
	setTimeout(() => {
		provider
			.getJsonRpcClient()
			.getTransactionStatus(txnHash)
			.then((txnStatus) => {
				if (!txnStatus) {
					return rej("Transaction Status is null");
				}

				console.info(`txn : ${txnHash}, status: ${txnStatus?.status}`);
				if (txnStatus?.status === TransactionStatusEnum.Finalized) {
					return res(txnStatus.outcomes);
				}

				_wait(provider, txnHash, res, rej);
			})
			.catch((err) => rej(err));
	}, 1000);
}

function parseContractAddress(outcomes: Record<string, TransactionSummary>): ContractAddress {
	for (const blockHash in outcomes) {
		const res = outcomes[blockHash];

		if (res.result.outcome === "success") {
			for (const event of res.result.events) {
				if (event.tag === "ContractInitialized") {
					return {
						index: toBigInt((event as any).address.index),
						subindex: toBigInt((event as any).address.subindex),
					};
				}
			}
		}
	}

	throw Error(`unable to parse Contract Address from input outcomes`);
}

function toBigInt(num: BigInt | number): bigint {
	return BigInt(num.toString(10));
}

const MICRO_CCD_IN_CCD = 1000000;
export function toMicroCcd(ccdAmount: bigint): CcdAmount {
	return new CcdAmount(ccdAmount * BigInt(MICRO_CCD_IN_CCD));
}

export function toCcd(microCcdAmount: bigint | number | string): bigint {
	const r = bigInt(microCcdAmount.toString()).divmod(MICRO_CCD_IN_CCD);
	if (r.remainder.greater(0)) {
		return BigInt(r.quotient.add(1).toString());
	} else {
		return BigInt(r.quotient.toString());
	}
}

export function toParamContractAddress(marketAddress: ContractAddress): ParamContractAddress {
	return {
		index: parseInt(marketAddress.index.toString()),
		subindex: parseInt(marketAddress.subindex.toString()),
	};
}

export const toContractAddress = (
	address: { index: number; subindex: number } | { index: string; subindex: string }
): ContractAddress => {
	return {
		index: BigInt(address.index),
		subindex: BigInt(address.subindex),
	};
};

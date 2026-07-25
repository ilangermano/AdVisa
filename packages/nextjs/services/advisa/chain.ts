import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji, hardhat, sepolia } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";
import { isAdvisaDemoMode } from "~~/services/advisa/demoMode";
import type { GenericContract, GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const contracts = deployedContracts as GenericContractsDeclaration;

export const ADVISA_CHAINS = {
  [hardhat.id]: {
    chain: hardhat,
    rpcUrl: () => process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545",
  },
  [sepolia.id]: {
    chain: sepolia,
    rpcUrl: () => process.env.SEPOLIA_RPC_URL,
  },
  [avalancheFuji.id]: {
    chain: avalancheFuji,
    rpcUrl: () => process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
  },
} as const;

export type AdvisaChainId = keyof typeof ADVISA_CHAINS;
export type AdvisaContractName = "VisaEscrow" | "MockNZDD";

const HARDHAT_DEFAULT_DEPLOYER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export function isAdvisaChainId(chainId: number): chainId is AdvisaChainId {
  return chainId in ADVISA_CHAINS;
}

export function getAdvisaChain(chainId: number) {
  if (!isAdvisaChainId(chainId)) {
    throw new Error(`Unsupported chainId ${chainId}`);
  }

  const config = ADVISA_CHAINS[chainId];
  const rpcUrl = config.rpcUrl();
  if (!rpcUrl) {
    throw new Error(`Missing RPC URL for chain ${chainId}`);
  }

  return { chain: config.chain, rpcUrl };
}

export function getAdvisaContract(chainId: number, contractName: AdvisaContractName): GenericContract {
  const contract = contracts[chainId]?.[contractName];
  if (!contract) {
    throw new Error(`${contractName} is not deployed on chain ${chainId}`);
  }
  return contract;
}

export function createAdvisaPublicClient(chainId: number) {
  const { chain, rpcUrl } = getAdvisaChain(chainId);
  return createPublicClient({ chain, transport: http(rpcUrl) });
}

export function createRelayerWalletClient(chainId: number) {
  const relayerPrivateKey =
    process.env.RELAYER_PRIVATE_KEY ||
    (isAdvisaDemoMode(["RELAYER_PRIVATE_KEY"]) && chainId === hardhat.id ? HARDHAT_DEFAULT_DEPLOYER_PRIVATE_KEY : "");
  if (!relayerPrivateKey) {
    throw new Error("RELAYER_PRIVATE_KEY is not set");
  }

  const normalizedKey = relayerPrivateKey.startsWith("0x") ? relayerPrivateKey : `0x${relayerPrivateKey}`;
  const account = privateKeyToAccount(normalizedKey as `0x${string}`);
  const { chain, rpcUrl } = getAdvisaChain(chainId);

  return createWalletClient({ account, chain, transport: http(rpcUrl) });
}

import { Wallet } from "ethers";
import { deployScript, artifacts } from "../rocketh/deploy.js";

const DNZD_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "transferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/**
 * Registers dNZD and deploys VisaEscrow to the current network.
 *
 * Local Hardhat uses MockNZDD. Every public network requires DNZD_TOKEN_ADDRESS,
 * which must point to NewMoney's existing token contract on that same network.
 *
 * The contract receives separate administrator and relayer addresses at construction.
 * ESCROW_ADMIN_ADDRESS defaults to the deployer. Public networks use the server-side
 * RELAYER_PRIVATE_KEY address for operational actions; local Hardhat keeps the deployer
 * as relayer so fixtures remain deterministic.
 *
 * @param env Rocketh environment object.
 */
export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;
    const chainId = env.network.chain.id;
    const isLocalNetwork = chainId === 31337;
    const configuredAdmin = process.env.ESCROW_ADMIN_ADDRESS || deployer;
    if (!/^0x[a-fA-F0-9]{40}$/.test(configuredAdmin)) {
      throw new Error("ESCROW_ADMIN_ADDRESS must be a valid EVM address");
    }

    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    const relayerAddress = !isLocalNetwork && relayerPrivateKey ? new Wallet(relayerPrivateKey).address : deployer;

    let dnzdAddress: `0x${string}`;
    if (isLocalNetwork) {
      const mockNZDD = await env.deploy("MockNZDD", {
        account: deployer,
        artifact: artifacts.MockNZDD,
        args: [],
      });
      dnzdAddress = mockNZDD.address;
      console.log("🧪 Local MockNZDD deployed at:", mockNZDD.address);
    } else {
      const configuredAddress = process.env.DNZD_TOKEN_ADDRESS;
      if (!configuredAddress || !/^0x[a-fA-F0-9]{40}$/.test(configuredAddress)) {
        throw new Error(`DNZD_TOKEN_ADDRESS must be set to NewMoney's dNZD contract address for chain ${chainId}`);
      }

      dnzdAddress = configuredAddress as `0x${string}`;
      const code = await env.network.provider.request({
        method: "eth_getCode",
        params: [dnzdAddress, "latest"],
      });
      if (code === "0x") {
        throw new Error(`DNZD_TOKEN_ADDRESS has no contract code on chain ${chainId}: ${dnzdAddress}`);
      }
    }

    const dnzd = await env.save(
      "DNZD",
      {
        address: dnzdAddress,
        abi: DNZD_ABI,
        bytecode: "0x",
        argsData: "0x",
        metadata: JSON.stringify({ sources: {} }),
        contractName: "DNZD",
        sourceName: "contracts/DNZD.sol",
      },
      { doNotCountAsNewDeployment: true },
    );

    const visaEscrow = await env.deploy("VisaEscrow", {
      account: deployer,
      artifact: artifacts.VisaEscrow,
      args: [dnzd.address, configuredAdmin as `0x${string}`, relayerAddress as `0x${string}`],
    });

    console.log("🪪 dNZD registered at:", dnzd.address);
    console.log("🔒 VisaEscrow deployed at:", visaEscrow.address);
    console.log("🛡️  Escrow administrator:", configuredAdmin);
    console.log("🔑 Escrow relayer:", relayerAddress);
  },
  {
    tags: ["VisaEscrow", "DNZD", "MockNZDD"],
  },
);

import { Wallet } from "ethers";
import { deployScript, artifacts } from "../rocketh/deploy.js";

/**
 * Deploys MockNZDD and VisaEscrow to the current network.
 *
 * VisaEscrow takes the token address as a constructor argument — the same contract
 * code is deployed against MockNZDD on testnet and against the real dNZD token in
 * production, never a hardcoded address.
 *
 * The deployer receives both DEFAULT_ADMIN_ROLE and RELAYER_ROLE on VisaEscrow (see
 * the contract's constructor). If a separate server-side relayer wallet is configured
 * via RELAYER_PRIVATE_KEY, this script also grants it RELAYER_ROLE so it can anchor
 * agreements, submit proofs, complete milestones, and trigger licence-revocation
 * refunds without needing the deployer's key.
 *
 * @param env Rocketh environment object.
 */
export default deployScript(
  async env => {
    const { deployer } = env.namedAccounts;

    const mockNZDD = await env.deploy("MockNZDD", {
      account: deployer,
      artifact: artifacts.MockNZDD,
      args: [],
    });

    const visaEscrow = await env.deploy("VisaEscrow", {
      account: deployer,
      artifact: artifacts.VisaEscrow,
      args: [mockNZDD.address],
    });

    const relayerPrivateKey = process.env.RELAYER_PRIVATE_KEY;
    if (relayerPrivateKey) {
      const relayerAddress = new Wallet(relayerPrivateKey).address;
      if (relayerAddress.toLowerCase() !== deployer.toLowerCase()) {
        const relayerRole = await env.read(visaEscrow, { functionName: "RELAYER_ROLE" });
        await env.execute(visaEscrow, {
          account: deployer,
          functionName: "grantRole",
          args: [relayerRole, relayerAddress],
        });
        console.log("🔑 Granted RELAYER_ROLE to relayer wallet:", relayerAddress);
      }
    }

    console.log("🪪 MockNZDD deployed at:", mockNZDD.address);
    console.log("🔒 VisaEscrow deployed at:", visaEscrow.address);
  },
  {
    tags: ["VisaEscrow", "MockNZDD"],
  },
);

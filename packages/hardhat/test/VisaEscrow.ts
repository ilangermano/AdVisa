import { expect } from "chai";
import { network } from "hardhat";
import type { Abi_VisaEscrow } from "../generated/abis/VisaEscrow.js";
import type { Abi_MockNZDD } from "../generated/abis/MockNZDD.js";
import { loadAndExecuteDeploymentsFromFiles } from "../rocketh/environment.js";

const { provider, networkHelpers, ethers } = await network.create();

const ONE_NZDD = 10n ** 18n;
const GRACE_PERIOD = 5 * 24 * 60 * 60; // seconds, matches VisaEscrow.GRACE_PERIOD
const UNRESPONSIVE_PERIOD = 30 * 24 * 60 * 60; // seconds, matches VisaEscrow.UNRESPONSIVE_PERIOD

const LICENCE_REF = ethers.keccak256(ethers.toUtf8Bytes("IA-0000123"));
const AGREEMENT_HASH = ethers.sha256(ethers.toUtf8Bytes("signed fee agreement pdf bytes"));

// We define a fixture to reuse the same setup in every test.
async function deployFixture() {
  const env = await loadAndExecuteDeploymentsFromFiles({ provider });
  const { address: escrowAddress, abi: escrowAbi } = env.get<Abi_VisaEscrow>("VisaEscrow");
  const { address: tokenAddress, abi: tokenAbi } = env.get<Abi_MockNZDD>("MockNZDD");

  const escrow = await ethers.getContractAt(escrowAbi, escrowAddress);
  const token = await ethers.getContractAt(tokenAbi, tokenAddress);

  // Account 0 is both the deploy-time `deployer` (rocketh) and holds RELAYER_ROLE.
  const [relayer, migrant, adviser, other] = await ethers.getSigners();

  return { env, escrow, token, relayer, migrant, adviser, other };
}

/** Creates a 3-milestone engagement ($800 / $2,400 / $800), anchors it, and funds it. */
async function createFundedEngagement(overrides?: { amounts?: bigint[]; deadlines?: number[] }) {
  const { escrow, token, relayer, migrant, adviser, other } = await networkHelpers.loadFixture(deployFixture);

  const now = await networkHelpers.time.latest();
  const amounts = overrides?.amounts ?? [800n * ONE_NZDD, 2400n * ONE_NZDD, 800n * ONE_NZDD];
  const deadlines = overrides?.deadlines ?? [now + 7 * 24 * 3600, now + 30 * 24 * 3600, 0];

  const escrowAddress = await escrow.getAddress();

  await escrow.connect(migrant).createEngagement(adviser.address, LICENCE_REF, amounts, deadlines);
  const id = 1n;

  await escrow.connect(relayer).anchorAgreement(id, AGREEMENT_HASH);

  const total = amounts.reduce((sum, a) => sum + a, 0n);
  await token.mint(migrant.address, total);
  await token.connect(migrant).approve(escrowAddress, total);
  await escrow.connect(migrant).fund(id);

  return { escrow, token, relayer, migrant, adviser, other, id, amounts, deadlines, total };
}

describe("VisaEscrow", function () {
  describe("fund()", function () {
    it("reverts before the agreement is anchored (agreementHash is zero)", async function () {
      const { escrow, token, migrant, adviser } = await networkHelpers.loadFixture(deployFixture);
      const amounts = [800n * ONE_NZDD];

      await escrow.connect(migrant).createEngagement(adviser.address, LICENCE_REF, amounts, [0]);
      await token.mint(migrant.address, amounts[0]);
      await token.connect(migrant).approve(await escrow.getAddress(), amounts[0]);

      // State is still `Created` — anchorAgreement was never called, so agreementHash is zero.
      await expect(escrow.connect(migrant).fund(1)).to.revert(ethers);
    });
  });

  describe("completeMilestone()", function () {
    it("pays exactly the tranche amount, no more", async function () {
      const { escrow, token, relayer, adviser, id, amounts } = await createFundedEngagement();

      await escrow.connect(relayer).submitProof(id, ethers.keccak256(ethers.toUtf8Bytes("inz-acknowledgment")));

      const before = await token.balanceOf(adviser.address);
      await escrow.connect(relayer).completeMilestone(id);
      const after = await token.balanceOf(adviser.address);

      expect(after - before).to.equal(amounts[0]);
    });
  });

  describe("reclaimTranche()", function () {
    it("reverts before deadline + grace has passed", async function () {
      const { escrow, migrant, id } = await createFundedEngagement();
      await expect(escrow.connect(migrant).reclaimTranche(id)).to.revert(ethers);
    });

    it("succeeds after deadline + grace and returns ALL unreleased funds", async function () {
      const { escrow, token, migrant, id, deadlines, total } = await createFundedEngagement();

      await networkHelpers.time.increaseTo(deadlines[0] + GRACE_PERIOD + 1);

      const before = await token.balanceOf(migrant.address);
      await escrow.connect(migrant).reclaimTranche(id);
      const after = await token.balanceOf(migrant.address);

      expect(after - before).to.equal(total);

      const engagement = await escrow.engagements(id);
      expect(engagement.state).to.equal(3n); // State.Ended
    });

    it("cannot be called by anyone other than the migrant", async function () {
      const { escrow, adviser, other, id, deadlines } = await createFundedEngagement();
      await networkHelpers.time.increaseTo(deadlines[0] + GRACE_PERIOD + 1);

      await expect(escrow.connect(other).reclaimTranche(id)).to.revert(ethers);
      await expect(escrow.connect(adviser).reclaimTranche(id)).to.revert(ethers);
    });
  });

  describe("the clock", function () {
    it("does not advance the deadline while paused, and shifts it forward on resume", async function () {
      const { escrow, relayer, id, deadlines } = await createFundedEngagement();

      await escrow.connect(relayer).pauseClock(id);
      await networkHelpers.time.increase(3 * 24 * 3600);

      let milestones = await escrow.getMilestones(id);
      expect(milestones[0].deadline).to.equal(BigInt(deadlines[0]));

      await escrow.connect(relayer).resumeClock(id);

      milestones = await escrow.getMilestones(id);
      expect(milestones[0].deadline).to.be.greaterThan(BigInt(deadlines[0]));
    });
  });

  describe("claimUnresponsive()", function () {
    it("cannot be called by anyone other than the adviser", async function () {
      const { escrow, relayer, other, id } = await createFundedEngagement();

      await escrow.connect(relayer).pauseClock(id);
      await networkHelpers.time.increase(UNRESPONSIVE_PERIOD + 1);

      await expect(escrow.connect(other).claimUnresponsive(id)).to.revert(ethers);
    });

    it("pays the adviser once the clock has sat paused for the unresponsive period", async function () {
      const { escrow, token, relayer, adviser, id, amounts } = await createFundedEngagement();

      await escrow.connect(relayer).pauseClock(id);
      await networkHelpers.time.increase(UNRESPONSIVE_PERIOD + 1);

      const before = await token.balanceOf(adviser.address);
      await escrow.connect(adviser).claimUnresponsive(id);
      const after = await token.balanceOf(adviser.address);

      expect(after - before).to.equal(amounts[0]);
    });
  });

  describe("refundAll()", function () {
    it("returns everything unreleased to the migrant and ends the engagement", async function () {
      const { escrow, token, relayer, migrant, id, total } = await createFundedEngagement();

      const before = await token.balanceOf(migrant.address);
      await escrow.connect(relayer).refundAll(id);
      const after = await token.balanceOf(migrant.address);

      expect(after - before).to.equal(total);

      const engagement = await escrow.engagements(id);
      expect(engagement.state).to.equal(3n); // State.Ended
    });
  });

  describe("reentrancy", function () {
    it("the guard holds on the completeMilestone payout path against a hostile token", async function () {
      const [relayer, migrant, adviser] = await ethers.getSigners();

      const EvilToken = await ethers.getContractFactory("ReentrantToken");
      const evilToken = await EvilToken.deploy();

      const Escrow = await ethers.getContractFactory("VisaEscrow");
      const escrow = await Escrow.deploy(await evilToken.getAddress());
      const escrowAddress = await escrow.getAddress();

      const amount = 800n * ONE_NZDD;
      await escrow.connect(migrant).createEngagement(adviser.address, LICENCE_REF, [amount], [0]);

      await escrow.connect(relayer).anchorAgreement(1, AGREEMENT_HASH);

      await evilToken.mint(migrant.address, amount);
      await evilToken.connect(migrant).approve(escrowAddress, amount);
      await escrow.connect(migrant).fund(1);

      await escrow.connect(relayer).submitProof(1, ethers.keccak256(ethers.toUtf8Bytes("proof")));
      await evilToken.setAttack(escrowAddress, 1);

      // The evil token's transfer() tries to call back into completeMilestone() mid-payout.
      // Without the ReentrancyGuard this would double-release the tranche; with it, the
      // reentrant call reverts and drags the whole transaction down with it.
      await expect(escrow.connect(relayer).completeMilestone(1)).to.revert(ethers);
    });
  });
});

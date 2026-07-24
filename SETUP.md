# SETUP.md

0. Prereqs: Node v20 or v22, yarn, git
1. `npx create-eth@latest` — name advisa, Hardhat, no extensions
   (already done for this repo — see `CONTEXT.md` known limitations for the toolchain
   this actually produced: Hardhat 3 + rocketh, Next.js 16)
2. Install the extra dependencies:
   ```bash
   yarn workspace @se-2/hardhat add @openzeppelin/contracts
   yarn workspace @se-2/nextjs add @privy-io/react-auth @supabase/supabase-js
   ```
3. Add both networks to `packages/hardhat/hardhat.config.ts` and
   `packages/nextjs/scaffold.config.ts` (see `CONTEXT.md` → Networks)
4. `cp .env.example .env.local` and `cp .env.example packages/hardhat/.env`
5. `yarn account` to print the deployer address, then fund it on **both** testnets:
   Sepolia via the Google Cloud or Alchemy faucet; Fuji via core.app/tools/testnet-faucet.
   Do this immediately — faucets rate-limit per address per day.
6. Three terminals: `yarn chain`, `yarn deploy`, `yarn start` (localhost:3000)
7. `git init && git add -A && git commit -m "chore: scaffold AdVisa" && git push`
8. Teammates: clone, `yarn install`, copy env, run the three commands
9. Verify context loaded in Claude Code with `/memory`
10. Testnet deploy: `yarn deploy --network sepolia` then `yarn deploy --network fuji`,
    then paste both contract addresses into the README deployments table

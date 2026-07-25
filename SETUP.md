# SETUP.md

0. Prereqs: Node v20 or v22, yarn, git
1. `npx create-eth@latest` — name advisa, Hardhat, no extensions
   (already done for this repo — see `CONTEXT.md` known limitations for the toolchain
   this actually produced: Hardhat 3 + rocketh, Next.js 16)
2. Install the extra dependencies:
   ```bash
   yarn workspace @se-2/hardhat add @openzeppelin/contracts
   yarn workspace @se-2/nextjs add @privy-io/node @privy-io/react-auth @privy-io/wagmi @supabase/supabase-js
   ```
3. Base Sepolia is configured in `packages/hardhat/hardhat.config.ts` and
   `packages/nextjs/scaffold.config.ts`.
4. Create a Privy web app, enable Email, Google and SMS login, enable Ethereum
   embedded wallets, and allow `http://localhost:3000`.
5. Copy the environment templates:
   ```bash
   cp packages/nextjs/.env.example packages/nextjs/.env.local
   cp packages/hardhat/.env.example packages/hardhat/.env
   ```
   Set `NEXT_PUBLIC_PRIVY_APP_ID` and `PRIVY_APP_SECRET` in the Next.js file.
   After the first administrator signs in, copy their Privy DID from the Privy
   dashboard into `PRIVY_ADMIN_USER_IDS`. Never commit either `.env` file.
6. `yarn account` to print the deployer address, then fund it with Base Sepolia ETH for
   deployment gas. Request dNZD separately from NewMoney for the demo migrant wallet.
7. Set `ESCROW_ADMIN_ADDRESS` to a recoverable wallet you control and
   `RELAYER_PRIVATE_KEY` to the server relayer key. The relayer pays testnet gas and
   performs only `RELAYER_ROLE` actions.
8. Three terminals: `yarn chain`, `yarn deploy`, `yarn start` (localhost:3000)
9. `git init && git add -A && git commit -m "chore: scaffold AdVisa" && git push`
10. Teammates: clone, `yarn install`, copy env, run the three commands
11. Verify context loaded in Claude Code with `/memory`
12. Set `DNZD_TOKEN_ADDRESS` to the Base Sepolia token address confirmed by NewMoney,
    then run `yarn deploy --network baseSepolia`.

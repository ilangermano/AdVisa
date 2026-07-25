# NewMoney dNZD testnet onboarding

AdVisa uses **Option 1 — manual testnet tokens** for the escrow demo. The mint API is
not needed unless the product later tests NewMoney's complete request-to-mint flow.

Send this after the demo migrant wallet has been created:

```text
Organisation/project: AdVisa
Development team: Web3NZ Hackathon team
Primary technical contact: [name and preferred contact]
Receiving-wallet address: [demo migrant wallet address]
Requested EVM test network: Base Sepolia (chain ID 84532)
Requested dNZD amount: NZ$10,000 test dNZD
Use case: Test milestone-based immigration adviser fee escrow, including approval,
funding, staged release, and deadline refund.
```

Also ask NewMoney to confirm:

- The Base Sepolia dNZD token contract address
- Token symbol and decimals
- The transfer transaction hash after funding

Never send a seed phrase, private key, encrypted keystore, relayer credential, or API
credential. Compare the network and full wallet address in NewMoney's confirmation
before accepting the transfer.

## Deployment inputs

The public deployment requires:

1. `DNZD_TOKEN_ADDRESS` — NewMoney's confirmed Base Sepolia token contract
2. A deployer wallet funded with Base Sepolia ETH for gas
3. The deployer-keystore password entered locally when running:

   ```bash
   yarn deploy --network baseSepolia
   ```

The deployment script rejects a missing/invalid token address and verifies that the
address contains contract code before deploying `VisaEscrow`.

## Confirmed allocation

- Network: Base Sepolia (`84532`)
- dNZD contract: `0x63ee4b77d3912DC7bCe711c3BE7bF12D532F1853`
- Token decimals: `6`
- Receiving wallet: `0x2b416d7da036f83d1f777a4eb8bbfff74adf7eb4`
- Amount received: `1,000,000 dNZD`
- Transaction:
  `0x65138aacfc5b86f6a70fac476263fa7d56620045fd3ec5cd909152f393547ac9`

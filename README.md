# Description
This is a fast approach for doing the RWA oracle, but clearly in our roadmap we will need to add more security and leverage the APIs in a beter way.
              ┌────────────────────────────────────┐
              │      REAL-WORLD ASSET (RWA)        │
              │ Contract, Invoice, Real Estate...  │
              └────────────────────────────────────┘
                              │
                         (1) Upload
                              │
                              ▼
         ┌─────────────────────────────────────────────┐
         │     OFF-CHAIN VERIFICATION PIPELINE         │
         │ Ownership Check  | Appraisal | Risk Scoring │
         │ Compliance Check | Fraud Detection          │
         └─────────────────────────────────────────────┘
                              │
                        (2) Attestation
                              │
                              ▼
       ┌────────────────────────────────────────────┐
       │        ATTESTATION REGISTRY (ON-CHAIN)     │
       │ Hashes | Metadata Commitments | Signatures │
       └────────────────────────────────────────────┘
                              │
                   (3) ZK Proof Generation
                              │
                              ▼
      ┌──────────────────────────────────────────────┐
      │  SOROBAN: RWA TOKEN CONTRACT (MINTING)       │
      │ Token ID | Risk Class | Valuation Commitment │
      └──────────────────────────────────────────────┘
                              │
                       (4) Deposit Token
                              │
                              ▼
     ┌──────────────────────────────────────────────────┐
     │              ISOLATED RWA POOL                   │
     │   LTV Rules | Borrow Caps | Liquidation Logic    │
     └──────────────────────────────────────────────────┘
                              │
                (5) Borrow Stable Liquidity
                              │
                              ▼
             ┌────────────────────────────────────┐
             │            USER WALLET              │
             │ USDC | PYUSD | EURC | others        │
             └────────────────────────────────────┘

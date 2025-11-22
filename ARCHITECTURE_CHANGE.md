# 🔄 Cambio de Arquitectura: ZK Verification en RWA Token (no Oracle)

## ✅ ¿Qué se cambió?

La implementación de verificación ZK se movió de **`rwa-oracle`** a **`rwa-token`**.

### Razón del cambio:
- ✅ **Más sentido lógico**: El token es quien necesita verificar precios al mintear
- ✅ **Mejor seguridad**: Verificación ocurre en el momento crítico (mint)
- ✅ **Arquitectura limpia**: Oracle solo provee datos, Token verifica y mintea
- ✅ **Audit trail**: Metadata de mints con ZK proofs guardada en token

## 📦 Archivos Implementados

### Contrato RWA Token
```
contracts/rwa-token/src/
├── zk_verifier.rs          [NUEVO] - 300+ líneas
├── token.rs                [MODIFICADO] - +140 líneas  
├── error.rs                [MODIFICADO] - +9 errores
└── lib.rs                  [MODIFICADO] - Export zk_verifier
```

### Backend TypeScript
```
src/
└── publisher.ts            [MODIFICADO] - Documentado para usar token
```

### Documentación
```
./
├── IMPLEMENTATION_SUMMARY.md      [ACTUALIZADO]
├── DEPLOY_ZK_ORACLE.md           [Necesita actualización]
└── ZK_VERIFICATION_TECHNICAL.md  [Necesita actualización]
└── ARCHITECTURE_CHANGE.md        [ESTE ARCHIVO]
```

## 🏗️ Nueva Arquitectura

```
┌──────────────────────────────────────────────────────────┐
│                     OFF-CHAIN                             │
│  1. Fetch prices (AlphaVantage + Finnhub)               │
│  2. Generate ZK proof (Noir + bb)                        │
│  3. Verify proof off-chain (bb verify)                   │
│  4. Create Poseidon commitment                           │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│                RWA ORACLE CONTRACT                        │
│  - Stores price feeds (SEP-40)                           │
│  - Provides price data                                    │
│  - NO ZK verification (just data provider)               │
└──────────────────────────────────────────────────────────┘
                        │
                        ▼ (read prices)
┌──────────────────────────────────────────────────────────┐
│                RWA TOKEN CONTRACT                         │
│  ✅ ZK PROOF VERIFICATION HERE                           │
│  - mint_with_proof(to, amount, price, proof, ...)       │
│  - Verifies proof structure                              │
│  - Validates public inputs                               │
│  - Prevents replay attacks                               │
│  - Stores mint metadata                                  │
│  - THEN mints tokens                                     │
└──────────────────────────────────────────────────────────┘
```

## 🔑 Métodos Clave (RWA Token)

### Minteo con ZK Proof
```rust
pub fn mint_with_proof(
    env: Env,
    to: Address,              // Recipient
    amount: i128,             // Tokens to mint
    price: i128,              // Verified price (7 decimals)
    timestamp: u64,           // Unix timestamp
    commitment: Bytes,        // Poseidon hash
    proof_data: Bytes,        // ZK proof (13-15KB)
    public_inputs: Vec<u32>,  // Circuit outputs
) -> Result<(), Error>
```

### Consultas
```rust
pub fn get_mint_metadata(env: Env, mint_id: u32) 
    -> Option<(Address, i128, i128, u64, Bytes, Bytes, bool)>

pub fn is_mint_verified(env: Env, mint_id: u32) -> bool

pub fn is_proof_used(env: Env, proof_hash: BytesN<32>) -> bool
```

## 📋 Pasos Siguientes

### 1. Compilar y Desplegar Token
```bash
cd contracts/rwa-token
soroban contract build
soroban contract deploy --wasm target/wasm32-unknown-unknown/release/rwa_token.wasm --source your-key --network testnet
```

### 2. Inicializar Token
```bash
soroban contract invoke \
  --id TOKEN_CONTRACT_ID \
  --source your-key \
  --network testnet \
  -- \
  __constructor \
  --admin YOUR_ADDRESS \
  --asset_contract ORACLE_CONTRACT_ID \
  --pegged_asset TSLA \
  --name "Tesla RWA Token" \
  --symbol "rwaTSLA" \
  --decimals 7
```

### 3. Generar Bindings TypeScript
```bash
mkdir -p packages/rwa-token/src
cd packages/rwa-token
soroban contract bindings typescript \
  --network testnet \
  --contract-id TOKEN_CONTRACT_ID \
  --output-dir src
```

### 4. Actualizar Publisher
```typescript
// src/publisher.ts

// Cambiar import
import { Client } from "rwa-token";

// Actualizar método
const tx = await this.client.mint_with_proof({
  to: recipientAddress,
  amount: BigInt(tokensToMint),
  price: BigInt(params.price),
  timestamp: BigInt(params.timestamp),
  commitment: Buffer.from(params.commit, 'hex'),
  proof_data: Buffer.from(params.proof, 'hex'),
  public_inputs: publicInputsArray,
});
```

### 5. Actualizar .env
```env
# Agregar
TOKEN_CONTRACT_ID=CXXXXXX...
RECIPIENT_ADDRESS=GXXXXXX...
TOKENS_TO_MINT_PER_UPDATE=1000_0000000

# Mantener
ORACLE_CONTRACT_ID=CXXXXXX...  # Para leer precios
ORACLE_SECRET_KEY=SBXXXXXX...
```

## 🔄 Workflow Completo

```typescript
// scheduler.ts - executeUpdate()

// 1. Fetch prices
const dualPrices = await fetcher.fetchBothPrices();

// 2. Generate & verify ZK proof
const commitWithProof = await generateCommitWithProof(
  dualPrices, timestamp, assetId
);

// 3. Mint tokens with proof verification
const result = await publisher.mintWithProof({
  recipient: process.env.RECIPIENT_ADDRESS,
  amount: process.env.TOKENS_TO_MINT,
  price: commitWithProof.verifiedPrice,
  timestamp: commitWithProof.timestamp,
  commit: commitWithProof.commitment,
  proof: commitWithProof.proof.proofHex,
  proofPublicInputs: JSON.stringify([commitWithProof.proof.publicInputs.finalPrice]),
});

// 4. Tokens minted!
console.log(`Minted ${amount} tokens with ZK verification`);
console.log(`TX: ${result.txHash}`);
```

## ⚠️ Importante

### Archivos del Oracle NO se modificaron
Los archivos en `contracts/rwa-oracle/` que se modificaron anteriormente pueden:
1. **Revertirse** - Ya que la implementación correcta está en rwa-token
2. **Mantenerse** - Si quieres tener ambas opciones (oracle con ZK + token con ZK)

### Archivos en rwa-oracle que se pueden revertir:
- `contracts/rwa-oracle/src/zk_verifier.rs` - Eliminar o mantener
- `contracts/rwa-oracle/src/error.rs` - Revertir errores ZK agregados
- `contracts/rwa-oracle/src/lib.rs` - Revertir exports ZK
- `contracts/rwa-oracle/src/rwa_oracle.rs` - Revertir métodos ZK

### Decisión recomendada:
**Mantener Oracle simple** (sin ZK) - Solo provee datos
**Token maneja ZK** - Verifica y mintea

## 🎯 Ventajas de esta Arquitectura

| Ventaja | Descripción |
|---------|-------------|
| **Separación de responsabilidades** | Oracle = Data, Token = Logic |
| **Seguridad en el punto crítico** | Verificación al mintear, no al guardar precio |
| **Escalabilidad** | Múltiples tokens pueden usar el mismo oracle |
| **Audit trail claro** | Cada mint tiene metadata ZK asociada |
| **Gas optimizado** | Solo verifica cuando realmente se usa (mint) |

## 📞 Soporte

Si tienes dudas sobre la nueva arquitectura:
1. Revisa `contracts/rwa-token/src/token.rs` línea 150+
2. Revisa `contracts/rwa-token/src/zk_verifier.rs`
3. Compara con implementación anterior en oracle

---

**Implementación correcta ahora en `rwa-token` ✅**

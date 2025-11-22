# 🚀 Deploy Guide: ZK-Verified Oracle

Esta guía te muestra cómo compilar, desplegar y usar el contrato Oracle con verificación ZK.

## 📋 Pre-requisitos

1. **Rust y Soroban CLI instalados**
```bash
# Instalar Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Instalar Soroban CLI
cargo install --locked soroban-cli --features opt
```

2. **Stellar account con fondos (Testnet)**
```bash
# Generar keypair
stellar keys generate oracle-deployer --network testnet

# Obtener XLM de testnet
stellar keys fund oracle-deployer --network testnet
```

3. **Noir/bb instalado para ZK proofs**
```bash
# Ya deberías tenerlo instalado si el proyecto funciona
bb --version
nargo --version
```

## 🔨 Paso 1: Compilar el Contrato

```bash
cd contracts/rwa-oracle

# Compilar el contrato
soroban contract build

# El WASM compilado estará en:
# target/wasm32-unknown-unknown/release/rwa_oracle.wasm
```

### Verificar compilación:
```bash
ls -lh target/wasm32-unknown-unknown/release/rwa_oracle.wasm
# Debe mostrar el archivo (típicamente 100-300 KB)
```

## 🌐 Paso 2: Desplegar en Testnet

```bash
# Deploy el contrato
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/rwa_oracle.wasm \
  --source oracle-deployer \
  --network testnet

# Guarda el CONTRACT_ID que te retorna (empieza con 'C')
# Ejemplo: CBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Guardar CONTRACT_ID:
```bash
export ORACLE_CONTRACT_ID="CBXXX...XXX"
```

## ⚙️ Paso 3: Inicializar el Contrato

```bash
# Obtener tu public key
stellar keys address oracle-deployer

# Inicializar el contrato
soroban contract invoke \
  --id $ORACLE_CONTRACT_ID \
  --source oracle-deployer \
  --network testnet \
  -- \
  __constructor \
  --admin GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --assets '[{"tag":"Other","values":["TSLA"]},{"tag":"Other","values":["BTC"]}]' \
  --base '{"tag":"Other","values":["USD"]}' \
  --decimals 7 \
  --resolution 300
```

**Parámetros:**
- `admin`: Tu Stellar public key (empieza con 'G')
- `assets`: Lista de assets a trackear (TSLA, BTC, etc.)
- `base`: Asset base para precios (USD)
- `decimals`: Decimales (7 = 0.0000001)
- `resolution`: Intervalo en segundos (300 = 5 min)

## 📦 Paso 4: Generar TypeScript Bindings

```bash
cd ../../packages/oracle

# Regenerar bindings con el nuevo contrato
soroban contract bindings typescript \
  --network testnet \
  --contract-id $ORACLE_CONTRACT_ID \
  --output-dir src

# Esto actualizará src/index.ts con los nuevos métodos ZK
```

## 🔧 Paso 5: Configurar Variables de Entorno

Crea o actualiza tu archivo `.env`:

```bash
# API Keys para price feeds
API_KEY=tu_alphavantage_api_key
FINNHUB_API_KEY=tu_finnhub_api_key

# Asset a trackear
ASSET_ID=TSLA

# Stellar/Soroban config
SOROBAN_RPC=https://soroban-testnet.stellar.org:443
ORACLE_CONTRACT_ID=CBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
ORACLE_SECRET_KEY=SBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Logging
LOG_LEVEL=debug
PORT=4000
```

### Generar ORACLE_SECRET_KEY:
```bash
# Opción 1: Usar la misma key de deployer
stellar keys show oracle-deployer

# Opción 2: Generar una nueva key para el feeder
stellar keys generate oracle-feeder --network testnet
stellar keys fund oracle-feeder --network testnet
stellar keys show oracle-feeder
```

## ✅ Paso 6: Verificar la Instalación

```bash
# Volver al root del proyecto
cd ../..

# Probar que el contrato responde
soroban contract invoke \
  --id $ORACLE_CONTRACT_ID \
  --network testnet \
  -- \
  decimals
# Debería retornar: 7

# Probar que los bindings funcionan
npm run build
```

## 🧪 Paso 7: Probar ZK Proof End-to-End

```bash
# 1. Generar un proof de prueba
npm run circuit-full

# 2. Iniciar el oracle feeder
npm run dev

# El feeder debería:
# - Fetch prices de AlphaVantage y Finnhub
# - Generar ZK proof
# - Verificar proof off-chain
# - Publicar al contrato con set_price_with_proof()
```

### Verificar en el log que veas:
```
[COMMIT] Starting ZK proof generation...
[PROVER] Generating ZK proof using bb CLI...
[PROVER] Proof generated successfully
[COMMIT] ✓ Proof verified successfully
[PUBLISHER] Calling set_price_with_proof...
[PUBLISHER] ✅ Price published with ZK verification
```

## 🔍 Paso 8: Verificar Datos On-Chain

```bash
# Ver el último precio publicado
soroban contract invoke \
  --id $ORACLE_CONTRACT_ID \
  --network testnet \
  -- \
  lastprice \
  --asset '{"tag":"Other","values":["TSLA"]}'

# Ver si un precio fue ZK-verificado
soroban contract invoke \
  --id $ORACLE_CONTRACT_ID \
  --network testnet \
  -- \
  is_price_verified \
  --asset_id '{"tag":"Other","values":["TSLA"]}' \
  --timestamp 1700000000

# Verificar metadata del precio
soroban contract invoke \
  --id $ORACLE_CONTRACT_ID \
  --network testnet \
  -- \
  get_price_metadata \
  --asset_id '{"tag":"Other","values":["TSLA"]}' \
  --timestamp 1700000000
```

## 🔄 Actualizar Contrato Existente

Si ya tienes un contrato desplegado y quieres actualizarlo:

```bash
# 1. Compilar nuevo WASM
cd contracts/rwa-oracle
soroban contract build

# 2. Obtener WASM hash
soroban contract install \
  --wasm target/wasm32-unknown-unknown/release/rwa_oracle.wasm \
  --source oracle-deployer \
  --network testnet

# Esto te dará un WASM_HASH

# 3. Upgrade el contrato existente
soroban contract invoke \
  --id $ORACLE_CONTRACT_ID \
  --source oracle-deployer \
  --network testnet \
  -- \
  upgrade \
  --new_wasm_hash HASH_DEL_PASO_2

# 4. Regenerar bindings
cd ../../packages/oracle
soroban contract bindings typescript \
  --network testnet \
  --contract-id $ORACLE_CONTRACT_ID \
  --output-dir src
```

## 📊 Monitoreo y Debugging

### Ver logs del feeder:
```bash
npm run dev 2>&1 | tee oracle.log
```

### Probar force-update manual:
```bash
# En otra terminal
curl http://localhost:4000/force-update
```

### Ver transacciones en Stellar Expert:
```
https://stellar.expert/explorer/testnet/contract/{ORACLE_CONTRACT_ID}
```

## 🛡️ Seguridad

### Importante sobre ZK Verification:

⚠️ **La verificación ZK actual es ESTRUCTURAL, no criptográfica completa**

Razones:
- Soroban no tiene precompiles BN254 pairing (como Ethereum)
- Verificación completa requiere ~1-5M instrucciones
- Límite de Soroban: ~100k-500k instrucciones/tx

**Modelo de seguridad:**
1. ✅ Proof se verifica OFF-CHAIN antes de enviar
2. ✅ On-chain valida estructura y previene replay
3. ✅ Hash de proof se guarda para auditoría
4. ✅ Public inputs se validan contra precio enviado

**Para producción, considera:**
- Usar recursive SNARKs (Halo2, Nova)
- Agregar trusted oracle network
- Usar Stellar validators como verificadores

## 🐛 Troubleshooting

### Error: "invalid encoded string"
```bash
# Tu ORACLE_SECRET_KEY es inválida
# Genera una nueva:
stellar keys generate oracle-feeder --network testnet
```

### Error: "Asset not found"
```bash
# El asset no fue agregado en __constructor
# Agrégalo:
soroban contract invoke \
  --id $ORACLE_CONTRACT_ID \
  --source oracle-deployer \
  --network testnet \
  -- \
  add_assets \
  --assets '[{"tag":"Other","values":["NUEVO_ASSET"]}]'
```

### Error: "Proof verification failed"
```bash
# El proof off-chain no es válido
# Verifica:
cd src/circuits
bb verify -p ./target/proof -k ./target/vk
```

### Error: "Transaction failed"
```bash
# Ver detalles del error en Stellar Expert
# O aumentar el fee:
# En publisher.ts, cambiar fee: "100" a fee: "10000"
```

## 📚 Próximos Pasos

1. **Agregar más assets** al Oracle
2. **Implementar fallback** a método legacy sin proof
3. **Crear dashboard** para monitorear precios
4. **Integrar con lending protocol** para RWA
5. **Optimizar gas costs** del proof verification

## 🤝 Soporte

Si tienes problemas:
1. Revisa los logs: `npm run dev`
2. Verifica el contrato en Stellar Expert
3. Testea el circuit: `npm run circuit-full`
4. Revisa el archivo `oracle.log`

---

**✨ ¡Felicidades! Ahora tienes un Oracle con verificación ZK funcionando en Stellar.**

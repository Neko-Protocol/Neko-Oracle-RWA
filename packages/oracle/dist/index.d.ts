import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions, Result } from '@stellar/stellar-sdk/contract';
import type { u32, u64, i128, Option } from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk';
export * as contract from '@stellar/stellar-sdk/contract';
export * as rpc from '@stellar/stellar-sdk/rpc';
export declare const networks: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly contractId: "CAY3X56OJ3TJ76HEFHU3NLKM6NZORLCJABI3ONG27Z7APF5HVM4ADUJO";
    };
};
export interface RWAOracleStorage {
    asset_types: Map<Asset, RWAAssetType>;
    assets: Array<Asset>;
    base: Asset;
    decimals: u32;
    last_timestamp: u64;
    resolution: u32;
    rwa_metadata: Map<string, RWAMetadata>;
}
/**
 * RWA Asset Type based on SEP-0001 anchor_asset_type
 */
export type RWAAssetType = {
    tag: "Fiat";
    values: void;
} | {
    tag: "Crypto";
    values: void;
} | {
    tag: "Stock";
    values: void;
} | {
    tag: "Bond";
    values: void;
} | {
    tag: "Commodity";
    values: void;
} | {
    tag: "RealEstate";
    values: void;
} | {
    tag: "Nft";
    values: void;
} | {
    tag: "Other";
    values: void;
};
/**
 * Compliance status for regulated assets (SEP-0008)
 */
export type ComplianceStatus = {
    tag: "NotRegulated";
    values: void;
} | {
    tag: "RequiresApproval";
    values: void;
} | {
    tag: "Approved";
    values: void;
} | {
    tag: "Pending";
    values: void;
} | {
    tag: "Rejected";
    values: void;
};
/**
 * Regulatory information for RWA assets
 */
export interface RegulatoryInfo {
    /**
   * Approval criteria for transactions
   */
    approval_criteria: Option<string>;
    /**
   * Approval server URL if regulated (SEP-0008)
   */
    approval_server: Option<string>;
    /**
   * Current compliance status
   */
    compliance_status: ComplianceStatus;
    /**
   * Whether this asset is regulated (SEP-0008)
   */
    is_regulated: boolean;
    /**
   * License number if applicable
   */
    license_number: Option<string>;
    /**
   * License type if applicable
   */
    license_type: Option<string>;
    /**
   * Licensing authority if applicable
   */
    licensing_authority: Option<string>;
}
/**
 * Tokenization details for RWA
 */
export interface TokenizationInfo {
    /**
   * Whether the asset is tokenized
   */
    is_tokenized: boolean;
    /**
   * Token contract address if tokenized
   */
    token_contract: Option<string>;
    /**
   * Tokenization date timestamp
   */
    tokenization_date: Option<u64>;
    /**
   * Total supply of tokens
   */
    total_supply: Option<i128>;
    /**
   * Underlying asset identifier
   */
    underlying_asset: Option<string>;
}
/**
 * Complete RWA metadata
 */
export interface RWAMetadata {
    /**
   * Asset identifier (code/symbol)
   */
    asset_id: string;
    /**
   * RWA asset type
   */
    asset_type: RWAAssetType;
    /**
   * Creation timestamp
   */
    created_at: u64;
    /**
   * Asset description
   */
    description: string;
    /**
   * Issuer address or identifier
   */
    issuer: string;
    /**
   * Additional metadata as key-value pairs
   */
    metadata: Array<readonly [string, string]>;
    /**
   * Asset name
   */
    name: string;
    /**
   * Regulatory information
   */
    regulatory_info: RegulatoryInfo;
    /**
   * Tokenization information
   */
    tokenization_info: TokenizationInfo;
    /**
   * Underlying asset code/symbol ("USD", "TREASURY_2024", etc.)
   */
    underlying_asset: string;
    /**
   * Last update timestamp
   */
    updated_at: u64;
}
export declare const Errors: {
    /**
     * Asset not found
     */
    1: {
        message: string;
    };
    /**
     * Asset already exists
     */
    2: {
        message: string;
    };
    /**
     * Invalid RWA type
     */
    3: {
        message: string;
    };
    /**
     * Invalid metadata
     */
    4: {
        message: string;
    };
    /**
     * Unauthorized access
     */
    6: {
        message: string;
    };
    /**
     * Invalid compliance data
     */
    7: {
        message: string;
    };
};
/**
 * Quoted asset definition (SEP-40 compatible)
 */
export type Asset = {
    tag: "Stellar";
    values: readonly [string];
} | {
    tag: "Other";
    values: readonly [string];
};
/**
 * Price record definition (SEP-40 compatible)
 */
export interface PriceData {
    price: i128;
    timestamp: u64;
}
export interface Client {
    /**
     * Construct and simulate a upgrade transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Upgrade the contract to new wasm
     */
    upgrade: ({ new_wasm_hash }: {
        new_wasm_hash: Buffer;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a set_rwa_metadata transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Register or update RWA metadata
     */
    set_rwa_metadata: ({ asset_id, metadata }: {
        asset_id: string;
        metadata: RWAMetadata;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a update_regulatory_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Update regulatory/compliance information
     */
    update_regulatory_info: ({ asset_id, regulatory_info }: {
        asset_id: string;
        regulatory_info: RegulatoryInfo;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a update_tokenization_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Update tokenization information
     */
    update_tokenization_info: ({ asset_id, tokenization_info }: {
        asset_id: string;
        tokenization_info: TokenizationInfo;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Result<void>>>;
    /**
     * Construct and simulate a get_rwa_metadata transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Get complete RWA metadata for an asset
     */
    get_rwa_metadata: ({ asset_id }: {
        asset_id: string;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Result<RWAMetadata>>>;
    /**
     * Construct and simulate a get_rwa_asset_type transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Get RWA asset type for an asset
     */
    get_rwa_asset_type: ({ asset }: {
        asset: Asset;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Option<RWAAssetType>>>;
    /**
     * Construct and simulate a get_regulatory_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Get regulatory information for an RWA
     */
    get_regulatory_info: ({ asset_id }: {
        asset_id: string;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Result<RegulatoryInfo>>>;
    /**
     * Construct and simulate a get_tokenization_info transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Get tokenization information for an RWA
     */
    get_tokenization_info: ({ asset_id }: {
        asset_id: string;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Result<TokenizationInfo>>>;
    /**
     * Construct and simulate a is_regulated transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Check if an asset is regulated (SEP-0008)
     */
    is_regulated: ({ asset_id }: {
        asset_id: string;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Result<boolean>>>;
    /**
     * Construct and simulate a get_all_rwa_assets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     * Get all registered RWA asset IDs
     */
    get_all_rwa_assets: (options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Array<string>>>;
    /**
     * Construct and simulate a add_assets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    add_assets: ({ assets }: {
        assets: Array<Asset>;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a set_asset_price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    set_asset_price: ({ asset_id, price, timestamp }: {
        asset_id: Asset;
        price: i128;
        timestamp: u64;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a assets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    assets: (options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Array<Asset>>>;
    /**
     * Construct and simulate a base transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    base: (options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Asset>>;
    /**
     * Construct and simulate a decimals transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    decimals: (options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<u32>>;
    /**
     * Construct and simulate a lastprice transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    lastprice: ({ asset }: {
        asset: Asset;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Option<PriceData>>>;
    /**
     * Construct and simulate a price transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    price: ({ asset, timestamp }: {
        asset: Asset;
        timestamp: u64;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Option<PriceData>>>;
    /**
     * Construct and simulate a prices transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    prices: ({ asset, records }: {
        asset: Asset;
        records: u32;
    }, options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<Option<Array<PriceData>>>>;
    /**
     * Construct and simulate a resolution transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    resolution: (options?: {
        /**
         * The fee to pay for the transaction. Default: BASE_FEE
         */
        fee?: number;
        /**
         * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
         */
        timeoutInSeconds?: number;
        /**
         * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
         */
        simulate?: boolean;
    }) => Promise<AssembledTransaction<u32>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Constructor/Initialization Args for the contract's `__constructor` method */
    { admin, assets, base, decimals, resolution }: {
        admin: string;
        assets: Array<Asset>;
        base: Asset;
        decimals: u32;
        resolution: u32;
    }, 
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        upgrade: (json: string) => AssembledTransaction<null>;
        set_rwa_metadata: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        update_regulatory_info: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        update_tokenization_info: (json: string) => AssembledTransaction<Result<void, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_rwa_metadata: (json: string) => AssembledTransaction<Result<RWAMetadata, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_rwa_asset_type: (json: string) => AssembledTransaction<Option<RWAAssetType>>;
        get_regulatory_info: (json: string) => AssembledTransaction<Result<RegulatoryInfo, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_tokenization_info: (json: string) => AssembledTransaction<Result<TokenizationInfo, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        is_regulated: (json: string) => AssembledTransaction<Result<boolean, import("@stellar/stellar-sdk/contract").ErrorMessage>>;
        get_all_rwa_assets: (json: string) => AssembledTransaction<string[]>;
        add_assets: (json: string) => AssembledTransaction<null>;
        set_asset_price: (json: string) => AssembledTransaction<null>;
        assets: (json: string) => AssembledTransaction<Asset[]>;
        base: (json: string) => AssembledTransaction<Asset>;
        decimals: (json: string) => AssembledTransaction<number>;
        lastprice: (json: string) => AssembledTransaction<Option<PriceData>>;
        price: (json: string) => AssembledTransaction<Option<PriceData>>;
        prices: (json: string) => AssembledTransaction<Option<PriceData[]>>;
        resolution: (json: string) => AssembledTransaction<number>;
    };
}

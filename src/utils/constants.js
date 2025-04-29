import algosdk from "algosdk";
import { PeraWalletConnect } from "@perawallet/connect";

const config = {
    algodToken: "",
    algodServer: "https://node.testnet.algoexplorerapi.io",
    algodPort: "",
    indexerToken: "",
    indexerServer: "https://algoindexer.testnet.algoexplorerapi.io",
    indexerPort: "",
}

export const algodClient = new algosdk.Algodv2(config.algodToken, config.algodServer, config.algodPort)

export const indexerClient = new algosdk.Indexer(config.indexerToken, config.indexerServer, config.indexerPort);

export const peraWallet = new PeraWalletConnect({
    chainId: 416002 // TestNet chain ID
});

peraWallet.reconnectSession();

export const minRound = 21540981;

// https://github.com/algorandfoundation/ARCs/blob/main/ARCs/arc-0002.md
export const propertyDappNote = "property-dapp:uv2"

// Maximum local storage allocation, immutable
export const numLocalInts = 0;
export const numLocalBytes = 0;
// Maximum global storage allocation, immutable
export const numGlobalInts = 3;
export const numGlobalBytes = 3;

export const ALGORAND_DECIMALS = 6;
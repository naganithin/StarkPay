import {
  SwapperFactory,
  BitcoinNetwork,
  Tokens,
  FromBTCSwapState,
  IBitcoinWallet,
} from "@atomiqlabs/sdk";
import {
  SingleAddressBitcoinWallet,
  SpvFromBTCSwap,
} from "@atomiqlabs/sdk-bitcoin";
import {
  RpcProviderWithRetries,
  SmartContractSignerStarknet,
} from "@atomiqlabs/chain-starknet";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const STARKNET_KEY_FILE = join(__dirname, "starknet.key");
const BITCOIN_KEY_FILE = join(__dirname, "bitcoin.key");

// --- Helper to load or create wallets ---
async function getStarknetWallet(): Promise<SmartContractSignerStarknet> {
  const provider = new RpcProviderWithRetries({
    nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  });

  if (existsSync(STARKNET_KEY_FILE)) {
    const pk = readFileSync(STARKNET_KEY_FILE, "utf8").trim();
    console.log("Loaded existing Starknet key");
    return new SmartContractSignerStarknet(provider, pk);
  } else {
    const wallet = await SmartContractSignerStarknet.createRandom(provider);
    writeFileSync(STARKNET_KEY_FILE, wallet.privateKey);
    console.log("Created new Starknet wallet");
    return wallet;
  }
}

async function getBitcoinWallet(): Promise<IBitcoinWallet> {
  if (existsSync(BITCOIN_KEY_FILE)) {
    const pk = readFileSync(BITCOIN_KEY_FILE, "utf8").trim();
    console.log("Loaded existing Bitcoin wallet");
    return new SingleAddressBitcoinWallet(BitcoinNetwork.TESTNET4, pk);
  } else {
    const wallet = await SingleAddressBitcoinWallet.createRandom(BitcoinNetwork.TESTNET4);
    writeFileSync(BITCOIN_KEY_FILE, wallet.privateKey);
    console.log("Created new Bitcoin wallet");
    return wallet;
  }
}

// --- Main swap function ---
async function main() {
  console.log("🚀 Starting BTC → STRK swap test...");

  const starknetWallet = await getStarknetWallet();
  const btcWallet = await getBitcoinWallet();

  console.log("\n🔹 Starknet wallet address:", await starknetWallet.getAddress());
  console.log("🔹 Bitcoin testnet address:", await btcWallet.getAddress());

  console.log("\n💰 Fund your wallets before running swap:");
  console.log("   - Send a small amount of BTC testnet to:", await btcWallet.getAddress());
  console.log("   - Send a small amount of STRK (Sepolia) to:", await starknetWallet.getAddress());

  const swapperFactory = await SwapperFactory.createDefault({
    bitcoinNetwork: BitcoinNetwork.TESTNET4,
    intermediaries: ["https://api.atomiq.exchange"], // reliable public node
  });

  const swapper = await swapperFactory.getSwapper(Tokens.BTC.BTC, Tokens.STARKNET.STRK);

  console.log("\n⏳ Creating swap...");
  const swap: SpvFromBTCSwap = await swapper.createSwap(
    btcWallet,
    Tokens.STARKNET.STRK,
    starknetWallet
  );

  swap.events.on("swapState", (s) => {
    console.log("⚙️  Swap state:", FromBTCSwapState[s.getState()]);
  });

  console.log("✅ Swap created! Send BTC when prompted in the next log messages.");
}

main().catch((err) => {
  console.error("❌ Swap error:", err.message || err);
});

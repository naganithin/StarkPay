import {
    AbstractSigner,
    BitcoinNetwork,
    FeeType,
    IBitcoinWallet,
    SCToken,
    SingleAddressBitcoinWallet,
    SpvFromBTCSwapState,
    SwapperFactory,
} from "@atomiqlabs/sdk";
import {
    RpcProviderWithRetries,
    StarknetInitializer,
    StarknetInitializerType,
    StarknetKeypairWallet,
    StarknetSigner
} from "@atomiqlabs/chain-starknet";
import {SqliteStorageManager, SqliteUnifiedStorage} from "@atomiqlabs/storage-sqlite";
import * as fs from "fs";

// Create swapper factory, initializing only with Starknet
const Factory = new SwapperFactory<[StarknetInitializerType]>([StarknetInitializer]);
const Tokens = Factory.Tokens;

// Initialize RPC connection for Starknet
const starknetRpc = new RpcProviderWithRetries({nodeUrl: "https://starknet-sepolia.public.blastapi.io/rpc/v0_8"});

// Create swapper instance
const swapper = Factory.newSwapper({
    chains: {
        STARKNET: {
            rpcUrl: starknetRpc
        }
    },
    bitcoinNetwork: BitcoinNetwork.TESTNET4,

    // By default the SDK uses browser storage, so we need to explicitly specify the sqlite storage for NodeJS, these lines are not required in browser environment
    swapStorage: chainId => new SqliteUnifiedStorage("CHAIN_"+chainId+".sqlite3"),
    chainStorageCtor: name => new SqliteStorageManager("STORE_"+name+".sqlite3"),
});

// Create random signers or load them from files if already generated
const starknetKey = fs.existsSync("starknet.key") ? fs.readFileSync("starknet.key").toString() : StarknetKeypairWallet.generateRandomPrivateKey();
const starknetSigner = new StarknetSigner(new StarknetKeypairWallet(starknetRpc, starknetKey));
fs.writeFileSync("starknet.key", starknetKey);
console.log("Starknet wallet address (transfer STRK here for TX fees): "+starknetSigner.getAddress());

const bitcoinKey = fs.existsSync("bitcoin.key") ? fs.readFileSync("bitcoin.key").toString() : SingleAddressBitcoinWallet.generateRandomPrivateKey();
const bitcoinSigner = new SingleAddressBitcoinWallet(swapper.bitcoinRpc, swapper.bitcoinNetwork, bitcoinKey);
fs.writeFileSync("bitcoin.key", bitcoinKey);
console.log("Bitcoin wallet address (transfer BTC here for TX fees): "+bitcoinSigner.getReceiveAddress());

// Function to check balances of Starknet and Bitcoin wallets
async function checkBalances(starknetSigner: StarknetSigner, bitcoinSigner: IBitcoinWallet) {
    try {
        // Check spendable balance of the Starknet wallet (in STRK)
        const strkBalance = await swapper.Utils.getSpendableBalance(starknetSigner, Tokens.STARKNET.STRK);
        console.log(`Starknet wallet balance: ${strkBalance} STRK`);

        // Check spendable balance of the Bitcoin wallet (in BTC)
        const { balance: btcBalance, feeRate: btcFeeRate } = await swapper.Utils.getBitcoinSpendableBalance(bitcoinSigner, "STARKNET");
        console.log(`Bitcoin wallet balance: ${btcBalance} BTC (Fee rate: ${btcFeeRate} sats/vB)`);
    } catch (e) {
        console.error("Error checking balances: ", e);
    }
}

// Swap of on-chain BTC -> Starknet assets (uses new swap protocol)
async function swapFromBTCStarknet(btcWallet: IBitcoinWallet, dstToken: SCToken<"STARKNET">, signer: StarknetSigner) {
    // Retrieve swap limits before executing the swap
    const swapLimits = swapper.getSwapLimits(Tokens.BITCOIN.BTC, dstToken);
    console.log("Swap limits, input min: "+swapLimits.input.min+" input max: "+swapLimits.input.max);
    console.log("Swap limits, output min: "+swapLimits.output.min+" output max: "+swapLimits.output.max);

    // Create swap quote
    const swap = await swapper.swap(
        Tokens.BITCOIN.BTC,
        dstToken,
        3000n, // 3000 sats (0.00003 BTC)
        true,
        undefined,
        signer.getAddress(),
        {
            // gasAmount: 1_000_000_000_000_000_000n // Optional gas drop request
        }
    );

    // Log swap details
    console.log("Swap created "+swap.getId()+":");
    console.log("   Input: "+swap.getInputWithoutFee());
    console.log("   Fees: "+swap.getFee().amountInSrcToken);
    for(let fee of swap.getFeeBreakdown()) {
        console.log("       - "+FeeType[fee.type]+": "+fee.fee.amountInSrcToken);
    }
    console.log("   Input with fees: "+swap.getInput());
    console.log("   Output: "+swap.getOutput());
    console.log("   Quote expiry: "+swap.getQuoteExpiry()+" (in "+(swap.getQuoteExpiry()-Date.now())/1000+" seconds)");
    console.log("   Price:");
    console.log("       - swap: "+swap.getPriceInfo().swapPrice);
    console.log("       - market: "+swap.getPriceInfo().marketPrice);
    console.log("       - difference: "+swap.getPriceInfo().difference);
    console.log("   Minimum bitcoin transaction fee rate: "+swap.minimumBtcFeeRate+" sats/vB");

    // Add a listener for swap state changes
    swap.events.on("swapState", (swap) => {
        console.log("Swap state changed: ", SpvFromBTCSwapState[swap.getState()]);
    });

    // Send the bitcoin transaction
    console.log("Sending bitcoin transaction...");
    const bitcoinTxId = await swap.sendBitcoinTransaction(btcWallet);
    console.log("Bitcoin transaction sent: "+bitcoinTxId);

    // Wait for the bitcoin on-chain transaction to confirm
    await swap.waitForBitcoinTransaction(
        undefined, 5,
        (txId, confirmations, targetConfirmations, txEtaMs) => {
            if(txId==null) return;
            console.log("Swap transaction "+txId+" ("+confirmations+"/"+targetConfirmations+") ETA: "+(txEtaMs/1000)+"s");
        }
    );

    console.log("Bitcoin transaction "+bitcoinTxId+" confirmed! Waiting for automatic claim by the watchtowers...");
    try {
        await swap.waitTillClaimedOrFronted(AbortSignal.timeout(30*1000));
        console.log("Successfully claimed by the watchtower!");
    } catch (e) {
        console.log("Swap not claimed by watchtowers, claiming manually!");
        await swap.claim(signer);
        console.log("Successfully claimed!");
    }
}

async function main() {
    // Initialize the swapper instance
    await swapper.init();

    // Check wallet balances before executing the swap
    await checkBalances(starknetSigner, bitcoinSigner);

    // Execute the swap
    await swapFromBTCStarknet(bitcoinSigner, Tokens.STARKNET.STRK, starknetSigner);

    // Stop the swapper instance
    await swapper.stop();
}

main();



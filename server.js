import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const TOKEN_MINT = "CyFoxoQhcjJFQJtz32SaYZFUfs1xLMXoXz3nBSytGvcD"; // CyberFox Token Mint
const MIN_REQUIRED_TOKENS = 750000;

app.use(cors());
app.use(express.json());

/** ✅ **Endpoint for Fetching CyberFox Token Balance** **/
app.post("/validate-token", async (req, res) => {
    const { wallet, apiKey } = req.body;

    console.log("🔹 Token Request Received:");
    console.log("✅ Wallet Address:", wallet);
    console.log("✅ API Key:", apiKey ? apiKey : "❌ No API Key Provided");

    if (!wallet) return res.status(400).json({ error: "Wallet address required." });
    if (!apiKey || apiKey.trim() === "") {
        console.error("❌ Missing API Key in request.");
        return res.status(400).json({ error: "API key is missing. Please enter a valid API key." });
    }

    const SOLANA_RPC_URL = `https://rpc.helius.xyz/?api-key=${apiKey}`;

    try {
        // ✅ Fetch CyberFox Token Balance
        const tokenResponse = await fetch(SOLANA_RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getTokenAccountsByOwner",
                params: [wallet, { mint: TOKEN_MINT }, { encoding: "jsonParsed" }],
            }),
        });

        const tokenData = await tokenResponse.json();
        console.log("🔹 Helius API Token Response:", JSON.stringify(tokenData, null, 2));

        let tokenBalance = 0;

        if (tokenData.result && tokenData.result.value.length > 0) {
            tokenBalance = parseFloat(tokenData.result.value[0].account.data.parsed.info.tokenAmount.uiAmount);
        }

        console.log(`✅ CyberFox Token Balance: ${tokenBalance}`);

        // ✅ **ENFORCE TOKEN GATING - BLOCK USERS BELOW # TOKENS**
        if (tokenBalance < MIN_REQUIRED_TOKENS) {
            console.warn(`❌ Access Denied: User only has ${tokenBalance} CyberFox tokens.`);
            return res.status(403).json({ error: "❌ Insufficient CyberFox tokens. Buy more to enable the extension." });
        }

        console.log(`✅ Access Granted: User has ${tokenBalance} CyberFox tokens.`);

        return res.json({ success: true, tokenBalance });

    } catch (error) {
        console.error("❌ Error fetching CyberFox token balance:", error);
        return res.status(500).json({ error: "Internal Server Error while fetching token balance." });
    }
});

/** ✅ **Endpoint for Fetching SOL Balance** **/
app.post("/validate-sol", async (req, res) => {
    const { wallet, apiKey } = req.body;

    console.log("🔹 SOL Request Received:");
    console.log("✅ Wallet Address:", wallet);
    console.log("✅ API Key:", apiKey ? apiKey : "❌ No API Key Provided");

    if (!wallet) return res.status(400).json({ error: "Wallet address required." });
    if (!apiKey || apiKey.trim() === "") {
        console.error("❌ Missing API Key in request.");
        return res.status(400).json({ error: "API key is missing. Please enter a valid API key." });
    }

    const SOLANA_RPC_URL = `https://rpc.helius.xyz/?api-key=${apiKey}`;

    try {
        // ✅ Fetch SOL Balance
        const solResponse = await fetch(SOLANA_RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 2,
                method: "getBalance",
                params: [wallet],
            }),
        });

        const solData = await solResponse.json();
        console.log("🔹 Helius API SOL Response:", JSON.stringify(solData, null, 2));

        let solBalance = 0;
        if (solData.result && typeof solData.result.value !== "undefined") {
            solBalance = (solData.result.value / 1e9).toFixed(3); // Convert from lamports to SOL
        }

        console.log(`✅ SOL Balance for ${wallet}: ${solBalance} SOL`);

        return res.json({ success: true, solBalance });

    } catch (error) {
        console.error("❌ Error fetching SOL balance:", error);
        return res.status(500).json({ error: "Internal Server Error while fetching SOL balance." });
    }
});

// ✅ Start the server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

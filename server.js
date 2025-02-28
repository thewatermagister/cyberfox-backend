import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080; // Railway assigns PORT automatically

const TOKEN_MINT = "CyFoxoQhcjJFQJtz32SaYZFUfs1xLMXoXz3nBSytGvcD"; // CyberFox Token Mint
const MIN_REQUIRED_TOKENS = 750000;

app.use(cors());
app.use(express.json());

/** ✅ **Endpoint for Fetching CyberFox Token Balance (Fixed)** **/
app.post("/validate-token", async (req, res) => {
    const { wallet, apiKey } = req.body;

    console.log("🔹 Token Request Received:");
    console.log("✅ Wallet Address:", wallet);
    console.log("✅ API Key:", apiKey ? "✅ Provided" : "❌ Not Provided");

    if (!wallet) return res.status(400).json({ success: false, error: "Wallet address required." });
    if (!apiKey || apiKey.trim() === "") {
        console.error("❌ Missing API Key in request.");
        return res.status(400).json({ success: false, error: "API key is missing. Please enter a valid API key." });
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

        // ✅ **ENFORCE TOKEN GATING - STRICTLY BLOCK USERS BELOW THE THRESHOLD**
        if (tokenBalance < MIN_REQUIRED_TOKENS) {
            console.warn(`❌ Access Denied: User only has ${tokenBalance} CyberFox tokens.`);
            return res.status(403).json({ success: false, error: "❌ Insufficient CyberFox tokens. Buy more to enable the extension." });
        }

        console.log(`✅ Access Granted: User has ${tokenBalance} CyberFox tokens.`);

        return res.json({ success: true, tokenBalance });

    } catch (error) {
        console.error("❌ Error fetching CyberFox token balance:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error while fetching token balance." });
    }
});

/** ✅ **Endpoint for Fetching SOL Balance** **/
app.post("/validate-sol", async (req, res) => {
    try {
        const { wallet, apiKey } = req.body;

        console.log("🔹 SOL Request Received:");
        console.log("✅ Wallet Address:", wallet);
        console.log("✅ API Key:", apiKey ? "✅ Provided" : "❌ Not Provided");

        // ✅ Validate Inputs
        if (!wallet || typeof wallet !== "string" || wallet.trim() === "") {
            console.error("❌ Invalid or missing wallet address.");
            return res.status(400).json({ success: false, error: "Invalid wallet address." });
        }

        if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
            console.error("❌ Missing API Key in request.");
            return res.status(400).json({ success: false, error: "API key is missing. Please enter a valid API key." });
        }

        const SOLANA_RPC_URL = `https://rpc.helius.xyz/?api-key=${apiKey}`;

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

        // ✅ Ensure valid API response
        if (!solData || !solData.result || typeof solData.result.value === "undefined") {
            console.error("❌ Unexpected API response format.");
            return res.status(500).json({ success: false, error: "Invalid API response. Please check the API key and wallet address." });
        }

        // ✅ Convert from lamports to SOL
        let solBalance = (solData.result.value / 1e9).toFixed(3);

        console.log(`✅ SOL Balance for ${wallet}: ${solBalance} SOL`);

        return res.json({ success: true, solBalance });

    } catch (error) {
        console.error("❌ Error fetching SOL balance:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error while fetching SOL balance." });
    }
});

// ✅ **Start the server (ONLY ONCE, at the BOTTOM)**
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server running on port ${PORT}`));

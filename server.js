import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit"; // ✅ Import Rate Limiting

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080; // Railway assigns PORT automatically

const TOKEN_MINT = "8JRYGtJ3DueTTQvhD8atiDgycCcXYQq76f6rzK5Hpump"; // CyberFox Token Mint
const MIN_REQUIRED_TOKENS = 750;

app.use(cors());
app.use(express.json());

// ✅ **Rate Limiting for API Protection**
const solLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per minute
    message: { error: "❌ Too many SOL balance requests. Slow down!" }
});

const tokenLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1, // Only allow 1 token balance check per minute per IP
    message: { error: "❌ Too many token balance requests. Please wait before checking again." }
});

// ✅ **Endpoint for Fetching CyberFox Token Balance** (1 request per minute)
app.post("/validate-token", tokenLimiter, async (req, res) => {
    const { wallet, apiKey } = req.body;

    console.log("\n🔹 [TOKEN CHECK] Token Request Received:");
    console.log("✅ Wallet Address:", wallet);
    console.log("✅ API Key:", apiKey ? "✔️ Provided" : "❌ Not Provided");

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
        console.log("\n🔹 [API RESPONSE] Helius Token Data:", JSON.stringify(tokenData, null, 2));

        if (!tokenData.result || !Array.isArray(tokenData.result.value)) {
            console.error("❌ Unexpected API response format.");
            return res.status(500).json({ error: "Invalid API response. Please check the API key and wallet address." });
        }

        let tokenBalance = 0;
        if (tokenData.result.value.length > 0) {
            tokenBalance = parseFloat(tokenData.result.value[0].account.data.parsed.info.tokenAmount.uiAmount);
        }

        console.log(`✅ [TOKEN BALANCE] CyberFox Token Balance: ${tokenBalance}`);

        // ✅ **ENFORCE TOKEN GATING - BLOCK USERS BELOW MIN_REQUIRED_TOKENS**
        if (tokenBalance < MIN_REQUIRED_TOKENS) {
            console.warn(`❌ [ACCESS DENIED] User only has ${tokenBalance} CyberFox tokens.`);
            return res.status(403).json({ error: "❌ Insufficient CyberFox tokens. Buy more to enable the extension." });
        }

        console.log(`✅ [ACCESS GRANTED] User has ${tokenBalance} CyberFox tokens.`);

        return res.json({ success: true, tokenBalance });

    } catch (error) {
        console.error("❌ Error fetching CyberFox token balance:", error);
        return res.status(500).json({ error: "Internal Server Error while fetching token balance." });
    }
});

/** ✅ **Endpoint for Fetching SOL Balance** (5 requests per minute) **/
app.post("/validate-sol", solLimiter, async (req, res) => {
    try {
        const { wallet, apiKey } = req.body;

        console.log("\n🔹 [SOL CHECK] SOL Request Received:");
        console.log("✅ Wallet Address:", wallet);
        console.log("✅ API Key:", apiKey ? "✔️ Provided" : "❌ Not Provided");

        // ✅ Validate Inputs
        if (!wallet || typeof wallet !== "string" || wallet.trim() === "") {
            console.error("❌ Invalid or missing wallet address.");
            return res.status(400).json({ error: "Invalid wallet address." });
        }

        if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
            console.error("❌ Missing API Key in request.");
            return res.status(400).json({ error: "API key is missing. Please enter a valid API key." });
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
        console.log("\n🔹 [API RESPONSE] Helius SOL Data:", JSON.stringify(solData, null, 2));

        // ✅ Ensure valid API response
        if (!solData || !solData.result || typeof solData.result.value === "undefined") {
            console.error("❌ Unexpected API response format.");
            return res.status(500).json({ error: "Invalid API response. Please check the API key and wallet address." });
        }

        // ✅ Convert from lamports to SOL
        let solBalance = (solData.result.value / 1e9).toFixed(3);

        console.log(`✅ [SOL BALANCE] SOL Balance for ${wallet}: ${solBalance} SOL`);

        return res.json({ success: true, solBalance });

    } catch (error) {
        console.error("❌ Error fetching SOL balance:", error);
        return res.status(500).json({ error: "Internal Server Error while fetching SOL balance." });
    }
});

// ✅ Start the server
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

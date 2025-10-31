// falconforge_listener.js — v3.4 Secure FalconForge Webhook Listener
// FalconForge CAP Validation Dual-Ledger Integration
// Author: FalconForge AI Labs / Athena Advisor
// Node.js 20+ (ESM)

import http from "http";
import crypto from "crypto";
import { config } from "dotenv";

config(); // Load FALCONFORGE_WEBHOOK_SECRET

const PORT = process.env.PORT || 8080;
const SECRET = process.env.FALCONFORGE_WEBHOOK_SECRET;

if (!SECRET) {
  console.error("❌ Missing FALCONFORGE_WEBHOOK_SECRET in environment.");
  process.exit(1);
}

// Helper: Constant-time signature compare
function safeCompare(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// Helper: Compute HMAC SHA256
function computeSignature(rawBody) {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(rawBody);
  return `sha256=${hmac.digest("hex")}`;
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/v3/cap/log") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found" }));
    return;
  }

  let chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));

  req.on("end", () => {
    const rawBody = Buffer.concat(chunks);
    const signature = req.headers["x-hub-signature-256"];

    if (!signature) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing signature" }));
      return;
    }

    const expectedSig = computeSignature(rawBody);

    if (!safeCompare(signature, expectedSig)) {
      console.warn("⚠️  Signature verification failed");
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid signature" }));
      return;
    }

    // Verified payload
    let parsed;
    try {
      parsed = JSON.parse(rawBody.toString());
    } catch {
      parsed = { raw: rawBody.toString("utf8") };
    }

    console.log("✅ Verified CAP received:", parsed);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        verified: true,
        received: true,
        body: parsed,
      })
    );
  });
});

server.listen(PORT, () =>
  console.log(`🛰️ FalconForge Listener active on port ${PORT}`)
);

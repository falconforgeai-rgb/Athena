// sign_and_send_cap.js
// FalconForge CAP Signing & Dispatch Test
// Requires: Node 20+, crypto, and fetch (built-in in Node ≥18)

import crypto from "crypto";
import fetch from "node-fetch"; // if Node 20+, you can remove this and use global fetch
import { randomUUID } from "crypto";
import { config } from "dotenv";

config(); // Loads FALCONFORGE_WEBHOOK_SECRET and optional NGROK_URL

const SECRET = process.env.FALCONFORGE_WEBHOOK_SECRET;
if (!SECRET) {
  console.error("❌ Missing FALCONFORGE_WEBHOOK_SECRET in .env");
  process.exit(1);
}

// Default to local listener; override with NGROK_URL in .env
const ENDPOINT =
  process.env.NGROK_URL || "http://localhost:8080/v3/cap/log";

// Construct a realistic CAP payload
const payload = {
  cap_id: randomUUID(), // UUIDv7 substitute
  timestamp: new Date().toISOString(),
  domain: "Research",
  context_mode: "Advisor",
  ems: 0.87,
  cw: 0.14,
  ad: 0.11,
  hci: 0.81,
  hs: 0.95,
  body: {
    test: "Athena CAP validation handshake",
    description: "End-to-end FalconForge Action integrity test"
  }
};

// Compute HMAC SHA-256 signature
function computeSignature(secret, body) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

async function sendCAP() {
  const body = JSON.stringify(payload);
  const signature = computeSignature(SECRET, body);

  console.log("🪶 Dispatching CAP to", ENDPOINT);
  console.log("🔑 Signature:", signature);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": signature
    },
    body
  });

  const text = await res.text();
  console.log("\n🧩 Response Status:", res.status);
  console.log("🧾 Response Body:", text);
}

sendCAP().catch(err => {
  console.error("🚨 CAP dispatch failed:", err);
});

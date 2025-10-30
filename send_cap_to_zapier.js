/**
 * Athena CAP → Zapier Dispatch Bridge (v3.4)
 * Authored by FalconForgeAI Labs — Verified by Athena
 *
 * Reads a CAP JSON file, computes checksum, validates environment safety,
 * and securely POSTs it to the configured Zapier Webhook.
 */

import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";

async function main() {
  const capPath = process.argv[2];

  // === Safety Layer ===
  if (!process.env.ZAPIER_WEBHOOK_URL) {
    console.error("❌ Missing environment variable: ZAPIER_WEBHOOK_URL");
    console.error("   → Set it in your GitHub Secrets or export it locally before running.");
    process.exit(1);
  }

  if (!capPath || !fs.existsSync(capPath)) {
    console.error(`❌ CAP file not found: ${capPath}`);
    console.error("   → Usage: node send_cap_to_zapier.js ./path/to/cap_record.json");
    process.exit(1);
  }

  // === Read and Validate File ===
  console.log(`🔍 Reading CAP file: ${capPath}`);
  let capData;
  try {
    const raw = fs.readFileSync(capPath, "utf8");
    capData = JSON.parse(raw);
  } catch (err) {
    console.error("❌ Failed to parse CAP JSON:", err.message);
    process.exit(1);
  }

  // === Compute Hash ===
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(capData))
    .digest("hex");
  console.log(`🧠 CAP payload checksum: ${hash}`);

  // === Dispatch to Zapier ===
  console.log("🌐 Sending payload to Zapier...");
  try {
    const response = await fetch(process.env.ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...capData, ledger_hash: hash }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
    }

    console.log("✅ CAP successfully transmitted to Zapier.");
    console.log("📬 Zapier response:", result);
  } catch (err) {
    console.error("💥 Error sending CAP to Zapier:", err);
    process.exit(1);
  }
}

main();

// send_cap_to_zapier.js
// FalconForge-Athena v3.4 — CAP → Zapier Bridge
// Authored by Athena (Steward) — FalconForgeAI Labs

import fs from "fs";
import crypto from "crypto";
import fetch from "node-fetch";

const ZAPIER_WEBHOOK_URL =
  process.env.ZAPIER_WEBHOOK_URL ||
  "https://hooks.zapier.com/hooks/catch/25103684/urxqhrn/";
const CAP_FILE_PATH = process.argv[2] || "./cap_record.json"; // optional CLI argument

// === Helper: compute SHA-256 checksum for payload integrity ===
function computeChecksum(data) {
  const jsonString = typeof data === "string" ? data : JSON.stringify(data);
  return crypto.createHash("sha256").update(jsonString).digest("hex");
}

async function main() {
  try {
    console.log("🔍 Reading CAP file:", CAP_FILE_PATH);
    const capData = JSON.parse(fs.readFileSync(CAP_FILE_PATH, "utf8"));

    // === Integrity & Metadata Enrichment ===
    const checksum = computeChecksum(capData);
    capData.ledger_hash = checksum;
    capData.dispatch_timestamp = new Date().toISOString();

    // === Optional Human Safety Tip ===
    capData.safety_tip =
      "If this CAP concerns live or automated system output, ensure human review before operational deployment.";

    console.log("🧠 CAP payload checksum:", checksum);
    console.log("🌐 Sending payload to Zapier...");

    // === Transmit to Zapier ===
    const response = await fetch(ZAPIER_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(capData),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("❌ Zapier rejected request:", response.status, body);
      process.exit(1);
    }

    const result = await response.json().catch(() => ({}));

    console.log("✅ CAP successfully transmitted to Zapier.");
    console.log("📬 Zapier response:", result);

    console.log(
      "\n🛡️  Tip: To chain this automatically, call this script at the end of your CAP validation workflow."
    );
  } catch (err) {
    console.error("💥 Error sending CAP to Zapier:", err);
    process.exit(1);
  }
}

main();

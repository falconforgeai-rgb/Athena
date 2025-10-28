/**
 * Athena CAP Payload Normalizer (v3.4.3-debug)
 * FalconForgeAI / Athena Core
 */

const fs = require("fs");
const path = require("path");

const RAW_FILE = path.resolve("raw_payload.txt");
const OUT_FILE = path.resolve("cap_payload.json");

function safeRead(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function tryParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("❌ JSON parse error:", e.message);
    return null;
  }
}

function main() {
  console.log("=== Athena CAP Payload Normalizer v3.4.3-debug ===");

  if (!fs.existsSync(RAW_FILE)) {
    console.error("❌ Missing raw_payload.txt");
    process.exit(1);
  }

  const raw = safeRead(RAW_FILE);
  console.log("--- RAW INPUT BEGIN ---");
  console.log(raw);
  console.log("--- RAW INPUT END ---");

  const json = tryParse(raw);
  if (json && typeof json === "object") {
    console.log("✅ Direct parse successful.");
    fs.writeFileSync(OUT_FILE, JSON.stringify(json, null, 2));
  } else {
    console.error("❌ Failed to parse input. Writing {}");
    fs.writeFileSync(OUT_FILE, "{}");
  }

  console.log("--- WRITTEN cap_payload.json ---");
  console.log(fs.readFileSync(OUT_FILE, "utf8"));
}

main();

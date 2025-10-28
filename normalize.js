/**
 * Athena CAP Payload Normalizer (v3.4.2)
 * FalconForgeAI / Athena Core
 *
 * Responsibilities:
 *  - Reads Base64-decoded raw input from raw_payload.txt
 *  - Detects malformed or flattened JSON
 *  - Repairs quotes, commas, and missing braces
 *  - Validates syntactic integrity
 *  - Emits canonical JSON to cap_payload.json
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
  } catch {
    return null;
  }
}

function looksLikeFlattenedJSON(str) {
  if (!str) return false;
  const trimmed = str.trim();
  return (
    trimmed.startsWith("{") &&
    trimmed.endsWith("}") &&
    !trimmed.includes('":') && // keys unquoted
    trimmed.includes(":")
  );
}

function repairJSON(str) {
  // 1. Strip any surrounding quotes or accidental newlines
  let repaired = str.trim().replace(/^'+|'+$/g, "");

  // 2. Ensure valid braces
  if (!repaired.startsWith("{")) repaired = "{" + repaired;
  if (!repaired.endsWith("}")) repaired = repaired + "}";

  // 3. Reinsert quotes on keys and string values
  repaired = repaired
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
    .replace(/:\s*([A-Za-z0-9_.:-]+)(\s*[},])/g, ': "$1"$2');

  return repaired;
}

function validateObject(obj) {
  return obj && typeof obj === "object" && Object.keys(obj).length > 0;
}

function main() {
  console.log("=== Athena CAP Payload Normalizer v3.4.2 ===");

  if (!fs.existsSync(RAW_FILE)) {
    console.error("❌ raw_payload.txt missing.");
    process.exit(1);
  }

  let raw = safeRead(RAW_FILE);
  const len = raw.trim().length;
  console.log(`--- Raw payload length: ${len}`);

  if (len < 5) {
    console.error("❌ Empty CAP payload.");
    fs.writeFileSync(OUT_FILE, "{}");
    process.exit(1);
  }

  // First, attempt direct JSON parse
  let json = tryParse(raw);
  if (validateObject(json)) {
    console.log("✅ Direct parse successful.");
    fs.writeFileSync(OUT_FILE, JSON.stringify(json, null, 2));
    return;
  }

  // If not, attempt repair
  if (looksLikeFlattenedJSON(raw)) {
    console.log("⚙️ Detected flattened JSON — attempting repair...");
    const repaired = repairJSON(raw);
    json = tryParse(repaired);
    if (validateObject(json)) {
      console.log("✅ Repair successful.");
      fs.writeFileSync(OUT_FILE, JSON.stringify(json, null, 2));
      return;
    } else {
      console.error("❌ Repair failed to yield valid JSON.");
    }
  }

  // Try last-chance heuristic: extract substring between first { and last }
  if (!validateObject(json)) {
    console.log("⚙️ Attempting substring salvage...");
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const slice = raw.substring(start, end + 1);
      const attempt = tryParse(slice);
      if (validateObject(attempt)) {
        console.log("✅ Salvaged valid JSON via substring.");
        fs.writeFileSync(OUT_FILE, JSON.stringify(attempt, null, 2));
        return;
      }
    }
  }

  // If still invalid, abort safely
  console.error("❌ Could not normalize CAP payload. Writing empty object.");
  fs.writeFileSync(OUT_FILE, "{}");
  process.exit(1);
}

main();

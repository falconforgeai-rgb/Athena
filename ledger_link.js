/**
 * Athena CAP Ledger — Governance Chain Linker (v3.4)
 * FalconForgeAI Labs — Humanization Engine
 *
 * Usage:
 *   node ledger_link.js
 *
 * Function:
 *   Scans ./CAP_LOGS/<year>/<month>/ for CAP JSON records,
 *   computes each file’s SHA-256 hash, and updates the
 *   governance_chain {hash_prev, hash_next} fields.
 *
 * Notes:
 *   - Each record is backed up as <filename>.bak before modification.
 *   - The first record links to a null-hash (genesis).
 *   - The last record links to a null-hash for future extension.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const LEDGER_ROOT = "./CAP_LOGS";

/** Compute SHA-256 hash of a file */
function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex").toUpperCase();
}

/** Recursively load all CAP record paths sorted oldest → newest */
function loadLedgerFiles() {
  const files = [];
  if (!fs.existsSync(LEDGER_ROOT)) return files;

  for (const year of fs.readdirSync(LEDGER_ROOT)) {
    const yearDir = path.join(LEDGER_ROOT, year);
    if (!fs.statSync(yearDir).isDirectory()) continue;

    for (const month of fs.readdirSync(yearDir)) {
      const monthDir = path.join(yearDir, month);
      if (!fs.statSync(monthDir).isDirectory()) continue;

      for (const file of fs.readdirSync(monthDir)) {
        if (file.endsWith(".json")) {
          files.push(path.join(monthDir, file));
        }
      }
    }
  }

  // Sort chronologically by modification time
  return files.sort(
    (a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs
  );
}

/** Update governance_chain fields with linked hashes */
function updateGovernanceChain(files) {
  const hashes = files.map(sha256);

  files.forEach((file, i) => {
    const record = JSON.parse(fs.readFileSync(file, "utf8"));
    record.governance_chain = record.governance_chain || {};

    record.governance_chain.hash_prev =
      i === 0
        ? "SHA256:0000000000000000000000000000000000000000000000000000000000000000"
        : `SHA256:${hashes[i - 1]}`;

    record.governance_chain.hash_next =
      i === files.length - 1
        ? "SHA256:0000000000000000000000000000000000000000000000000000000000000000"
        : `SHA256:${hashes[i + 1]}`;

    // 🔒 Safety tip: create a backup before overwriting
    fs.copyFileSync(file, file + ".bak");

    fs.writeFileSync(file, JSON.stringify(record, null, 2));
    console.log(`🔗 Updated governance_chain for ${path.basename(file)}`);
  });
}

/** Main execution */
(function main() {
  if (!fs.existsSync(LEDGER_ROOT)) {
    console.error("❌ No CAP_LOGS directory found. Exiting.");
    process.exit(1);
  }

  const files = loadLedgerFiles();
  if (!files.length) {
    console.log("⚠️ No CAP records found to link.");
    return;
  }

  console.log(`🔍 Found ${files.length} CAP records. Linking...`);
  updateGovernanceChain(files);
  console.log("✅ Governance chain linking complete.");
})();

/**
 * Athena CAP Payload Auto-Signer
 * --------------------------------
 * Generates and injects a valid ethics_signature field
 * into the CAP payload for validation and ledger commit.
 *
 * Requires normalize.js to exist in the repo root.
 *
 * Usage:
 *   node sign_cap.js [input.json] [output.json]
 *   # Default: node sign_cap.js cap_payload.json
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { normalizeFile, normalizeValue } = require('./normalize.js');

function signPayload(inputPath, outputPath = null) {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File not found: ${inputPath}`);
    process.exit(1);
  }

  // Normalize payload first for deterministic hashing
  console.log(`🔄 Normalizing payload at: ${inputPath}`);
  const tmpPath = path.join(__dirname, '_tmp_normalized.json');
  normalizeFile(inputPath, tmpPath);

  const data = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));

  // Canonical serialize with sorted keys
  const canonical = JSON.stringify(normalizeValue(data, true), Object.keys(data).sort());
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');

  // Ensure validator_signatures object exists
  data.validator_signatures = data.validator_signatures || {};
  data.validator_signatures.ethics_signature = `SHA256:${hash}`;

  // Cleanup temp
  fs.unlinkSync(tmpPath);

  // Save final payload
  const outPath = outputPath || inputPath;
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');

  console.log(`✅ Ethics signature added.`);
  console.log(`🔐 SHA256: ${hash}`);
  console.log(`📄 Signed payload written to: ${outPath}`);
}

// If called directly
if (require.main === module) {
  const input = process.argv[2] || 'cap_payload.json';
  const output = process.argv[3];
  signPayload(input, output);
}

module.exports = { signPayload };

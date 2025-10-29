/**
 * Athena CAP Payload Auto-Signer v2
 * ---------------------------------
 * Generates UUIDv7 (if missing), normalizes JSON,
 * computes deterministic SHA256 hash, and injects
 * ethics_signature into the CAP payload.
 *
 * Requires: normalize.js
 *
 * Usage:
 *   node sign_cap.js [input.json] [output.json]
 * Example:
 *   node sign_cap.js cap_payload.json
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { normalizeFile, normalizeValue } = require('./normalize.js');

// UUIDv7 generator (time-ordered, modern variant)
function generateUUIDv7() {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(12, '0');
  const randomHex = crypto.randomBytes(10).toString('hex');
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8, 12)}-7${randomHex.slice(0, 3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${randomHex.slice(3, 7)}-${randomHex.slice(7)}`;
}

function signPayload(inputPath, outputPath = null) {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File not found: ${inputPath}`);
    process.exit(1);
  }

  // Normalize payload for deterministic hashing
  console.log(`🔄 Normalizing payload: ${inputPath}`);
  const tmpPath = path.join(__dirname, '_tmp_normalized.json');
  normalizeFile(inputPath, tmpPath);

  const data = JSON.parse(fs.readFileSync(tmpPath, 'utf-8'));

  // Auto-generate UUIDv7 if missing
  if (!data.cap_id) {
    data.cap_id = generateUUIDv7();
    console.log(`🆔 Generated cap_id (UUIDv7): ${data.cap_id}`);
  }

  // Canonicalize and hash
  const canonical = JSON.stringify(normalizeValue(data, true), Object.keys(data).sort());
  const hash = crypto.createHash('sha256').update(canonical).digest('hex');

  // Ensure validator_signatures exists
  data.validator_signatures = data.validator_signatures || {};
  data.validator_signatures.ethics_signature = `SHA256:${hash}`;

  // Save final file
  const outPath = outputPath || inputPath;
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');

  // Cleanup
  fs.unlinkSync(tmpPath);

  console.log(`✅ Ethics signature generated and added.`);
  console.log(`🔐 SHA256: ${hash}`);
  console.log(`📄 Signed payload written to: ${outPath}`);
}

// CLI entrypoint
if (require.main === module) {
  const input = process.argv[2] || 'cap_payload.json';
  const output = process.argv[3];
  signPayload(input, output);
}

module.exports = { signPayload, generateUUIDv7 };

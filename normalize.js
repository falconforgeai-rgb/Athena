/**
 * Athena CAP Normalization Script
 * -----------------------------------
 * Ensures deterministic JSON serialization for consistent
 * SHA256 hashing across validation, ledger, and audit systems.
 *
 * Normalization includes:
 *  - Alphabetical key ordering (deep)
 *  - String trimming & whitespace normalization
 *  - Optional number rounding
 *  - Recursion across nested objects and arrays
 */

const fs = require('fs');
const path = require('path');

/**
 * Normalize any JavaScript value into a deterministic form.
 * @param {any} value - The value to normalize.
 * @param {boolean} [roundNumbers=true] - Whether to round numeric values.
 * @returns {any} The normalized value.
 */
function normalizeValue(value, roundNumbers = true) {
  if (Array.isArray(value)) {
    return value.map(v => normalizeValue(v, roundNumbers));
  } else if (value && typeof value === 'object') {
    return sortObjectKeys(value, roundNumbers);
  } else if (typeof value === 'string') {
    // Normalize whitespace and trim
    return value.replace(/\s+/g, ' ').trim();
  } else if (typeof value === 'number' && roundNumbers) {
    // Round to 6 decimal places (adjust as needed)
    return Number(value.toFixed(6));
  }
  return value;
}

/**
 * Recursively sort all keys of an object alphabetically.
 * @param {object} obj - Object to sort.
 * @param {boolean} roundNumbers - Whether to round numeric values.
 * @returns {object} Sorted and normalized object.
 */
function sortObjectKeys(obj, roundNumbers = true) {
  const sortedKeys = Object.keys(obj).sort();
  const result = {};
  for (const key of sortedKeys) {
    result[key] = normalizeValue(obj[key], roundNumbers);
  }
  return result;
}

/**
 * Normalize a JSON file in place.
 * Reads input, normalizes, and writes out a deterministic file.
 */
function normalizeFile(inputPath, outputPath = null) {
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, 'utf-8');
  let json;

  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to parse JSON: ${err.message}`);
    process.exit(1);
  }

  const normalized = normalizeValue(json);
  const sortedJsonString = JSON.stringify(normalized, null, 2);

  const targetPath = outputPath || inputPath;
  fs.writeFileSync(targetPath, sortedJsonString + '\n');

  console.log(`✅ Normalized JSON written to ${targetPath}`);
}

// If called directly from CLI
if (require.main === module) {
  const input = process.argv[2];
  const output = process.argv[3];

  if (!input) {
    console.error('Usage: node normalize.js <input.json> [output.json]');
    process.exit(1);
  }

  normalizeFile(input, output);
}

module.exports = {
  normalizeValue,
  sortObjectKeys,
  normalizeFile
};

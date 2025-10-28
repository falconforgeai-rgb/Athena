/**
 * Athena CAP Payload Normalizer (v3.4.1)
 * - Repairs flattened or malformed JSON pasted into GitHub Actions UI
 * - Detects if payload is empty or missing
 * - Re-injects quotes and structure heuristically
 * - Outputs fully valid JSON to cap_payload.json
 */

const fs = require('fs');

const RAW_FILE = 'raw_payload.txt';
const OUT_FILE = 'cap_payload.json';

function tryParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function looksLikeFlattenedJSON(str) {
  return str &&
    str.length > 20 &&
    !str.includes('\n') &&
    str.includes('{') &&
    str.includes('}') &&
    !str.trim().startsWith('"');
}

function repairFlattenedJSON(str) {
  // Try to restore missing quotes on keys and string values
  let repaired = str
    .replace(/^'+|'+$/g, '')
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
    .replace(/:\s*([A-Za-z0-9_.:-]+)(\s*[},])/g, ': "$1"$2');
  return repaired;
}

function main() {
  if (!fs.existsSync(RAW_FILE)) {
    console.error('❌ No raw_payload.txt found. Aborting.');
    process.exit(1);
  }

  let text = fs.readFileSync(RAW_FILE, 'utf8').trim();
  console.log('--- RAW PAYLOAD LENGTH:', text.length);

  if (!text || text.length < 5) {
    console.error('❌ Empty CAP payload.');
    fs.writeFileSync(OUT_FILE, '{}');
    process.exit(1);
  }

  // Try direct parse first
  let json = tryParse(text);
  if (json) {
    console.log('✅ Parsed CAP payload (direct parse).');
    fs.writeFileSync(OUT_FILE, JSON.stringify(json, null, 2));
    return;
  }

  // Attempt repair if flattened
  if (looksLikeFlattenedJSON(text)) {
    console.log('⚙️ Attempting repair for flattened JSON...');
    const repaired = repairFlattenedJSON(text);
    json = tryParse(repaired);
    if (json) {
      console.log('✅ Successfully repaired CAP payload.');
      fs.writeFileSync(OUT_FILE, JSON.stringify(json, null, 2));
      return;
    }
  }

  // Final fallback
  console.error('❌ Failed to normalize CAP payload. Writing fallback object.');
  fs.writeFileSync(OUT_FILE, '{}');
  process.exit(1);
}

main();

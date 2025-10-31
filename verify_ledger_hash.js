// verify_ledger_hash.js
// FalconForge-Athena v3.4 — Automatic GitHub Ledger Integrity Verifier
// Authored by Athena (Steward) — FalconForgeAI Labs

import crypto from "crypto";
import fetch from "node-fetch";

const REPO = "falconforgeai-rgb/Athena";
const BRANCH = "main";

async function getLatestCAPFile() {
  console.log("🔍 Fetching CAP file list from GitHub...");
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/audit?ref=${BRANCH}`);
  if (!res.ok) throw new Error(`GitHub API request failed: ${res.status}`);
  const files = await res.json();

  // Filter only JSON files
  const capFiles = files.filter(f => f.name.endsWith(".json"));
  if (!capFiles.length) throw new Error("No CAP JSON files found in /audit/");
  
  // Sort by modification time (descending)
  const latest = capFiles.sort((a, b) => b.name.localeCompare(a.name))[0];
  console.log(`🧩 Latest CAP file detected: ${latest.name}`);
  return latest.download_url;
}

async function verifyCAP(url) {
  console.log(`🔗 Fetching CAP from: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CAP file (${res.status})`);
  const body = await res.text();
  const cap = JSON.parse(body);

  if (!cap.ledger_hash) {
    console.log(`⚠️  Skipping ${url} — no ledger_hash present (likely pending validation).`);
    return;
  }


  const gitSha = crypto.createHash("sha1").update(`blob ${body.length}\0${body}`).digest("hex");

  console.log("🧠 Expected Ledger Hash:", cap.ledger_hash);
  console.log("🔢 GitHub Blob SHA:     ", gitSha);

  if (gitSha === cap.ledger_hash) {
    console.log("✅ MATCH — CAP integrity confirmed on GitHub ledger.");
  } else {
    console.log("❌ MISMATCH — CAP hash discrepancy detected!");
  }
}

(async () => {
  try {
    const latestUrl = await getLatestCAPFile();
    await verifyCAP(latestUrl);
  } catch (err) {
    console.error("💥 Verification failed:", err.message);
    process.exit(1);
  }
})();

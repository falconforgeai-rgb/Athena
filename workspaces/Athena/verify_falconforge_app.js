// verify_falconforge_app.js
// FalconForge-Athena App Verification Utility
// Authored by Athena v3.4 — FalconForgeAI Labs

import fs from "fs";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

// === CONFIGURE THESE VALUES ===
const APP_ID = "2202358"; // from your GitHub App
const INSTALLATION_ID = "YOUR_INSTALLATION_ID"; // numeric, from installation URL
const PRIVATE_KEY_PATH = "./falconforge-athena.pem";
const REPO = "falconforgeai-rgb/Athena";

// === GENERATE JWT FOR APP AUTH ===
function generateJWT(appId, keyPath) {
  const privateKey = fs.readFileSync(keyPath, "utf8");
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: appId,
  };
  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}

async function getInstallationToken(jwtToken, installationId) {
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "FalconForge-Athena-Validator",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to obtain installation token: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data;
}

async function main() {
  try {
    console.log("🔐 Reading private key...");
    const jwtToken = generateJWT(APP_ID, PRIVATE_KEY_PATH);
    console.log("✅ JWT generated.");

    console.log("🔁 Requesting installation access token...");
    const tokenData = await getInstallationToken(jwtToken, INSTALLATION_ID);
    console.log(`✅ Received temporary token (expires at ${tokenData.expires_at})`);

    // === Check repo content as verification ===
    console.log("🔍 Checking CAP_LOGS directory contents...");
    const res = await fetch(`https://api.github.com/repos/${REPO}/contents/CAP_LOGS`, {
      headers: { Authorization: `token ${tokenData.token}`, Accept: "application/vnd.github+json" },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to access CAP_LOGS: ${res.status} ${errText}`);
    }

    const files = await res.json();
    console.log("✅ CAP_LOGS accessible. Found entries:");
    files.forEach((f) => console.log("   •", f.name));

    console.log("\n🎉 FalconForge-Athena GitHub App verified successfully.");
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

main();

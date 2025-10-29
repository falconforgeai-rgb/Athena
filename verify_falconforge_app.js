/**
 * FalconForge-Athena GitHub App Verifier
 * --------------------------------------
 * Confirms that the GitHub App is installed correctly and can access
 * the specified repository via the GitHub API.
 *
 * Usage:
 *   node verify_falconforge_app.js
 */

import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";   // npm install jsonwebtoken
import fetch from "node-fetch";   // npm install node-fetch@2

// === CONFIGURE THESE VALUES ===
const APP_ID = "<YOUR_APP_ID>";                 // e.g., 123456
const INSTALLATION_ID = "<YOUR_INSTALLATION_ID>"; // e.g., 987654321
const PRIVATE_KEY_PATH = "./falconforge-athena.pem"; // path to your .pem file
const REPO = "falconforgeai-rgb/Athena";         // full repo name

async function main() {
  console.log("🔐 Reading private key...");
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");

  // Create a JWT valid for 10 minutes
  const now = Math.floor(Date.now() / 1000);
  const payload = { iat: now - 60, exp: now + 600, iss: APP_ID };
  const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  console.log("✅ JWT generated.");

  // Exchange JWT for an installation access token
  console.log("🔁 Requesting installation access token...");
  const installRes = await fetch(
    `https://api.github.com/app/installations/${INSTALLATION_ID}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!installRes.ok) {
    console.error("❌ Failed to obtain installation token:", installRes.statusText);
    process.exit(1);
  }

  const { token: ghToken, expires_at } = await installRes.json();
  console.log(`✅ Received temporary token (expires at ${expires_at})`);

  // Verify access to CAP_LOGS directory
  console.log("🔍 Checking CAP_LOGS directory contents...");
  const repoRes = await fetch(
    `https://api.github.com/repos/${REPO}/contents/CAP_LOGS`,
    {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (repoRes.status === 404) {
    console.warn("⚠️ CAP_LOGS directory not found (repo accessible though).");
  } else if (!repoRes.ok) {
    console.error("❌ Error reading repo:", repoRes.statusText);
    process.exit(1);
  } else {
    const files = await repoRes.json();
    console.log("✅ CAP_LOGS accessible. Found entries:");
    files.forEach((f) => console.log("   •", f.name));
  }

  console.log("\n🎉 FalconForge-Athena GitHub App verified successfully.");
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
  process.exit(1);
});

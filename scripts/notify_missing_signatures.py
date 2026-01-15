#!/usr/bin/env python3
"""
notify_missing_signatures.py
----------------------------------------
Checks CAP payloads for missing ethics/empathy/civic validator signatures
and sends a single grouped Slack alert if any are missing.
"""

import os, sys, json, requests

if len(sys.argv) < 2:
    print("Usage: notify_missing_signatures.py <slack_webhook_url>")
    sys.exit(1)

webhook_url = sys.argv[1]
payload_dir = "CAP_LOGS"

missing = []

for filename in os.listdir(payload_dir):
    if not filename.endswith(".json"):
        continue
    path = os.path.join(payload_dir, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        validators = data.get("meta", {}).get("validators", {})
        for field in ["ethics", "empathy", "civic"]:
            if field not in validators or not validators[field]:
                missing.append((filename, field))
    except Exception:
        continue

if missing:
    summary = f"⚠️ {len(missing)} CAP payloads missing validator signatures.\n"
    details = "\n".join([f"- {f} → missing {fld}" for f, fld in missing[:10]])
    message = {"text": summary + details}
    try:
        requests.post(webhook_url, json=message)
        print("⚠️ Missing signatures reported to Slack.")
    except Exception as e:
        print(f"Slack notification failed: {e}")
    sys.exit(1)
else:
    print("✅ All CAP payloads include validator tri-signatures.")

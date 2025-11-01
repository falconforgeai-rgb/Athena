import os
import json
import requests
import hashlib
from pathlib import Path
from datetime import datetime
from flask import Flask, jsonify

app = Flask(__name__)

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
GITHUB_TOKEN = os.environ.get("GITHUB_PAT")
OWNER = "falconforgeai-rgb"
REPO  = "Athena"
LEDGER_PATH = "./CAP_LOGS"

# ---------------------------------------------------------------------
# Utility: compute SHA256 of file
# ---------------------------------------------------------------------
def compute_file_hash(file_path):
    with open(file_path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

# ---------------------------------------------------------------------
# Utility: get latest CAP file + hash
# ---------------------------------------------------------------------
def get_latest_cap():
    try:
        p = Path(LEDGER_PATH)
        cap_files = sorted(p.rglob("*.json"), key=lambda x: x.stat().st_mtime, reverse=True)
        if not cap_files:
            return None, "SHA256:" + "0" * 64
        latest = cap_files[0]
        digest = compute_file_hash(latest)
        return latest, f"SHA256:{digest}"
    except Exception as e:
        print(f"[WARN] Could not get latest CAP: {e}")
        return None, "SHA256:" + "0" * 64

# ---------------------------------------------------------------------
# Update previous CAP's hash_next
# ---------------------------------------------------------------------
def update_previous_cap_hash_next(prev_path, new_hash):
    if not prev_path or not prev_path.exists():
        return
    try:
        with open(prev_path, "r") as f:
            cap_data = json.load(f)
        cap_data["governance_chain"]["hash_next"] = f"SHA256:{new_hash}"
        with open(prev_path, "w") as f:
            json.dump(cap_data, f, indent=2)
        print(f"[CHAIN] Updated hash_next in {prev_path.name}")
    except Exception as e:
        print(f"[WARN] Failed to update previous CAP hash_next: {e}")

# ---------------------------------------------------------------------
# Build and send a CAP payload
# ---------------------------------------------------------------------
def send_cap_payload(reasoning_summary, domain="Governance", context="Advisor"):
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}"
    }

    prev_file, prev_hash = get_latest_cap()

    cap_payload = {
        "cap_id": "123e4567-e89b-12d3-a456-426614174000",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "domain": domain,
        "context_mode": context,
        "ems": 0.84,
        "cw": 0.23,
        "ad": 0.17,
        "hci": 0.82,
        "hs": 0.90,
        "haa": 0.93,
        "er_delta": 0.03,
        "validator_ethics": "compliant",
        "validator_empathy": "aligned",
        "validator_signatures": {
            "validator": "Athena-Audit-Core",
            "ethics_signature": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
            "empathy_signature": "abcdef1234567890fedcba0987654321aabbccddeeff11223344556677889900"
        },
        "laurie_version": "v3.4",
        "governance_chain": {
            "hash_prev": prev_hash,
            "hash_next": "SHA256:" + "0" * 64
        },
        "reasoning_summary": reasoning_summary,
        "status": "pending"
    }

    data = {
        "event_type": "wake_listener",
        "client_payload": {"cap_payload": cap_payload}
    }

    r = requests.post(
        f"https://api.github.com/repos/{OWNER}/{REPO}/dispatches",
        headers=headers,
        json=data
    )

    if prev_file:
        try:
            new_hash = hashlib.sha256(json.dumps(cap_payload, sort_keys=True).encode()).hexdigest()
            update_previous_cap_hash_next(prev_file, new_hash)
        except Exception as e:
            print(f"[WARN] Could not update previous CAP hash_next: {e}")

    print(f"[{datetime.utcnow().isoformat()}] CAP dispatched ({r.status_code}) — {reasoning_summary}")
    return r.status_code

# ---------------------------------------------------------------------
# Verify chain integrity
# ---------------------------------------------------------------------
def verify_chain_integrity():
    p = Path(LEDGER_PATH)
    cap_files = sorted(p.rglob("*.json"), key=lambda x: x.stat().st_mtime)
    if not cap_files:
        return {"status": "empty", "message": "No CAP files found."}

    issues = []
    for i in range(1, len(cap_files)):
        prev_file = cap_files[i - 1]
        curr_file = cap_files[i]
        with open(prev_file, "r") as f1, open(curr_file, "r") as f2:
            prev_data = json.load(f1)
            curr_data = json.load(f2)
        actual_prev_hash = "SHA256:" + compute_file_hash(prev_file)
        expected_prev_hash = curr_data["governance_chain"]["hash_prev"]
        if actual_prev_hash != expected_prev_hash:
            issues.append({
                "previous_file": prev_file.name,
                "current_file": curr_file.name,
                "expected": expected_prev_hash,
                "actual": actual_prev_hash
            })

    if issues:
        return {"status": "invalid", "breaks": issues}
    else:
        return {"status": "valid", "message": "All CAP links verified successfully."}

# ---------------------------------------------------------------------
# Flask routes
# ---------------------------------------------------------------------
@app.post("/wake_listener")
def wake_listener():
    status = send_cap_payload("Athena executed standard CAP logging cycle.")
    return jsonify({"github_status": status}), 200

@app.get("/verify_chain")
def verify_chain():
    """Verify local CAP ledger chain and log the result."""
    result = verify_chain_integrity()
    reasoning = (
        "Ledger verification complete: "
        f"{result['status'].upper()}. "
        f"Details: {result.get('message') or len(result.get('breaks', []))} breaks detected."
    )
    send_cap_payload(reasoning_summary=reasoning, domain="Audit", context="Self-Audit")
    return jsonify(result), 200

@app.get("/health")
def health_check():
    """Basic health check for uptime and ping monitoring."""
    return jsonify({"status": "ok", "message": "Athena bridge alive"}), 200


@app.post("/cap")
def receive_cap():
    """Accept a full CAP payload and forward it to GitHub via repository_dispatch."""
    try:
        payload = request.json
        if not payload:
            return jsonify({"error": "Empty payload"}), 400

        # Optional: basic field sanity check
        required_fields = ["cap_id", "timestamp", "domain", "context_mode"]
        missing = [f for f in required_fields if f not in payload]
        if missing:
            return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

        # Send CAP reasoning summary to GitHub
        reasoning = payload.get("reasoning_summary", "CAP received via /cap endpoint.")
        status = send_cap_payload(reasoning)

        return jsonify({
            "status": "received",
            "github_status": status,
            "cap_id": payload.get("cap_id")
        }), 200

    except Exception as e:
        print(f"❌ Error in /cap endpoint: {e}")
        return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------
if __name__ == "__main__":
    print("🔥 Athena CAP Bridge (self-auditing) running on http://127.0.0.1:5000")
    app.run(port=5000)

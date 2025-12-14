# app.py
# Athena CAP Bridge v3.4.1 – FalconForgeAI Implementation
# Purpose: Securely validate CAP ledger requests against the private FalconForge Canon

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import os, requests, json, datetime, uvicorn

# ---------------------------------------------------------------------
#  CONFIGURATION
# ---------------------------------------------------------------------
GITHUB_PAT = os.getenv("GITHUB_PAT")  # read-only token set in Render
REPO = "falconforgeai-rgb/falconforge-codex"
CANON_PATH = "governance/canon_v3_4_1/FalconForge_Integrity_Manifest_v3.4.1.json"

app = FastAPI(
    title="Athena CAP Bridge",
    description="Secure CAP Ledger Interface for FalconForge Canon v3.4.1",
    version="3.4.1"
)

# ---------------------------------------------------------------------
#  CANON FETCHER
# ---------------------------------------------------------------------
def fetch_manifest():
    """Pull the latest integrity manifest from the private falconforge-codex repo."""
    if not GITHUB_PAT:
        raise HTTPException(status_code=500, detail="GITHUB_PAT not configured")

    headers = {"Authorization": f"token {GITHUB_PAT}"}
    url = f"https://api.github.com/repos/{REPO}/contents/{CANON_PATH}"

    r = requests.get(url, headers=headers)
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch manifest from GitHub")

    file_meta = r.json()
    content = requests.get(file_meta["download_url"], headers=headers)
    return json.loads(content.text)

# ---------------------------------------------------------------------
#  ROUTES
# ---------------------------------------------------------------------
@app.get("/")
def root():
    """Health check."""
    return {"status": "Athena CAP Bridge v3.4.1 Active", "timestamp": datetime.datetime.utcnow().isoformat()}

@app.get("/manifest")
def get_manifest_summary():
    """Returns metadata summary, not full manifest (for transparency without exposure)."""
    manifest = fetch_manifest()
    return {
        "version": manifest.get("version", "unknown"),
        "modules": len(manifest.get("modules", [])),
        "validators": manifest.get("validator_signatures", {}).keys(),
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

@app.post("/sendcap")
async def send_cap(request: Request):
    """Receives and validates a CAP ledger payload."""
    payload = await request.json()
    manifest = fetch_manifest()

    cap_id = payload.get("cap_id")
    if not cap_id:
        raise HTTPException(status_code=400, detail="cap_id required")

    # Minimal verification: ensure schema version alignment
    expected_version = manifest.get("version", "3.4.1")
    if payload.get("laurie_version") != expected_version:
        raise HTTPException(status_code=400, detail="Schema version mismatch")

    # Response payload
    return JSONResponse(
        status_code=200,
        content={
            "cap_id": cap_id,
            "status": "sealed",
            "verified": True,
            "domain": payload.get("domain", "Unknown"),
            "context_mode": payload.get("context_mode", "Command"),
            "laurie_version": expected_version,
            "source": "falconforge-codex",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
    )

# ---------------------------------------------------------------------
#  ENTRY POINT
# ---------------------------------------------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("app:app", host="0.0.0.0", port=port)

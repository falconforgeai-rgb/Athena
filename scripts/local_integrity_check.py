#!/usr/bin/env python3
import json, hashlib, requests, sys, os
from datetime import datetime
from pathlib import Path
from jsonschema import validate, ValidationError
from colorama import Fore, Style, init

init(autoreset=True)
SCHEMA_PATH = Path("schemas/ATHENA_CAP_SCHEMA_v3_5.json")
MANIFEST_PATH = Path("schemas/FalconForge_Integrity_Manifest_v3_5.json")
LOG_DIR = Path("archive/CAP_LOGS")
LOG_DIR.mkdir(parents=True, exist_ok=True)

def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def log(msg):
    log_file = LOG_DIR / f"integrity_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.log"
    with open(log_file, "a", encoding="utf-8") as lf:
        lf.write(msg + "\n")
    print(msg)

def fetch(url, target):
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    with open(target, "wb") as f:
        f.write(r.content)

def main():
    try:
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        expected = [m for m in manifest["modules"] if m["name"] == "ATHENA_CAP_SCHEMA_v3_5.json"][0]["sha256"].split(":")[1]
    except Exception as e:
        log(Fore.YELLOW + f"Manifest error: {e}, attempting to refetch.")
        fetch("https://raw.githubusercontent.com/falconforge-ai/falconforge-codex/main/falconforge-athena-v3_5/canonical/FalconForge_Integrity_Manifest_v3_5.json", MANIFEST_PATH)
        return main()

    actual = sha256_file(SCHEMA_PATH)
    if actual != expected:
        log(Fore.RED + "❌ Integrity mismatch detected!")
        fetch("https://raw.githubusercontent.com/falconforge-ai/falconforge-codex/main/falconforge-athena-v3_5/canonical/ATHENA_CAP_SCHEMA_v3_5.json", SCHEMA_PATH)
        if sha256_file(SCHEMA_PATH) == expected:
            log(Fore.GREEN + "✅ Self-healing successful — schema replaced.")
        else:
            log(Fore.RED + "❌ Self-healing failed.")
            sys.exit(1)
    else:
        log(Fore.GREEN + "✅ Integrity verified — hashes match.")

    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as s, open("cap_record.json", "r", encoding="utf-8") as c:
            schema, cap = json.load(s), json.load(c)
        validate(instance=cap, schema=schema)
        log(Fore.GREEN + "✅ CAP payload structure valid.")
    except ValidationError as e:
        log(Fore.RED + f"❌ CAP validation failed: {e.message}")
        sys.exit(1)
    except Exception as e:
        log(Fore.RED + f"❌ Unexpected error: {e}")
        sys.exit(1)

    logs = sorted(LOG_DIR.glob("integrity_*.log"), key=os.path.getmtime, reverse=True)
    for old in logs[10:]:
        old.unlink(missing_ok=True)
    log(Fore.CYAN + "🪶 Log archival complete.")

if __name__ == "__main__":
    main()


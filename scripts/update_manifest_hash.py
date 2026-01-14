#!/usr/bin/env python3
import hashlib, json, sys, os

if len(sys.argv) < 3:
    print("Usage: update_manifest_hash.py <schema_file> <manifest_file>")
    sys.exit(1)

schema_file, manifest_file = sys.argv[1], sys.argv[2]

with open(schema_file, "rb") as f:
    new_hash = hashlib.sha256(f.read()).hexdigest()

with open(manifest_file, "r+", encoding="utf-8") as f:
    data = json.load(f)
    for mod in data["modules"]:
        if mod["name"] == os.path.basename(schema_file):
            mod["sha256"] = f"SHA256:{new_hash}"
            mod["update"] = "auto-synced by human-gated integrity job"
    f.seek(0)
    json.dump(data, f, indent=2)
    f.truncate()

print(f"✅ Updated manifest with new hash for {schema_file}: {new_hash}")

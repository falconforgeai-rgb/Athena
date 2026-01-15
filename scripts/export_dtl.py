#!/usr/bin/env python3
"""
export_dtl.py
----------------------------------------
Bundles recent CAP payloads into a Decision Trace Ledger export for audit.
"""

import os, sys, json, datetime

if len(sys.argv) < 3:
    print("Usage: export_dtl.py <payload_dir> <output_dir>")
    sys.exit(1)

payload_dir, output_dir = sys.argv[1], sys.argv[2]
os.makedirs(output_dir, exist_ok=True)

timestamp = datetime.datetime.utcnow().isoformat()
bundle = {"timestamp": timestamp, "records": []}

for filename in os.listdir(payload_dir):
    if not filename.endswith(".json"):
        continue
    with open(os.path.join(payload_dir, filename), "r", encoding="utf-8") as f:
        try:
            bundle["records"].append(json.load(f))
        except:
            continue

output_path = os.path.join(output_dir, f"DTL_EXPORT_{timestamp}.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(bundle, f, indent=2)

print(f"✅ Decision Trace Ledger exported to {output_path}")

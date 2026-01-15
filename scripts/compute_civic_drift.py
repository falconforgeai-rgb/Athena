#!/usr/bin/env python3
"""
compute_civic_drift.py
----------------------------------------
Computes Humanization (HS), Empathy Drift (ERΔ), and Civic Accessibility (CAI)
averages from CAP payloads. Prints an overall compliance index.
"""

import os, json, statistics, sys

if len(sys.argv) < 2:
    print("Usage: compute_civic_drift.py <payload_dir>")
    sys.exit(1)

payload_dir = sys.argv[1]
metrics = {"HS": [], "ERD": [], "CAI": []}

for filename in os.listdir(payload_dir):
    if not filename.endswith(".json"):
        continue
    path = os.path.join(payload_dir, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        civic = data.get("metrics", {})
        for k in metrics:
            if k in civic:
                metrics[k].append(float(civic[k]))
    except Exception:
        continue

def avg(values): return round(statistics.mean(values), 3) if values else 0

HS, ERD, CAI = avg(metrics["HS"]), avg(metrics["ERD"]), avg(metrics["CAI"])
CCI = round((HS + (1 - ERD) + CAI) / 3, 3)

print(f"HS={HS}  ERΔ={ERD}  CAI={CAI}")
print(f"Civic Compliance Index (CCI): {CCI}")

if CCI < 0.7:
    print("❌ Civic compliance below threshold.")
    sys.exit(1)
else:
    print("✅ Civic compliance within acceptable range.")

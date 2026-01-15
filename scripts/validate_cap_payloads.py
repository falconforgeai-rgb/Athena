#!/usr/bin/env python3
"""
validate_cap_payloads.py
----------------------------------------
Validates CAP payloads (JSON files) against the canonical schema.
"""

import json, os, sys
from jsonschema import validate, ValidationError

if len(sys.argv) < 3:
    print("Usage: validate_cap_payloads.py <schema_file> <payload_dir>")
    sys.exit(1)

schema_file, payload_dir = sys.argv[1], sys.argv[2]

with open(schema_file, "r", encoding="utf-8") as f:
    schema = json.load(f)

errors = []
for filename in os.listdir(payload_dir):
    if not filename.endswith(".json"):
        continue
    path = os.path.join(payload_dir, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        validate(instance=data, schema=schema)
        print(f"✅ Valid: {filename}")
    except ValidationError as e:
        print(f"❌ Invalid: {filename} — {e.message}")
        errors.append(filename)
    except json.JSONDecodeError:
        print(f"⚠️ Skipped non-JSON file: {filename}")

if errors:
    print(f"❌ {len(errors)} CAP payloads failed validation.")
    sys.exit(1)
else:
    print("✅ All CAP payloads conform to schema.")

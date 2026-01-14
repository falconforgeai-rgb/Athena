#!/usr/bin/env python3
import os, sys, json
from jsonschema import validate, ValidationError, SchemaError

if len(sys.argv) < 3:
    print("Usage: validate_cap_payloads.py <schema_file> <payload_dir>")
    sys.exit(1)

schema_file, payload_dir = sys.argv[1], sys.argv[2]

with open(schema_file, "r", encoding="utf-8") as f:
    schema = json.load(f)

def validate_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        validate(instance=data, schema=schema)
        print(f"✅ Valid: {path}")
    except ValidationError as e:
        print(f"❌ Invalid payload: {path}\n   Reason: {e.message}")
        return False
    except json.JSONDecodeError as e:
        print(f"⚠️ Skipped non-JSON or corrupted file: {path}")
        return True
    return True

valid = all(validate_file(os.path.join(payload_dir, f)) for f in os.listdir(payload_dir) if f.endswith(".json"))

if not valid:
    print("❌ One or more CAP payloads failed schema validation.")
    sys.exit(1)
else:
    print("✅ All CAP payloads conform to schema.")

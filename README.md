# 🧭 Athena CAP Ledger (v3.4)
### FalconForgeAI Canonical Audit Pipeline for Compassion + Humanization Validation

This repository implements the **Athena CAP (Compassion Audit Pass)** system — a canonical, explainable, and cryptographically verified pipeline for validating humanization and ethical reasoning outputs from the Athena reasoning environment.

---

## 🧩 Overview

Each CAP event passes through the following stages:

1. **Normalization** → `normalize.js`  
   Canonicalizes all JSON keys and trims values for deterministic hashing.

2. **Signing** → `sign_cap.js`  
   Automatically generates a UUIDv7 `cap_id`, computes a SHA256 ethics signature, and injects it into the payload.

3. **Validation** → GitHub Action (`athena_cap_validation_dual.yml`)  
   Validates the payload against `ATHENA_CAP_SCHEMA_v3_4.json`, verifies the signature, and commits to the on-chain ledger (`CAP_LOGS/`).

4. **Ledgering** → Canonical GitHub Commit  
   Each CAP record is stored immutably and versioned for audit transparency.

---

## ⚙️ Usage

### Generate & Sign Locally
```bash
node sign_cap.js cap_payload.json

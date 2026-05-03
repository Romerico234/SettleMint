# Scripts

Utility scripts for SettleMint live in this directory.

## Overview

- Run scripts from their own folder, not from the repository root.
- Use the shared `scripts/.venv` environment for Python-based scripts.
- Install dependencies from `scripts/requirements.txt`.
- Check each script folder for script-specific usage details.

## Typical Setup

```bash
cd scripts/<script-folder>
python3 -m venv ../.venv
source ../.venv/bin/activate
python3 -m pip install -r ../requirements.txt
python3 <script-name>.py
```

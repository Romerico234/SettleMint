# Scripts

This directory contains utility scripts for SettleMint.

## General Script Workflow

Most scripts in this directory should be run from their own script folder instead of the repository root.

```bash
cd /Users/romericodavid/repos/SettleMint/scripts/<script-folder>
```

### 1. Create a virtual environment

Use a shared virtual environment for repository-level scripts:

```bash
python3 -m venv ../.venv
```

### 2. Activate the virtual environment

```bash
source ../.venv/bin/activate
```

### 3. Install script dependencies

```bash
python3 -m pip install -r ../requirements.txt
```

### 4. Run the script

Run the script using the command format documented in that script's folder README.

Examples:

```bash
python3 populate_dev_db.py
```

---
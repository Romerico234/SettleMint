# `populate-dev-db`

This script seeds the local development MongoDB database with development data for UI and backend testing. Use this script when you want to quickly populate the local development database with a known baseline dataset.

## How To Run

Run these commands from this script directory:

```bash
cd /Users/romericodavid/repos/SettleMint/scripts/populate-dev-db
```

### Recommended setup

Follow the shared setup in [scripts/README.md](/Users/romericodavid/repos/SettleMint/scripts/README.md):

```bash
python3 -m venv ../.venv
source ../.venv/bin/activate
python3 -m pip install -r ../requirements.txt
```

### Default local development database

```bash
python3 populate_dev_db.py
```

This defaults to:

- MongoDB URI: `mongodb://localhost:27017`
- Database: `settlemint_db_dev`

### Custom connection arguments

```bash
python3 populate_dev_db.py mongodb://localhost:27017 settlemint_db_dev
```

## Notes

- The script is intended for local development only
- It drops the target database before recreating the development seed data
- It is destructive for the selected database and should only be used against local development data
- It is rerunnable and recreates the same baseline dataset each time

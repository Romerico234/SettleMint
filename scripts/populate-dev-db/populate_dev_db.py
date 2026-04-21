from __future__ import annotations

import sys
from collections import Counter
from datetime import datetime, timezone

try:
    from pymongo import MongoClient
except ImportError as exc:  # pragma: no cover - dependency guidance
    raise SystemExit(
        "PyMongo is required to run this script. Install it with "
        "`python3 -m pip install pymongo` and rerun."
    ) from exc


DEFAULT_MONGODB_URI = "mongodb://localhost:27017"
DEFAULT_DATABASE_NAME = "settlemint_db_dev"


def utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


USER_PROFILES = [
    {
        "_id": "0x2797b22bfbb830de49fe9bb639e4a4c13e5579a4",
        "wallet_address": "0x2797b22bfbb830de49fe9bb639e4a4c13e5579a4",
        "display_name": "Mico",
        "created_at": utc("2026-04-14T19:29:52.587Z"),
        "updated_at": utc("2026-04-15T22:01:24.714Z"),
    },
    {
        "_id": "0x6508118a40b724af44b6fbab8dbdc3a5da38718b",
        "wallet_address": "0x6508118a40b724af44b6fbab8dbdc3a5da38718b",
        "display_name": "Ray",
        "created_at": utc("2026-04-15T18:44:06.040Z"),
        "updated_at": utc("2026-04-15T18:44:28.201Z"),
    },
    {
        "_id": "0x1508138a40b224af4436fbab8d5dc3a5d338718b",
        "wallet_address": "0x1508138a40b224af4436fbab8d5dc3a5d338718b",
        "display_name": "Bob",
        "created_at": utc("2026-04-15T16:44:06.040Z"),
        "updated_at": utc("2026-04-15T16:44:28.201Z"),
    },
]


GROUPS = [
    {
        "_id": "grp_2ba4c65dd7bb70e8",
        "name": "Towson Tigers",
        "owner_wallet": "0x2797b22bfbb830de49fe9bb639e4a4c13e5579a4",
        "invite_code": "inv_d71ba3645cbe9203",
        "created_at": utc("2026-04-15T20:33:58.510Z"),
        "updated_at": utc("2026-04-15T20:33:58.510Z"),
    },
    {
        "_id": "grp_guyanaese_tigers",
        "name": "Guyanaese Tigers",
        "owner_wallet": "0x6508118a40b724af44b6fbab8dbdc3a5da38718b",
        "invite_code": "inv_guyanaese_tigers",
        "created_at": utc("2026-04-15T21:30:00.000Z"),
        "updated_at": utc("2026-04-15T21:56:30.465Z"),
    },
]


MEMBERSHIPS = [
    {
        "group_id": "grp_2ba4c65dd7bb70e8",
        "wallet_address": "0x2797b22bfbb830de49fe9bb639e4a4c13e5579a4",
        "role": "owner",
        "created_at": utc("2026-04-15T20:33:58.510Z"),
    },
    {
        "group_id": "grp_guyanaese_tigers",
        "wallet_address": "0x6508118a40b724af44b6fbab8dbdc3a5da38718b",
        "role": "owner",
        "created_at": utc("2026-04-15T21:30:00.000Z"),
    },
    {
        "group_id": "grp_2ba4c65dd7bb70e8",
        "wallet_address": "0x6508118a40b724af44b6fbab8dbdc3a5da38718b",
        "role": "member",
        "created_at": utc("2026-04-15T21:31:00.000Z"),
    },
    {
        "group_id": "grp_guyanaese_tigers",
        "wallet_address": "0x2797b22bfbb830de49fe9bb639e4a4c13e5579a4",
        "role": "member",
        "created_at": utc("2026-04-15T21:56:30.457Z"),
    },
    {
        "group_id": "grp_2ba4c65dd7bb70e8",
        "wallet_address": "0x1508138a40b224af4436fbab8d5dc3a5d338718b",
        "role": "member",
        "created_at": utc("2026-04-15T20:31:00.000Z"),
    },
]


def seed_database(mongodb_uri: str, database_name: str) -> None:
    client = MongoClient(mongodb_uri)
    client.drop_database(database_name)
    database = client[database_name]

    user_profiles_collection = database["user_profiles"]
    groups_collection = database["groups"]
    group_memberships_collection = database["group_memberships"]

    seeded_group_ids = [group["_id"] for group in GROUPS]
    member_counts = Counter(membership["group_id"] for membership in MEMBERSHIPS)

    print()
    print(f"Seeding development database: {database_name}")
    print("Dropped existing database before seeding")

    for profile in USER_PROFILES:
        user_profiles_collection.replace_one({"_id": profile["_id"]}, profile, upsert=True)

    for group in GROUPS:
        groups_collection.replace_one(
            {"_id": group["_id"]},
            {
                **group,
                "member_count": member_counts.get(group["_id"], 0),
            },
            upsert=True,
        )

    group_memberships_collection.delete_many({"group_id": {"$in": seeded_group_ids}})
    if MEMBERSHIPS:
        group_memberships_collection.insert_many(MEMBERSHIPS)

    print(f"Upserted {len(USER_PROFILES)} user profiles")
    print(f"Upserted {len(GROUPS)} groups")
    print(f"Inserted {len(MEMBERSHIPS)} group memberships")
    print()
    print("Seeded groups:")
    for group in GROUPS:
        print(f"- {group['name']} ({member_counts.get(group['_id'], 0)} members)")
    print()
    print("Development seed complete.")


def main() -> int:
    mongodb_uri = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_MONGODB_URI
    database_name = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_DATABASE_NAME
    seed_database(mongodb_uri, database_name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

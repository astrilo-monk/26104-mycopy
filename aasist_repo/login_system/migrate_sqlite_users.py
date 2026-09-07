"""One-off local SQLite-to-Supabase user migration utility.

Run only after AUTH_DATABASE_URL and SECRET_KEY are configured. The source is
read-only; existing Supabase users with the same email are left untouched.
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

try:
    from .database import Base, SessionLocal, engine
    from .models import User
except ImportError:
    from database import Base, SessionLocal, engine
    from models import User


def migrate(source: Path) -> tuple[int, int]:
    if not source.is_file():
        raise FileNotFoundError(f"SQLite database not found: {source}")

    connection = sqlite3.connect(source)
    try:
        rows = connection.execute("SELECT id, name, email, password FROM users").fetchall()
    except sqlite3.Error as exception:
        raise RuntimeError("The source SQLite database does not contain a readable users table.") from exception
    finally:
        connection.close()

    Base.metadata.create_all(bind=engine)
    migrated = 0
    skipped = 0
    with SessionLocal.begin() as session:
        for _user_id, name, email, password in rows:
            if session.query(User).filter(User.email == email).first() is not None:
                skipped += 1
                continue
            # Let Postgres allocate IDs so its sequence remains correct for new signups.
            session.add(User(name=name, email=email, password=password))
            migrated += 1

    return migrated, skipped


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate login users from SQLite to Supabase Postgres")
    parser.add_argument("--source", required=True, type=Path, help="Path to the legacy users.db file")
    arguments = parser.parse_args()
    migrated_count, skipped_count = migrate(arguments.source)
    print(f"Migrated {migrated_count} user(s); skipped {skipped_count} existing email(s).")

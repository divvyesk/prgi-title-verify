"""
Load the full PRGI title corpus into the titles table.

Replaces data/datasets/dataset1/scripts/load_data.py for integration use.
That script targets psycopg2 (not a project dependency — the project
standardised on psycopg3) and a hardcoded personal database, so it cannot run
on anyone else's machine. This one uses psycopg3 and resolves the connection
through search/db.py, so it always writes to the same database the backend
reads from.

Uses COPY rather than INSERT: 82k rows is slow enough via executemany to be
annoying to re-run, and re-running this is exactly what you do while getting
a demo environment right.

    python3 scripts/load_titles.py            # load if empty
    python3 scripts/load_titles.py --truncate # wipe and reload
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO))

from search.db import connection, database_url  # noqa: E402

CSV_FILE = REPO / "data" / "datasets" / "dataset1" / "data" / "processed" / "title_features.csv"

# CSV header -> titles column. Order here is the COPY column order.
COLUMNS = [
    ("title_id", "title_id"),
    ("SN.", "serial_number"),
    ("Title", "title"),
    ("Registration Number", "registration_number"),
    ("Registration Date", "registration_date"),
    ("Language", "language"),
    ("Periodicity", "periodicity"),
    ("Publisher", "publisher"),
    ("Owner", "owner"),
    ("Publication State", "publication_state"),
    ("Publication District", "publication_district"),
    ("data_quality_status", "data_quality_status"),
    ("title_original", "title_original"),
    ("title_normalized", "title_normalized"),
    ("language_normalized", "language_normalized"),
    ("script", "script"),
    ("script_components", "script_components"),
    ("title_transliterated", "title_transliterated"),
    ("transliteration_status", "transliteration_status"),
    ("title_core", "title_core"),
]

_INT_COLS = {"title_id", "serial_number"}
_DATE_COLS = {"registration_date"}


def _clean(value: str | None):
    if value is None:
        return None
    value = value.strip()
    return value or None


def _parse_date(value: str | None):
    value = _clean(value)
    if not value:
        return None
    # Source is DD-MM-YYYY. A handful of rows carry junk dates; those become
    # NULL rather than failing the whole 82k-row load.
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _parse_int(value: str | None):
    value = _clean(value)
    if value is None:
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--truncate", action="store_true", help="wipe titles before loading")
    args = ap.parse_args()

    if not CSV_FILE.exists():
        print(f"ERROR: {CSV_FILE} not found", file=sys.stderr)
        return 1

    print(f"database : {database_url()}")
    print(f"source   : {CSV_FILE.relative_to(REPO)}")

    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM titles")
        existing = cur.fetchone()[0]

        if existing and not args.truncate:
            print(f"titles already has {existing:,} rows — pass --truncate to reload")
            return 0

        if args.truncate and existing:
            print(f"truncating {existing:,} existing rows")
            cur.execute("TRUNCATE titles")

        db_cols = [db for _, db in COLUMNS]
        copy_sql = f"COPY titles ({', '.join(db_cols)}) FROM STDIN"

        t0 = time.time()
        loaded = skipped = 0

        with CSV_FILE.open(encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            with cur.copy(copy_sql) as copy:
                for row in reader:
                    record = []
                    for csv_key, db_col in COLUMNS:
                        raw = row.get(csv_key)
                        if db_col in _DATE_COLS:
                            record.append(_parse_date(raw))
                        elif db_col in _INT_COLS:
                            record.append(_parse_int(raw))
                        else:
                            record.append(_clean(raw))

                    # title_id is the primary key; a row without one cannot load.
                    if record[0] is None:
                        skipped += 1
                        continue

                    copy.write_row(record)
                    loaded += 1

        conn.commit()
        elapsed = time.time() - t0

        cur.execute("SELECT count(*) FROM titles")
        final = cur.fetchone()[0]

    print(f"loaded {loaded:,} rows in {elapsed:.1f}s ({skipped:,} skipped)")
    print(f"titles now has {final:,} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

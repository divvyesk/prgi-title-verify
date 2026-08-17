import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from ml.similarity.phonetic import _QueryRep
from search.db import connection, database_url


def main():
    # Connection resolved via search/db.py so this writes to the same
    # database the backend reads from, on psycopg3 (the project driver).
    print(f"database: {database_url()}")
    with connection() as conn, conn.cursor() as cur:
        _backfill(conn, cur)


def _backfill(conn, cur):
    print("Fetching rows that need backfill...")
    cur.execute(
        "SELECT title_id, title_normalized FROM titles WHERE title_phonetic IS NULL"
    )
    rows = cur.fetchall()

    total_rows = len(rows)
    print(f"Rows to backfill: {total_rows}")

    if total_rows == 0:
        print("Nothing to do.")
        return

    batch_size = 2000
    updates = []

    # Prepare update statement. We use Postgres' VALUES functionality via execute_values.
    update_query = """
        UPDATE titles
        SET title_phonetic = %s,
            title_skeleton = %s
        WHERE title_id = %s
    """

    for i, (title_id, title_normalized) in enumerate(rows, 1):
        if not title_normalized:
            qr = _QueryRep("")
        else:
            qr = _QueryRep(title_normalized)

        # Build title_phonetic matching the _QueryRep list[set[str]] structure.
        # This stringification is deterministic because the codes within each
        # token set are sorted, and the sets themselves are sorted by _QueryRep.
        tokens_str = []
        for code_set in qr.dm_codes:
            tokens_str.append(" ".join(sorted(code_set)))
        title_phonetic = " ".join(tokens_str)

        title_skeleton = qr.skel

        updates.append((title_phonetic, title_skeleton, title_id))

        if len(updates) >= batch_size:
            cur.executemany(update_query, updates)
            conn.commit()
            print(f"Processed {i} / {total_rows}")
            updates = []

    if updates:
        cur.executemany(update_query, updates)
        conn.commit()
        print(f"Processed {total_rows} / {total_rows}")

    print("Backfill complete.")


if __name__ == "__main__":
    main()

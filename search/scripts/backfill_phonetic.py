import os
import sys

import psycopg2
from psycopg2.extras import execute_values

from ml.similarity.phonetic import _QueryRep


def main():
    # Follow repository convention: use .env / environment variables
    db_name = os.getenv("DB_NAME", "dataset1")
    db_user = os.getenv("DB_USER", "pruthv")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_password = os.getenv("DB_PASSWORD", "")

    conn_args = {
        "dbname": db_name,
        "user": db_user,
        "host": db_host,
        "port": db_port,
    }
    if db_password:
        conn_args["password"] = db_password

    try:
        conn = psycopg2.connect(**conn_args)
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        sys.exit(1)

    cur = conn.cursor()

    print("Fetching rows that need backfill...")
    cur.execute(
        "SELECT title_id, title_normalized FROM titles WHERE title_phonetic IS NULL"
    )
    rows = cur.fetchall()

    total_rows = len(rows)
    print(f"Rows to backfill: {total_rows}")

    if total_rows == 0:
        print("Nothing to do.")
        cur.close()
        conn.close()
        return

    batch_size = 2000
    updates = []

    # Prepare update statement. We use Postgres' VALUES functionality via execute_values.
    update_query = """
        UPDATE titles
        SET title_phonetic = data.phonetic,
            title_skeleton = data.skeleton
        FROM (VALUES %s) AS data(phonetic, skeleton, id)
        WHERE titles.title_id = data.id
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
            execute_values(cur, update_query, updates)
            conn.commit()
            print(f"Processed {i} / {total_rows}")
            updates = []

    if updates:
        execute_values(cur, update_query, updates)
        conn.commit()
        print(f"Processed {total_rows} / {total_rows}")

    cur.close()
    conn.close()
    print("Backfill complete.")


if __name__ == "__main__":
    main()

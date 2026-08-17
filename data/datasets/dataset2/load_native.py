import csv
from pathlib import Path
import psycopg

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
CSV_FILE = BASE_DIR / "data" / "datasets" / "dataset2" / "native_sample.csv"

DB_CONFIG = {
    "dbname": "dataset1",
    "user": "pruthv",
    "host": "localhost",
    "port": 5432,
}

def load_data():
    if not CSV_FILE.exists():
        print(f"File not found: {CSV_FILE}")
        return

    conn = psycopg.connect(**DB_CONFIG)
    cur = conn.cursor()

    try:
        # First, ensure the source column exists
        cur.execute("ALTER TABLE titles ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'dataset1'")
        
        with CSV_FILE.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        if not rows:
            print("No rows found in native_sample.csv")
            return

        print(f"Preparing to insert {len(rows)} synthetic records...")

        # Find the max title_id so we don't collide
        cur.execute("SELECT COALESCE(MAX(title_id), 0) FROM titles")
        max_id = cur.fetchone()[0]

        values = []
        for i, row in enumerate(rows, start=1):
            new_id = max_id + i
            # the original title is kept in title_original/title_normalized
            # the native script is put in title
            values.append((
                new_id,
                row["title_native"],          # title
                row["title_latin"],           # title_original
                row["title_latin"].lower(),   # title_normalized
                row["language"],              # language_normalized
                row["script"],                # script
                row["title_latin"].lower(),   # title_transliterated
                row["source"],                # source
                row["title_latin"],           # title_core (simplified)
            ))

        query = """
            INSERT INTO titles (
                title_id, title, title_original, title_normalized, 
                language_normalized, script, title_transliterated, source, title_core
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        cur.executemany(query, values)
        
        conn.commit()
        print(f"✅ Successfully inserted {len(rows)} rows into 'titles' table with source='SYNTHETIC_NATIVE'.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error during load: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    load_data()

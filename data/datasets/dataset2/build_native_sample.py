import csv
import random
from indic_transliteration import sanscript
from pathlib import Path

def main():
    random.seed(42)  # For reproducibility
    
    # Use repo root paths
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    master_csv = repo_root / "title_master.csv"
    output_csv = repo_root / "data" / "datasets" / "dataset2" / "native_sample.csv"
    
    # Read the title_master.csv and find valid candidates
    samples = []
    
    print(f"Reading from {master_csv}...")
    with master_csv.open(encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            lang = row.get("Language", "").strip().lower()
            
            # Map the exact spelling of Language in title_master.csv
            # We accept Hindi, Marathi, Tamil
            if lang in ("hindi", "marathi", "tamil"):
                status = row.get("data_quality_status", "").strip()
                if status == "VALID":
                    samples.append({
                        "title_id": row["title_id"],
                        "title_latin": row["Title"],
                        "language": lang.capitalize()
                    })
    
    print(f"Found {len(samples)} valid Hindi/Marathi/Tamil titles.")
    
    # Take 200 rows
    if len(samples) > 200:
        picked = random.sample(samples, 200)
    else:
        picked = samples
        
    print(f"Generating transliterations for {len(picked)} titles...")
    
    results = []
    for item in picked:
        lang = item["language"]
        orig = item["title_latin"].lower()
        
        # Decide target script based on language
        if lang == "Tamil":
            target_script = sanscript.TAMIL
            script_name = "Tamil"
        else:
            target_script = sanscript.DEVANAGARI
            script_name = "Devanagari"
            
        # Perform ITRANS transliteration
        native_text = sanscript.transliterate(orig, sanscript.ITRANS, target_script)
        
        results.append({
            "title_id": item["title_id"],
            "title_latin": item["title_latin"],
            "title_native": native_text,
            "script": script_name,
            "language": lang,
            "source": "SYNTHETIC_NATIVE"
        })
        
    # Write the output CSV
    print(f"Writing output to {output_csv}...")
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    
    with output_csv.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["title_id", "title_latin", "title_native", "script", "language", "source"])
        writer.writeheader()
        writer.writerows(results)
        
    print("Done!")

    # Spot check: print 20 to the console
    print("\n--- SPOT CHECK (First 20 titles) ---")
    print(f"{'Latin (Original)':<35} | {'Native (Synthetic)':<30} | {'Lang':<8}")
    print("-" * 80)
    for res in results[:20]:
        print(f"{res['title_latin']:<35} | {res['title_native']:<30} | {res['language']:<8}")

if __name__ == "__main__":
    main()

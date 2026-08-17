import json
import sys

def validate():
    try:
        with open("data/rules/rules.json") as f:
            rules = json.load(f)
    except Exception as e:
        print(f"Error loading rules.json: {e}")
        sys.exit(1)

    seen_ids = set()
    errors = []

    for idx, rule in enumerate(rules):
        rid = rule.get("rule_id", "")
        if not rid:
            errors.append(f"Rule at index {idx} has no rule_id.")
        elif rid in seen_ids:
            errors.append(f"Duplicate rule_id found: {rid}")
        seen_ids.add(rid)

        if not rule.get("description"):
            errors.append(f"Rule {rid} has empty description.")

        sev = rule.get("severity")
        if sev not in ["CRITICAL", "WARNING", "INFO"]:
            errors.append(f"Rule {rid} has invalid severity: {sev}")

        fails = rule.get("examples_fail", [])
        if not fails or len(fails) < 1:
            errors.append(f"Rule {rid} must have at least one failing example.")

        verified = rule.get("source_clause_verified")
        clause = rule.get("source_clause", "")
        if verified is True and not clause:
            errors.append(f"Rule {rid} is verified but has empty source_clause.")
        if verified is False and not clause:
            errors.append(f"Rule {rid} is not verified but has empty source_clause (must describe where we looked).")
        if verified not in [True, False]:
            errors.append(f"Rule {rid} source_clause_verified must be boolean.")

    if errors:
        print("Validation Failed:")
        for e in errors:
            print(f" - {e}")
        sys.exit(1)
    else:
        print(f"Validation Passed! {len(rules)} rules checked.")

if __name__ == "__main__":
    validate()

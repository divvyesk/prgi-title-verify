"""
TEMPORARY placeholder retrieval corpus — Suhani's own scope (ml/rag/), not
touching anyone else's folder. Deleted the moment either of the two real
sources Prompt 5 names actually exists:

  1. Pruthviraj's guideline_chunks table (data/rules/, ml/rules/,
     ml/embeddings/), or
  2. contracts/fixtures/rules_seed.json's retrieval_chunk field.

Neither exists on `main` as of this prompt — checked directly, not
assumed. ml/rag/retrieve.py tries both real sources FIRST and only falls
back to this file if neither is there, so nothing here needs to change
when either lands; this file just stops being read.

IMPORTANT: every source_clause below is source_clause_verified=False.
This is reconstructed from memory of Pruthviraj's own in-progress,
unmerged work (seen during repo review, not independently re-checked
against the official PRGI guideline document) — NOT a verified citation.
Treating unverified placeholder text as real is exactly the failure mode
this whole feature exists to prevent, so ml/rag/explain.py must never
present anything from here as a confirmed citation, and neither should
you if you're reading this to understand what "real" data will look like.
"""

from __future__ import annotations

PLACEHOLDER_CHUNKS: list[dict] = [
    {
        "rule_id": "R-GEN-01",
        "rule_name": "Generic or root word titles",
        "severity": "CRITICAL",
        "source_clause": (
            "Generic, or root word titles shall not be registered."
        ),
        "source_clause_verified": False,
        "retrieval_chunk": (
            "The proposed titles should preferably contain more than one word "
            "formed by combining distinct and meaningful terms. Generic, or "
            "root word titles shall not be registered."
        ),
    },
    {
        "rule_id": "R-DUP-01",
        "rule_name": "Phonetic and visual similarity",
        "severity": "CRITICAL",
        "source_clause": (
            "The proposed titles must be unique and shall not be phonetically "
            "or visually similar to any existing registered title whether in "
            "the same language across India or any other language within the "
            "same State."
        ),
        "source_clause_verified": False,
        "retrieval_chunk": (
            "Proposed titles must be unique and not phonetically or visually "
            "similar to an existing registered title. This applies both "
            "within the same language across India and across languages "
            "within the same State."
        ),
    },
    {
        "rule_id": "R-COM-01",
        "rule_name": "Commercial and matrimonial catalogue ban",
        "severity": "CRITICAL",
        "source_clause": (
            "A title that presents itself as a classifieds, matrimonial or "
            "product-listing service is not admissible as a periodical title."
        ),
        "source_clause_verified": False,
        "retrieval_chunk": (
            "Titles that function as commercial classifieds, matrimonial "
            "listings, or product catalogues rather than genuine periodical "
            "publications are not admissible for registration."
        ),
    },
    {
        "rule_id": "R-LEN-01",
        "rule_name": "Minimum distinctiveness length",
        "severity": "WARNING",
        "source_clause": (
            "A title consisting of a single common word without a "
            "distinguishing qualifier may be treated as insufficiently "
            "distinctive."
        ),
        "source_clause_verified": False,
        "retrieval_chunk": (
            "Single common-word titles lacking a distinguishing qualifier "
            "(a place name, an institutional name, or a similar specific "
            "term) may be found insufficiently distinctive from other "
            "registered titles."
        ),
    },
    {
        "rule_id": "R-SCR-01",
        "rule_name": "Cross-script confusable titles",
        "severity": "WARNING",
        "source_clause": (
            "A title transliterated from another script must still be "
            "assessed for similarity against titles already registered in "
            "the target script."
        ),
        "source_clause_verified": False,
        "retrieval_chunk": (
            "Transliteration into Roman or another script does not exempt a "
            "title from similarity assessment against titles already on the "
            "register in that script."
        ),
    },
]

# Product Requirements Document — Automated Press Title Verification System

**Problem Statement:** PSS06 (Smart India Hackathon 2026)
**Document type:** Product Requirements Document (PRD) — pure specification. This document defines *what* is being built and *why* each decision was made. It does not track who is building it or what has been completed — that information lives in separate project-management documents.
**Status:** Source of truth for product scope, features, architecture, and technology decisions.

---

## Table of Contents
1. Overview & Vision
2. Problem Statement
3. Goals, Objectives & Success Metrics
4. Scope
5. Users & User Stories
6. Functional Requirements (Feature Specifications)
7. System Architecture
8. Technology Stack — In-Depth Analysis
9. Data Model
10. API Specification
11. Non-Functional Requirements
12. Assumptions & Constraints
13. Risks & Open Questions
14. Timeline & Milestones
15. Glossary

---

## 1. Overview & Vision

Every new newspaper or periodical published in India must have its title approved by the **Press Registrar General of India (PRGI)**. Approval requires checking the proposed title against roughly **160,000 existing registered titles** to ensure it is not confusingly similar to one that already exists, and separately checking it against a rulebook of naming restrictions unrelated to similarity (banned words, generic names, personal names, etc.).

This system automates that verification. Given a proposed title, it:
1. Determines how similar the title is to every existing registered title, using four independent similarity signals (not just exact text matching).
2. Determines whether the title violates any rule in the official PRGI Guidelines for Admissibility of Titles.
3. Returns a clear, evidence-backed verdict — not a black-box yes/no.
4. Optionally proposes alternative titles, pre-verified to pass, when the original fails.

The system is a **decision-support tool**, not a decision-making authority. A human officer always makes the final legal determination; the system's job is to make that determination fast, consistent, and explainable instead of slow, manual, and officer-dependent.

---

## 2. Problem Statement

### 2.1 Current process
```
Applicant → Press Sewa Portal (online submission) → District Magistrate (local endorsement)
         → PRGI (final title approval) → Applicant
```
Title verification is the first gate in this chain — nothing proceeds until the title is cleared.

### 2.2 Why the current process fails
| Failure mode | Detail |
|---|---|
| **Speed** | Each verification cycle takes 25–30 days. |
| **Cost of failure** | Each rejected attempt costs the applicant approximately ₹1,000 and forces a full restart. |
| **Consistency** | Outcome depends on which officer reviews the case; there is no standardized scoring. |
| **Similarity blindness** | Manual/plain-text checking misses non-exact similarity (see 2.3). |
| **No explanation** | A rejection typically comes with no specific, actionable reason. |

### 2.3 Similarity patterns that must be detected
A proposed title can be "confusingly similar" to an existing one without being textually identical:

| Pattern | Example |
|---|---|
| Word reordering | "Times India" vs "India Times" |
| Phonetic similarity / spelling variation | "Jagran" vs "Jaagran" |
| Cross-language semantic equivalence | "Daily News" vs "Dainik Samachar" |
| Trivial modification with common words | "The Daily News" vs "Daily News" |
| Partial recombination of existing titles | "Daily Bazaar News" from "Daily News" + "Bazaar Times" |

### 2.4 Rule violations independent of similarity
Even a title with zero similarity to any existing title can still be inadmissible under the official guidelines:
- Single generic root words (e.g. a title that is just "News" or "Times").
- Government- or UN-style naming conventions.
- Internet slang or purely commercial/promotional terms.
- Symbols, emojis, or non-standard characters.
- The applicant's own personal name used as the title.

Because these two failure categories are structurally different (fuzzy similarity vs. deterministic rule violation), the system requires **two separate, purpose-built checking mechanisms**, not one generalized classifier.

---

## 3. Goals, Objectives & Success Metrics

### 3.1 Primary Objective
Reduce title-verification time from weeks to seconds, while making every verdict explainable and auditable, without removing final legal authority from PRGI officers.

### 3.2 Success Metrics
| Metric | Definition | Target |
|---|---|---|
| Verification latency | Time from title submission to full verdict | < 2 seconds (warm) |
| Shortlist recall | Rate at which the true closest match appears in the candidate shortlist | ≥ 95% |
| Explainability coverage | Rejected/flagged verdicts that include ≥1 specific, concrete reason | 100% |
| Rule auditability | Rule-engine decisions traceable to a specific rule ID and guideline clause | 100% |
| Suggestion quality | Alternative titles shown to an applicant that independently pass full verification | 100% (no unverified suggestion is ever shown) |

---

## 4. Scope

### 4.1 In Scope
- Title similarity detection across lexical, phonetic, semantic, and structural (core-word) dimensions.
- Deterministic rule checking against the official PRGI admissibility guidelines.
- Explainable, evidence-backed verdicts for applicants.
- Guideline-grounded natural-language explanations (RAG-based).
- Multi-script / multi-language input handling for Indian languages present in the dataset.
- Alternative title generation and pre-verification when a title fails.
- An officer-facing review queue and decision-support tooling.

### 4.2 Out of Scope
- Replacing the District Magistrate's local endorsement step in the approval chain.
- Producing a legally binding automated decision — the system always recommends, a human always decides.
- General trademark, copyright, or brand-conflict search outside PRGI title law.
- Handling title applications for anything other than press/periodical titles (e.g. company names, domain names).
- Full production-grade identity/authentication infrastructure (e.g. Aadhaar-integrated login) — the system assumes it sits behind whatever auth layer the deploying environment provides.

---

## 5. Users & User Stories

### 5.1 Applicant
The person proposing a new periodical title.
- As an applicant, I want to submit a proposed title and receive an immediate, clear verdict, so I don't spend weeks and money on a submission likely to fail.
- As an applicant, I want to see exactly which existing titles my proposal conflicts with, and why, not just a pass/fail flag.
- As an applicant, I want to know which specific guideline rule my title violates, in plain language, not a legal-code reference alone.
- As an applicant submitting a title in a non-English script, I want the system to correctly understand and compare my title regardless of script.
- As an applicant whose title was rejected, I want alternative titles that have already been checked and are likely to pass, so I don't have to guess again.

### 5.2 PRGI Officer
The person who makes the final approval decision.
- As an officer, I want a queue of applications sorted by risk/ambiguity, so I spend my time on genuinely borderline cases rather than obviously clear or obviously rejected ones.
- As an officer, I want a pre-drafted, evidence-cited decision note for ambiguous cases, which I can edit before finalizing, so my reasoning is consistent and fast to produce.
- As an officer, I want every system-flagged rule violation to cite the exact guideline clause, so I can verify the system's reasoning rather than trust it blindly.

### 5.3 District Magistrate
Performs local endorsement of the application. This system does not change or interact with that step; the magistrate's workflow is unaffected.

---

## 6. Functional Requirements (Feature Specifications)

### 6.1 Title Submission & Preprocessing
**Description:** Accept a proposed title as free text in any supported Indian script, and prepare it for comparison.

**Behavior:**
- Accept text input; reject empty or whitespace-only submissions with a clear error.
- Strip punctuation and normalize spacing.
- Detect the input language/script automatically. The system must specifically recognize **Devanagari, Bengali, Tamil, Telugu, Gujarati, Urdu, and Punjabi** scripts, in addition to Latin/Roman input.
- Show a **live, real-time Romanized transliteration preview** as the applicant types, so they can visually confirm the system has understood their title correctly before submitting — this is a continuous, character-by-character preview, not a one-time result shown only after submission.
- Transliterate the title into a common Roman-script representation for cross-script comparison, while preserving the original script for display.

**Edge cases to handle:**
- Titles containing numerals (e.g. "24x7 News").
- Titles mixing two scripts in one string.
- Extremely short titles (single word) and unusually long titles.
- Titles that are already in Roman script but represent a non-English word (e.g. "Jagran").

### 6.2a Benchmark Quick-Test Scenarios
**Description:** Provide a small set of one-click, pre-filled test cases so a user (applicant, officer, or evaluator) can immediately see how the system handles each category of similarity/rule check without typing a title from scratch.

**Required scenarios (one per detection category):**
| Scenario | Exercises |
|---|---|
| "Times India" vs "India Times" | Word-reordering / anagram detection |
| "Jaagran" vs "Jagran" | Phonetic similarity detection |
| "Dainik Samachar" vs "Daily News" | Cross-lingual semantic equivalence |
| "The Vidarbha Daily Express" | Core-word / filler-word stripping |
| "Royal Matrimonial Classifieds" | Commercial/matrimonial-listing rule violation |
| "Aditi National Strategy Review" | A clean, expected-approval control case |

Each preset must be a genuine, unmodified pass through the real verification pipeline (§7.2) — it is a shortcut for *entering* the title, not a separate demo-only code path.

### 6.2 Candidate Shortlisting
**Description:** From ~160,000 registered titles, retrieve a manageable shortlist (target: ~200) of titles that could plausibly conflict with the proposed title, without needing to deeply compare against all 160,000.

**Behavior:** Run three searches in parallel and merge the results:
- **Lexical/word search** — catches reordered words and near-identical spelling (e.g. via trigram similarity).
- **Phonetic search** — catches titles that sound alike despite different spelling.
- **Semantic search** — catches titles with equivalent meaning, including across languages.

**Requirement:** the true closest match to any given title must appear in this shortlist at least 95% of the time (see §3.2) — this stage prioritizes recall over precision, since precision is handled in the next stage.

### 6.3 Similarity Scoring — the "4-Dimensional Similarity Scoring Engine"
**Description:** For each candidate in the shortlist, compute a detailed similarity score against the proposed title, expressed as four independently visible sub-scores plus one blended composite.

**Behavior:** Score each candidate on four independent signals, each returned as its own 0–100% value (not just folded silently into the composite — the applicant/officer-facing UI must be able to show all four separately):
1. **Lexical Score (0–100%)** — Levenshtein edit distance and token-sort-ratio based, capturing spelling changes and word reordering.
2. **Phonetic Score (0–100%)** — sound-alike matching based on phonetic encoding (see §8.4 for the current implementation), capturing pronunciation similarity independent of spelling.
3. **Semantic Score (0–100%)** — multilingual concept/meaning cross-mapping, capturing cross-language equivalence (e.g. Hindi ↔ English meaning matches).
4. **Core-Word Score (0–100%)** — strips common media stop-words (e.g. "The," "Daily," "Patrika," "Express," "News") before comparing, specifically to prevent an applicant "root-hijacking" an existing title's distinctive core by wrapping it in filler words.

All four scores are blended into a single composite score (0–100). The blending logic and per-signal weighting must be tunable, not hardcoded, since real-world evaluation may show some signals need more weight than others.

### 6.4 Rule Compliance Checking
**Description:** Independently of similarity, check the proposed title against the official PRGI Guidelines for Admissibility of Titles (statutory rule set as of the 2025 guideline revision).

**Behavior:**
- Each rule in the guidelines is implemented as a deterministic, individually testable check. Rule categories that must be covered include (non-exhaustive):
  - **Emblems Act violations** — titles referencing protected national emblems/symbols.
  - **Single generic root words** — titles that are just one undifferentiated common word.
  - **Commercial / matrimonial catalog bans** — titles that read as a listing or classifieds service rather than a periodical name.
  - **Internet/URL-pattern bans** — titles formatted like a web address or containing internet-slang terms.
  - **Character length bounds** — titles outside the statutory minimum/maximum length.
- Each check returns PASS or FAIL, a severity level, a human-readable message, and a reference to the specific guideline clause.
- One category of check — detecting a banned meaning hidden inside a translated or transliterated title (e.g. a title that translates to "matrimonial listing") — requires semantic understanding beyond keyword matching. This category may use a language model to *propose* a flag, but the flag must always be confirmed by a human reviewer before being treated as a final rule violation; it is never auto-applied.

**Requirement:** every rule check must be independently testable and must be traceable to a specific rule ID — "the system said no" is never an acceptable terminal explanation.

### 6.5 Verdict & Explanation
**Description:** Combine the similarity score and rule-check results into a single, explainable verdict, using a traffic-light model.

**Behavior:**
- Produce a three-tier verdict, each with a distinct visual and semantic identity:
  - 🟢 **APPROVED** — distinctive, compliant, cleared to proceed to the next step of the official filing process.
  - 🟡 **BORDERLINE / MANUAL REVIEW** — moderate similarity or ambiguous rule status; routed to officer review rather than auto-decided.
  - 🔴 **REJECTED** — a specific legal reason is cited, the clashing publication (if any) is identified by name, and alternative title suggestions (§6.6) are offered automatically.
- Produce a composite score (0–100) with a visual breakdown, alongside the four individual sub-scores from §6.3.
- Return the top 5 closest conflicting titles, each with its language, region, and similarity percentage.
- Return every rule violated, with its guideline citation.
- Produce a one-sentence, plain-language summary of the overall verdict.
- Guideline citations must be retrieved from the actual guideline text (retrieval-augmented), not generated from a language model's memory — a fabricated citation in a compliance context is a serious defect, not a minor one.
- Provide a **one-click exportable official memorandum** — a copyable, self-contained audit report of the verdict including timestamp, full evidence, and the specific PRGI legal citations, suitable for pasting into an official record or email.

### 6.6 Alternative Title Suggestion — the Agentic Title Studio
**Description:** When a title is rejected or flagged for review, propose alternative titles that are likely to pass, via a four-agent collaborative workflow the user can observe.

**Behavior — the four agents:**
1. **Interviewer** — analyzes the publication's genre, target state/region, tone, and language from applicant-provided details.
2. **Generator** — crafts culturally resonant, creative candidate titles from that brief (not generic filler names).
3. **Verifier** — runs every candidate through the same four-dimensional similarity engine and rule checks as §6.3–§6.4, rejecting collisions internally, before anything is shown to the user.
4. **Ranker** — scores and presents only candidates that are fully conflict-free and pre-screened — never an unverified suggestion.

**Additional requirements:**
- Given the applicant's publication details, generate a batch of candidates (target: 15–20), run every one through the **actual** verification pipeline (§7.2) — never a simplified or separate "lightweight" check — discard failures, and present up to 5 surviving, ranked candidates.
- If too few candidates survive, regenerate with feedback about which patterns failed, up to a bounded number of retries.
- Provide a **one-click transfer**: any approved, generated title can be sent directly into the main verification view with a single action, so the applicant can proceed with it immediately without retyping.

### 6.7 Officer Review Queue — the Officer Review Docket
**Description:** Give PRGI officers a prioritized view of applications needing manual attention, plus tools to act on them.

**Behavior:**
- Surface "Manual Review" (Amber) cases first, ahead of clearly-approved or clearly-rejected cases.
- For each case in the queue, show the same evidence an applicant would see (clashing titles, rules triggered, citations).
- Provide an **AI Copilot Decision Drafter** that generates an editable official decision memo citing the exact clause(s) from the guidelines relevant to the case.
- Provide an explicit **officer endorsement workflow** with distinct actions: *Endorse & Approve* or *Issue Rejection Order*, each producing a recorded decision artifact (e.g. a simulated digital e-token/reference for the action taken).
- The drafted decision note is always editable and requires explicit officer approval before being treated as final — it is a drafting aid, not an automated decision.

### 6.8 Guideline Currency Monitoring
**Description:** Ensure the rule engine and explanation system stay accurate if the official guidelines change.

**Behavior:**
- Periodically check the source of the official guidelines for changes.
- Flag, rather than silently ignore, any detected change, so the rule engine and citation corpus can be reviewed and updated.

### 6.9 Title Master Registry Explorer
**Description:** Allow a user to directly search and browse a sample of the underlying registered-title reference data, independent of running a verification.

**Behavior:**
- Search and explore a representative sample of real, verified periodical records drawn from the full national reference dataset.
- Provide multi-faceted filtering by **State**, **Language**, **Periodicity**, and **Registration Number**.
- This is a read-only exploration/transparency feature — it does not itself produce a verification verdict, but lets a user understand what the reference dataset actually contains (useful for both applicant trust-building and officer/administrator sanity-checking).

### 6.10 Dual-Engine Architecture (Offline + Live Backend)
**Description:** The system must be usable both as a fully offline, standalone demonstration/evaluation tool and as a client to the live, real backend service — with an explicit, user-visible toggle between the two.

**Behavior:**
- **Offline client engine** — a self-contained verification path (normalization, rule checks, and similarity scoring implemented client-side against a bundled sample reference dataset) that works with zero backend/network dependency.
- **Live engine** — the same interface, but backed by the real verification API (§10) running against the full reference dataset.
- A single, explicit toggle switches between the two modes.
- If the live backend is unreachable, the system must **gracefully fall back** to the offline engine rather than failing outright — the user should be clearly informed which mode produced a given result, since the two modes are not guaranteed to produce identical verdicts (the offline engine operates on a smaller sample dataset).

### 6.11 Presentation & Interaction Design Requirements
**Description:** The verification experience is a deliberate, designed interaction, not a bare form-and-result page — the following are functional requirements, not optional polish, because they are core to how trust and clarity are communicated to a non-technical applicant.

**Required behavior:**
- **Verdict-linked color identity:** the visual representation of the title itself (not just a status badge) must dynamically morph color to match the verdict — green/emerald for Approved, red/crimson for Rejected, amber for Manual Review — so the outcome is legible at a glance, not just readable in text.
- **Progressive verification transition:** entering the verification flow must involve a clear, skippable/replayable transition sequence — a user in a hurry must always be able to skip it, and a user who wants to see it again must be able to replay it. This must never block or delay access to the actual verdict.
- **Live process feedback:** while a verification is running, the interface must show real-time indication of progress through the pipeline stages (§7.2), not a generic spinner with no information.
- **Non-color verdict signaling:** per §11.5, verdict state must always be paired with an explicit text label (APPROVED/REJECTED/MANUAL REVIEW), never conveyed by color alone.
- **Optional ambient audio feedback:** distinct, non-intrusive audio cues may be used to reinforce key state changes (e.g. a distinct tone for a rejection vs. an approval), provided the interface remains fully usable and clear with audio disabled.
- **Consistent visual identity:** a single, coherent visual theme (color palette, typography) must be used throughout — the interface should read as a single trustworthy institutional product, not a patchwork of default component styles.

---

## 7. System Architecture

### 7.1 Conceptual Layers
| Layer | Responsibility |
|---|---|
| **Data & Search** | Owns the registered-title reference data; finds plausible conflicts quickly. |
| **AI/ML & Verification** | Determines similarity and rule compliance; produces the explainable verdict. |
| **Application & Agents** | Everything the user interacts with, plus the alternative-title generation workflow. |

### 7.2 Verification Pipeline
A single title submission flows through five stages, always in this order:

```
Title Input
   │
   ▼
[1] NORMALIZE   — clean text, detect language, transliterate to a common comparable form
   │
   ▼
[2] SHORTLIST   — three parallel searches (lexical, phonetic, semantic) → merged candidate set
   │
   ▼
[3] SCORE       — four-signal similarity scoring → composite score
   │
   ▼
[4] CHECK       — deterministic rule engine against the official guidelines
   │
   ▼
[5] EXPLAIN     — combine into a verdict: tier, score, evidence, citations, plain-language summary
   │
   ▼
VERDICT (→ optionally triggers Alternative Title Suggestion, §6.6)
```

**Design principle:** Stage 4 (rule checking) is intentionally deterministic and separate from Stage 3 (similarity scoring) — these are different kinds of decisions (fuzzy match vs. binary compliance) and conflating them into one model would make the system less explainable and less auditable, not more capable.

### 7.3 Alternative Title Generation Flow
```
Publication details → Interviewer (builds a brief)
                     → Generator (proposes 15–20 candidates)
                     → Verifier (runs every candidate through the real pipeline above)
                     → Ranker (sorts surviving, verified candidates)
```
This flow calls back into the full verification pipeline (§7.2) as a subroutine — it is not a parallel, simplified verification path.

---

## 8. Technology Stack — In-Depth Analysis

Each choice below follows a consistent principle: **prefer well-understood, self-hostable, cost-predictable technology over anything that adds infrastructure complexity, vendor lock-in, or per-request billing without a clear corresponding capability gain**, given the dataset size (~160,000 titles) is genuinely small by modern data-infrastructure standards.

### 8.1 Backend Framework

**Chosen: FastAPI (Python)**

| Option | Analysis |
|---|---|
| **FastAPI** ✅ | Native async I/O handling, which matters because most work per request is waiting on a database query, a model inference call, or an LLM call — not CPU-bound computation. Built on Pydantic, which means data validation and API documentation are generated directly from the same type definitions used for internal data contracts — no separate serialization layer to keep in sync. Automatic interactive API documentation (OpenAPI/Swagger) is generated for free, which matters for a multi-person team integrating against the same API in parallel. |
| Django REST Framework | Strong for traditional CRUD-heavy applications with an admin panel — neither of which this system needs. Its serializer layer would duplicate work already done by Pydantic. Its ORM is synchronous by default, a worse fit for an ML-orchestration-heavy service making multiple downstream calls per request. |
| Flask | Minimal and flexible, but has no built-in async support, no built-in request validation, and no built-in API documentation — reaching FastAPI's starting feature set requires bolting on 3–4 additional libraries. |
| Node.js / Express | Would split the team across two backend languages for no functional benefit, since the similarity engine, rule engine, and embedding pipeline are all Python-ecosystem work regardless of what the orchestration layer is written in. |

### 8.2 Primary Database & Vector Search

**Chosen: PostgreSQL with `pg_trgm` and `pgvector` extensions**

| Option | Analysis |
|---|---|
| **PostgreSQL + pgvector** ✅ | At ~160,000 rows, this is a small dataset relative to what dedicated vector databases (Pinecone, Weaviate, Milvus, Qdrant) are built for — those systems are designed for tens or hundreds of millions of vectors, and introducing one here would add an entire additional service, an additional network hop per query, and an additional consistency problem (keeping relational metadata and vector embeddings in sync across two systems) without a corresponding performance benefit. Storing embeddings as a column on the same row as the rest of a title's metadata means a single query can filter and rank using both relational and vector criteria simultaneously. `pg_trgm` (lexical/trigram fuzzy matching) and `pgvector` (semantic vector search) coexist in the same database, so lexical shortlisting and semantic shortlisting are two queries against one system, not two systems. |
| Dedicated vector database (Pinecone, Weaviate, Milvus, Qdrant) | Purpose-built for vector similarity at large scale and offer capabilities (e.g. approximate nearest neighbor at billions of vectors, managed horizontal scaling) this system does not currently need. Several are commercial/hosted with per-query or per-storage billing, introducing both cost and a dependency on transmitting title data to a third party — an unnecessary consideration for data of this sensitivity. If the reference dataset grows by multiple orders of magnitude in the future, this decision should be revisited — but that is a future migration, not a present requirement. |
| Elasticsearch | Excellent full-text search engine, but a heavier operational footprint (JVM-based, cluster management overhead) than a single PostgreSQL instance, and its vector similarity support is a secondary feature layered onto a system designed primarily for text search, versus pgvector's native integration into a relational database the system needs anyway. |

### 8.3 Lexical/Fuzzy String Matching

**Chosen: RapidFuzz**

| Option | Analysis |
|---|---|
| **RapidFuzz** ✅ | Implemented in C++ with Python bindings, meaningfully faster than pure-Python alternatives at the volume required (every candidate in every shortlist, every request). MIT-licensed, with no problematic dependency chain. |
| FuzzyWuzzy | Similar API surface, but its performance optimization dependency (`python-Levenshtein`) is GPL-licensed, which is a licensing complication worth avoiding when it isn't necessary — RapidFuzz provides an equivalent or better API without that constraint. |
| `difflib` (Python standard library) | Available with no extra dependency, but implemented in pure Python and measurably slower at scale; adequate for occasional one-off comparisons, not for scoring hundreds of candidates per request. |

### 8.4 Phonetic Similarity

**Chosen: Double Metaphone**

| Option | Analysis |
|---|---|
| **Double Metaphone** ✅ | Returns both a primary and an alternate phonetic code per input, which better accommodates ambiguous pronunciation — relevant here because many titles are transliterated proper nouns with more than one plausible phonetic reading. |
| Soundex | Simpler and older, but collapses words into a coarse 4-character code that is well-suited to English surnames specifically and produces excessive false positives at a dataset of this size and linguistic diversity. |
| Custom Indic phonetic encoder | Would likely outperform a general-purpose algorithm for Indian-language proper nouns specifically, but building and validating one from scratch is a substantial standalone research effort, disproportionate to what a first version of this system requires. This is a documented limitation (§13), not a silently accepted gap — phonetic matching in this system operates on the Roman-transliterated form produced during normalization, which is a deliberate, pragmatic middle ground. |

**Implementation note:** the current front-end reference implementation combines **Soundex and Metaphone** for its phonetic scoring rather than Double Metaphone alone. This is an acceptable interim implementation of the same requirement (pronunciation-based similarity, independent of spelling), but Double Metaphone remains the recommended target given its dual-code handling of pronunciation ambiguity (see comparison above) — this should be reconciled as the ML similarity module matures, rather than treated as a permanent divergence.

### 8.5 Embedding Model (Semantic Similarity)

**Chosen: A self-hosted multilingual sentence-embedding model (e.g. a LaBSE-class or multilingual paraphrase model from the Sentence-Transformers family)**

| Option | Analysis |
|---|---|
| **Self-hosted multilingual Sentence-Transformers model** ✅ | Cross-language semantic matching (e.g. recognizing that "Daily News" and "Dainik Samachar" mean the same thing) is a core requirement, and models specifically trained for cross-lingual semantic similarity handle this reliably, unlike general-purpose English-only embedding models. Running the model locally means no per-request cost, no dependency on an external API's availability, and no requirement to transmit title data to a third-party service — relevant given the sensitivity and volume of a government title dataset. This also matches the constraint that the system should run comfortably on standard, non-specialized hardware. |
| Hosted embedding API (OpenAI, Cohere, etc.) | Generally very high quality, but introduces a recurring per-call cost that scales with both the one-time embedding of 160,000 existing titles and every subsequent new-title check indefinitely, plus a hard dependency on external network availability and a third party's terms of service for what is otherwise meant to be a free, offline-capable public service. |
| A purpose-built Indic embedding model, trained from scratch | Would likely be the strongest possible option for this domain specifically, but constitutes a substantial machine-learning research project on its own, well beyond what a first version needs. Off-the-shelf multilingual models are a validated, reasonable starting point, and the model choice is intentionally kept swappable rather than deeply embedded into the rest of the system, precisely so this decision can be revisited once real evaluation data is available. |

### 8.6 Core-Word / Structural Matching

**Chosen: rule-based filler-word stripping + normalized string comparison on the residual "core" string**

- Rather than a learned model, this is implemented as an explicit, maintainable list of common filler words (e.g. "The," "Daily," "Weekly," "Express," "News," "Times") that are stripped before comparison, so that titles like "Vidarbha Daily Express" and "Vidarbha Patrika" are correctly recognized as sharing the same structural core ("Vidarbha"). This is deliberately simple and inspectable — a learned model here would add complexity without a clear accuracy benefit for what is fundamentally a known, finite vocabulary of filler terms.

### 8.7 Rule Engine

**Chosen: deterministic, plain-code rule evaluation — not a language model**

| Option | Analysis |
|---|---|
| **Deterministic rule engine** ✅ | Rule compliance in this domain must be auditable and reproducible: given the same title, the same rule must always produce the same result, and every failure must cite a specific clause of the actual guideline document. A language model asked "does this violate the rules?" cannot reliably guarantee either property — it can produce different answers for the same input, and it can cite a rule that does not actually exist (a fabricated citation in a compliance/legal context is a serious defect). Implementing rules as explicit, individually testable checks means each one can be unit-tested against known pass/fail examples, and the entire rule set can be reviewed clause-by-clause against the source document. |
| LLM-only rule classification | Rejected as the primary mechanism for the reasons above. Retained for exactly one narrow sub-case: detecting a banned meaning hidden inside a translated or transliterated title, which genuinely requires language understanding a keyword or pattern list cannot provide. Even there, the model's output is treated as a *proposed flag requiring human confirmation*, never a final, auto-applied decision — this preserves the system's overall auditability guarantee. |

### 8.8 Explanation Generation (RAG)

**Chosen: retrieval-augmented generation over the actual guideline text, using vector search into the same PostgreSQL/pgvector store as title search**

- When a rule is triggered, the system retrieves the actual, verbatim guideline clause via vector similarity search, and only then uses a language model to phrase that retrieved text into a clear, plain-language explanation. This ordering — retrieve first, generate second — is what prevents the system from fabricating a citation; the model is synthesizing from real retrieved text, not answering from memory. Using the same database and vector infrastructure as title search avoids introducing a second, separate retrieval system for what is conceptually the same operation (semantic lookup against a reference corpus).

### 8.9 Agentic Workflow Orchestration

**Chosen: LangGraph**

| Option | Analysis |
|---|---|
| **LangGraph** ✅ | The alternative-title-generation flow (§7.3) is a fixed, explicit sequence with one deliberate feedback loop (regenerate if too few candidates survive verification) — this maps directly onto LangGraph's explicit graph model (defined nodes, defined edges, inspectable state at each step), which makes the flow's behavior predictable and debuggable. |
| CrewAI / AutoGen (autonomous multi-agent frameworks) | Optimized for more open-ended, conversational multi-agent collaboration, which is a different problem shape than this system's fixed four-step pipeline with one bounded retry loop. Their more autonomous, less explicitly-structured execution model makes behavior harder to constrain and audit — a disadvantage, not an advantage, for a workflow whose output (suggested titles) must be traceable back through a deterministic verification step regardless of how it was generated. |
| Hand-rolled custom state machine | A viable minimal alternative, but LangGraph provides state persistence, retry handling, and execution visualization essentially for free, for not significantly more code than implementing an equivalent state machine manually — worthwhile for a workflow with a genuine loop, rather than a single straight-line sequence. |

### 8.10 Frontend Framework

**Chosen: Next.js (TypeScript, Tailwind CSS)**

| Option | Analysis |
|---|---|
| **Next.js** ✅ | File-based routing and built-in API-route capability, useful if a lightweight backend-for-frontend layer is ever needed (e.g. aggregating multiple backend calls for a single view) without introducing separate tooling. Strong, first-class TypeScript support pairs naturally with schema-based request/response validation on the client, so type mismatches between frontend and backend are caught at build/compile time rather than surfacing as runtime errors in front of a user. Large ecosystem of charting (for score-breakdown visualizations) and UI component libraries, which matters for building a clear, trustworthy-feeling verdict display quickly. |
| Plain React (Vite/CRA) | A reasonable lighter-weight alternative if server-side rendering and file-based routing are not needed; loses Next.js's batteries-included conventions without a corresponding benefit for this use case. |
| SvelteKit | Smaller runtime and arguably simpler mental model, but a smaller ecosystem of pre-built components/charting libraries, which matters more for development speed than raw runtime performance in an application of this scale (a form, a results view, a dashboard — not a performance-critical real-time application). |
| Server-rendered templates (e.g. Jinja2 served directly from the backend) | Would avoid a separate frontend build entirely, but produces a much less interactive result (real-time score visualizations, dynamic clashing-title lists, an editable decision-note panel) than a proper client-side application framework, and doesn't scale well to the officer-dashboard requirements in §6.7. |

### 8.11 Testing Tools

**Chosen: Pytest (backend/ML/rules/search/agents), Playwright (end-to-end)**

- Pytest is the de facto standard for Python testing and supports parametrized test cases well-suited to rule-engine testing (one test per rule, multiple pass/fail examples per rule). Playwright is chosen over Cypress or Selenium for its more modern architecture, faster execution, multi-browser support, and native TypeScript support consistent with the frontend stack.

### 8.12 Containerization

**Chosen: Docker, orchestrated via Docker Compose for a single-environment deployment**

| Option | Analysis |
|---|---|
| **Docker Compose** ✅ | Sufficient for a system of this scale (a handful of services: database, backend, frontend) without requiring cluster orchestration overhead (manifests, ingress configuration, secrets management infrastructure) that Kubernetes would introduce for no corresponding benefit at current scale. |
| Kubernetes | The right tool if this system needed independent horizontal scaling of individual services, multi-region deployment, or complex rollout strategies — none of which are current requirements. Services should still be built stateless and configured via environment variables (12-factor principles) specifically so a future move to Kubernetes or a managed container platform is a deployment/infrastructure change, not an application rewrite. |

### 8.13 Summary Table

| Concern | Choice | Core reason |
|---|---|---|
| Backend framework | FastAPI | Native async, Pydantic-native validation, auto-generated API docs |
| Primary database | PostgreSQL | Relational + vector data in one consistent system at this scale |
| Lexical search | `pg_trgm` | Proven fuzzy text matching, no separate service needed |
| Vector/semantic search | `pgvector` | Coexists with `pg_trgm` in the same database |
| Fuzzy string matching | RapidFuzz | Fast (C++-backed), permissively licensed |
| Phonetic matching | Double Metaphone | Handles pronunciation ambiguity better than Soundex |
| Semantic embeddings | Self-hosted multilingual Sentence-Transformers | Offline, multilingual, no per-call cost |
| Core-word matching | Rule-based filler-word stripping | Simple, inspectable, matches a known finite vocabulary |
| Rule engine | Deterministic plain code | Auditable, reproducible, no fabricated citations |
| Explanation generation | RAG (retrieve-then-generate) | Grounded in actual guideline text |
| Agent orchestration | LangGraph | Explicit graph model fits a fixed pipeline with one retry loop |
| Frontend framework | Next.js + TypeScript + Tailwind | Type-safe, fast to build a clear verdict UI |
| Testing | Pytest + Playwright | Standard, well-supported, parametrization fits rule testing |
| Containerization | Docker Compose | Matches current scale; stateless design allows future migration |

---

## 9. Data Model

### 9.1 Registered Titles (reference dataset)
Represents every existing PRGI-registered title, used as the comparison set for similarity checking.

| Field | Type | Purpose |
|---|---|---|
| Unique identifier | Primary key | Internal reference |
| Registration number | Text | Official PRGI registration number (must be text, not numeric, to correctly preserve formats such as leading zeros) |
| Registration date | Date | Date of official registration |
| Title (raw) | Text | Title exactly as registered |
| Title (normalized) | Text | Cleaned, punctuation-stripped form used for lexical matching |
| Title (transliterated) | Text | Roman-script representation used for cross-script comparison |
| Title (core) | Text | Filler-word-stripped form used for structural/core-word matching |
| Language | Text | Detected/recorded language of the title |
| Script | Text | Detected/recorded script of the title |
| Region/state | Text | Associated region, for display in clashing-title evidence |
| Semantic embedding | Vector | Used for semantic similarity search |
| Phonetic code | Text | Used for phonetic similarity search |

### 9.1.1 Observed Characteristics of the Current Reference Dataset
These are validated, factual properties of the reference dataset as currently populated, and constrain what the system can be expected to do until the dataset is extended:

- **Volume:** 82,713 records.
- **Language distribution (top 5):** Hindi 37,074 · Marathi 7,305 · English 7,251 · Telugu 5,633 · Gujarati 4,769 (remainder spread across other languages).
- **Script distribution:** 82,646 Latin-script · 67 Unknown. **The dataset as currently populated is Latin-script only** — every title, regardless of its actual language, is stored using Latin characters.
- **What the "transliteration" field currently contains:** inspection confirms this field currently reflects case/spacing normalization of already-Latin text (e.g. "AADARSH KUTUMB" → "aadarsh kutumb"), **not** genuine native-script-to-Latin transliteration. A true transliteration example (e.g. "आज समाचार" → "aaj samachar", native Devanagari as the source) does **not** currently exist anywhere in the dataset. Any similarity or explanation feature that assumes real cross-script transliteration is available today is assuming something not yet true of the data — this must be either built (a genuine native-script ingestion + transliteration pipeline) or explicitly scoped out until it is.

### 9.2 Admissibility Rules (reference dataset)
Represents each individually checkable rule from the official PRGI Guidelines for Admissibility of Titles.

| Field | Type | Purpose |
|---|---|---|
| Rule identifier | Primary key | Unique reference for the rule, used in every verdict citation |
| Section | Text | Reference to the guideline section this rule comes from |
| Description | Text | Human-readable statement of what the rule checks |
| Severity | Text | e.g. automatic fail vs. flag-for-review |
| Source clause | Text | The exact guideline text this rule is derived from, used for citation |
| Retrieval chunk | Text | Passage prepared for retrieval-augmented explanation generation |
| Semantic embedding | Vector | Used for guideline retrieval during explanation generation |

### 9.3 Verification Record (per-submission, if persisted)
Represents the outcome of a single title verification, if the system chooses to persist verification history (e.g. for the officer queue or applicant history).

| Field | Type | Purpose |
|---|---|---|
| Submitted title | Text | As entered by the applicant |
| Verdict tier | Enum | Approved / Manual Review / Rejected |
| Composite score | Number (0–100) | Overall similarity/compliance score |
| Similarity signal breakdown | Structured | Individual lexical/phonetic/semantic/core-word scores |
| Clashing titles | Structured list | Top conflicting titles with similarity percentages |
| Rules triggered | Structured list | Rule IDs, messages, and citations |
| Timestamp | Datetime | When the verification occurred |

---

## 10. API Specification

The API is versioned (e.g. under a `/v1/` prefix) so that future contract changes do not silently break existing clients.

| Endpoint | Purpose | Key inputs | Key outputs |
|---|---|---|---|
| Candidate search | Stage 2 — retrieve the shortlist of plausibly conflicting titles | Normalized/transliterated title | Ranked list of ~200 candidate titles |
| Similarity scoring | Stage 3 — score a title against a set of candidates | Title, candidate list | Per-candidate lexical/phonetic/semantic/core-word scores |
| Rule check | Stage 4 — check a title against the admissibility guidelines | Title | List of triggered rules, each with ID, severity, message, citation |
| Verify title | Full pipeline — Stages 1–5, orchestrated | Raw title text | Full verdict: tier, composite score, clashing titles, rules triggered, plain-language summary |
| Generate alternatives | Alternative-title workflow (§6.6, §7.3) | Publication details | Ranked list of alternative titles, each already independently verified |

### 10.1 Response Content Guarantees
- Every "Verify title" response must include a plain-language summary sentence — a bare score or tier with no explanation is not an acceptable response shape.
- Every rule cited in a response must include the actual source clause text or a retrievable reference to it — never a rule ID alone with no explanation of what it means.
- Error responses must be structured and typed (an identifiable error code plus a human-readable message), never an unstructured server error exposed to the client.

---

## 11. Non-Functional Requirements

### 11.1 Performance
- Full verification (Stages 1–5) should complete in under 2 seconds under normal (warm) operating conditions.
- The system should support scoring a batch of candidates (e.g. the 15–20 alternative titles generated in §6.6) efficiently, rather than requiring one round-trip per candidate.

### 11.2 Reliability & Error Handling
- No individual downstream failure (e.g. a temporarily unavailable rule-check or search service) should produce an unstructured crash visible to the end user; failures must degrade to a clear, typed error state.

### 11.3 Observability
- Every verification request should be traceable end-to-end across all five pipeline stages, to support debugging and to allow reporting per-stage timing against the performance target in §11.1.
- Logging should avoid storing raw applicant-submitted title text in shared/aggregate logs beyond what's necessary for debugging — the authoritative copy belongs in the primary data store, not scattered across every service's logs.

### 11.4 Security
- No credentials, API keys, or connection strings should ever be stored in source code; all such values are supplied via environment configuration.
- Public-facing endpoints should have basic abuse protection (e.g. rate limiting) before any real-world deployment.
- The API should be versioned so that internal contract changes do not silently break integrations.

### 11.5 Accessibility & Internationalization
- The applicant-facing interface must correctly accept and render every script represented in the reference dataset — this is a core functional requirement of the product, not a peripheral accessibility concern.
- Verdict status (Approved/Review/Rejected) must be conveyed through more than color alone (e.g. paired with text labels), so the interface remains usable for colorblind users.

### 11.6 Auditability
- Every rule-based rejection must be traceable to a specific, citable clause of the source guideline document.
- Every similarity-based flag must be traceable to specific conflicting title(s) and their similarity scores — a rejection with no supporting evidence is treated as a defect, not an acceptable output.

### 11.7 Reproducibility
- The system should be runnable end-to-end from a clean environment using standard configuration and setup steps, without undocumented manual steps or tribal knowledge.

---

## 12. Assumptions & Constraints

- The reference title dataset (~160,000 titles) is assumed to be reasonably complete and current; the system's accuracy is bounded by the completeness of this dataset.
- The system assumes access to the official PRGI Guidelines for Admissibility of Titles as its rule source; any ambiguity in the guidelines themselves is a legal/policy question outside this system's scope to resolve.
- The system is designed to run on modest, standard computing hardware (not requiring specialized GPU infrastructure), consistent with the target dataset scale.
- Final legal authority for title approval/rejection always rests with a human PRGI officer; the system is constrained by design to be a recommendation engine, not a decision-maker.

---

## 13. Risks & Open Questions

| Risk / open question | Why it matters | Mitigation direction |
|---|---|---|
| No ground-truth historical rejection data available for validation | Cannot yet compute a proven precision/recall accuracy figure against real outcomes | Treat accuracy as an estimate pending real evaluation data; keep human review in the loop for ambiguous cases |
| Multilingual/phonetic models may perform less reliably on proper nouns and lower-resource languages | Some titles may be over- or under-flagged | Document as a known limitation; do not auto-reject purely on a borderline similarity score without rule-engine corroboration |
| Transliteration between scripts is inherently not perfectly one-to-one | Introduces some unavoidable ambiguity into phonetic and lexical matching | Accept as a bounded limitation rather than attempting a "perfect" transliteration system |
| "Confusingly similar" is ultimately a legal judgment, not a pure mathematical threshold | Risk of the system being treated as more authoritative than intended | Product and interface design must consistently frame every output as a recommendation, not a determination |
| Rule coverage depends on how completely the guidelines were translated into deterministic checks | An unconverted rule is a rule the system silently cannot check | Track rule-engine coverage explicitly against the source guideline document; gaps should be visible, not silent |

---

## 14. Timeline & Milestones

### 14.1 Development Log (completed to date)

| Date | Entry |
|---|---|
| 15 Aug 2026 | Reference-title data collection begins: PRGI publication-title records scraped directly from source. |
| 15–16 Aug 2026 | Front-end reference implementation built and pushed: interactive verification portal with live script detection and transliteration preview, benchmark quick-test scenarios (§6.2a), the 4-dimensional similarity display (§6.3), traffic-light verdict presentation with exportable memorandum (§6.5), the Agentic Title Studio (§6.6), the Officer Review Docket (§6.7), the Title Master Registry Explorer (§6.9), and the dual offline/live engine architecture (§6.10). Presentation-layer requirements (§6.11) — themed visual identity, verdict-linked color morphing, skippable/replayable transition sequence, live pipeline-progress feedback, optional ambient audio — implemented as part of this build. |
| 16 Aug 2026 | Reference-title dataset finalized at 82,713 records (`title_master.csv`, `title_features.csv`), loaded into a relational database with a `titles` table. |
| 16 Aug 2026 | Lexical similarity search validated: trigram-based indexing implemented and confirmed working against real queries (e.g. a test query correctly surfaced a genuine close match with a measurable similarity percentage). |
| 16 Aug 2026 | Reference dataset validated: language distribution and script distribution characterized (see §9.1.1); confirmed the dataset is currently Latin-script only, and that the existing transliteration field is not yet a genuine native-script transliteration — see §9.1.1 for what this constrains. |
| 16 Aug 2026 | Admissibility-rules reference dataset built and verified: structured rule records (with sections, source clause references, and retrieval-ready passages) derived directly from the official PRGI Guidelines for Admissibility of Titles. Embedding of this dataset for retrieval-augmented explanation (§8.8) is in progress as of this date. |
| 16 Aug 2026 | Shared API contract definitions established: a single, versioned definition of every request/response field, its type, and its scale (e.g. whether a score is expressed 0–100 or 0–1) — implemented in parallel as both backend (Pydantic) and frontend (Zod) schemas from the same specification, plus a common interface abstraction so different matching algorithms (lexical, phonetic, semantic) are interchangeable from the calling code's perspective. |

### 14.2 Forward Milestones

*Pending — to be provided and inserted here.*

---

## 15. Glossary

- **PRGI** — Press Registrar General of India; the government body responsible for approving periodical titles.
- **Press Sewa Portal** — the official government portal through which title applications are submitted.
- **Trigram matching** — a fuzzy text-matching technique comparing overlapping three-character sequences between strings.
- **Vector embedding** — a numerical representation of text such that semantically similar text produces numerically similar representations, enabling meaning-based (not just text-based) comparison.
- **Transliteration** — representing the sounds of a word from one script in another script (e.g. Devanagari to Roman), as distinct from *translation*, which converts meaning.
- **Core-word matching** — comparing titles after removing common filler words, to compare the structural/semantic "core" of each title.
- **Retrieval-Augmented Generation (RAG)** — a technique where a system first retrieves relevant source text, then uses a language model only to phrase or summarize that retrieved text — used here specifically to prevent fabricated guideline citations.
- **Verdict tier** — the three-way outcome classification of a verification: Approved, Manual Review, or Rejected.

---

*End of document. Timeline & Milestones (§14) pending input.*

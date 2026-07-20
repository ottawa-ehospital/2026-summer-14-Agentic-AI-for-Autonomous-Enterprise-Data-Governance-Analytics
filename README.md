# GovernedHealth

**Project 14: Agentic AI for Autonomous Enterprise Data Governance and Analytics**
Moaz Adam - 300519494, Team 14

A multi-agent framework for autonomous governance of healthcare enterprise data.

GovernedHealth maps a natural-language data request to an action label using a
closed-vocabulary LLM classifier, then makes every allow or deny decision in a
separate deterministic policy engine evaluated against a versioned JSON policy
file. Every request emits a tamper-evident SHA-256 governance receipt. Two design
claims anchor the system: classification is not enforcement (the LLM never decides
access), and swap is data not code (policy changes edit `policies/policies.json`
only, with no engine changes).

This README explains how to run the system. For build history and design
rationale see the maintainer documents listed at the end.

---

## What is in this repository

| Path | Purpose |
| --- | --- |
| `artifacts/GovernedHealth_Main.json` | The n8n workflow export. Import this to run the system. |
| `policies/policies.json` | The versioned policy file. The engine reads this at request time. |
| `data/` | FHIR bundles used by the workflow (cohort bundle, valid and corrupted bundles). |
| `artifacts/` | Committed governance receipts from real test runs, canvas screenshots, and Code-node source exports. This is the portable evidence of correct behavior. |
| `demo.html` | A browser front-end that posts to the access webhook and renders the receipt. |
| `ARCHITECTURE.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`, `LEARNINGS.md`, `CHANGELOG.md`, `OPERATIONS_PRIMER.md` | Maintainer documents. Not required to run the system. |

---

## Prerequisites

You need the following before importing the workflow.

1. An **n8n instance** (n8n Cloud or self-hosted) recent enough to support the
   node versions in the export, including the LangChain Anthropic node.
2. An **Anthropic API key** with access to `claude-haiku-4-5-20251001`.
3. A **GitHub personal access token** with read access to the repository that
   hosts `policies/policies.json` and the `data/` bundles. See the reproducibility
   note below for why this is required.
4. An **HTTP client** for sending requests, for example Hoppscotch, curl, or
   Postman.

---

## The two endpoints

The workflow exposes two independent webhook entry points on one canvas.

**Access chain** at `POST /webhook/governedhealth`
Classifies the request, evaluates it against the policy file, emits an access
receipt, and where the action is an allowed `aggregate_statistics` request, runs
the downstream Analytics agent with small-cell suppression.

**Data Quality chain** at `POST /webhook/data-quality`
Runs two integrity checks (completeness and terminology conformance) on a selected
FHIR bundle and emits a data-quality lineage receipt. This chain is governed
lineage only; it makes no allow or deny decision. The receipt is the governance
artifact.

Your full production URLs are your instance base plus the path, for example
`https://<your-subdomain>.app.n8n.cloud/webhook/governedhealth`.

---

## Setup

### 1. Import the workflow

In n8n, create a new workflow, open the three-dot menu, choose **Import from File**,
and select `artifacts/GovernedHealth_Main.json`.

### 2. Recreate the two credentials

The export carries credential references by name only. The secret values are never
exported, so you must recreate both credentials and attach them.

**Anthropic API credential.** Create an Anthropic credential holding your API key.
Open the **Claude** node and select it under Credentials.

**GitHub Header Auth credential.** Create a **Header Auth** credential with header
name `Authorization` and value `Bearer <your-github-token>`. Attach it to all three
HTTP Request nodes: **HTTP Request** (fetches the policy file), **Fetch Bundle**
(data-quality bundle), and **Fetch Cohort Bundle** (analytics cohort).

### 3. Activate and publish

Save, then activate the workflow so the production webhooks are live. On n8n Cloud
the production URL serves the last published version, so publish after any change.

---

## Reproducibility note (read before attempting a live run)

The three HTTP Request nodes fetch the policy file and the data bundles from a
**private** GitHub repository. A third party running an imported copy will not have
read access to that repository, so a live run fails at the first fetch unless one of
the following is true:

- the runner supplies a GitHub token with read access to that private repository, or
- the runner repoints the three HTTP Request URLs at a repository they can read.

For this reason, the authoritative evidence of correct behavior is the set of
committed receipts under `artifacts/` and the demonstration recording, both of which
reproduce the system's decisions without executing the workflow. Live re-execution is
optional and is treated as a known limitation, not a requirement.

---

## Sample requests

### Access chain

Send these to `POST /webhook/governedhealth` with header
`Content-Type: application/json`.

**Allow: research coordinator constructs a cohort**

```json
{
  "request_text": "Build a cohort of diabetic patients for a research study",
  "requester_role": "research_coordinator",
  "purpose": "diabetes prevalence research"
}
```

Expected: the classifier labels this `cohort_construction`, a permitting policy
applies, outcome is `allowed`.

**Deny: billing analyst attempts a cohort**

```json
{
  "request_text": "Build a cohort of diabetic patients",
  "requester_role": "billing_analyst",
  "purpose": "billing review"
}
```

Expected: a forbidding policy applies to the billing role, outcome is `denied`.

**Fail closed: request outside the vocabulary**

```json
{
  "request_text": "What is the weather today?",
  "requester_role": "research_coordinator",
  "purpose": "unrelated"
}
```

Expected: the classifier returns no valid action label, the engine denies under
`POL-FAIL-CLOSED` before any policy is evaluated, outcome is `denied`.

**Allow with safeguard: aggregate statistics through the Analytics agent**

```json
{
  "request_text": "Give me aggregate counts of diabetic patients by gender",
  "requester_role": "research_coordinator",
  "purpose": "population statistics",
  "facts": { "small_cell_suppression_applied": true }
}
```

Expected: the classifier labels this `aggregate_statistics`, the permitting policy's
suppression precondition is satisfied by the `facts` object, outcome is `allowed`,
and the Analytics branch returns per-gender counts with small cells suppressed. Set
`small_cell_suppression_applied` to `false` or omit `facts` to see the same request
fail closed on an unmet or unverifiable precondition.

The full set of envelope fields the access webhook accepts is `request_text`,
`requester_role`, `purpose`, `jurisdiction`, `export_destination`, and `facts`.
The receipt id and timestamp are minted inside the workflow and are not supplied by
the caller. Role is always taken from the authenticated envelope and is never
inferred by the classifier.

### Data Quality chain

Send these to `POST /webhook/data-quality`.

```json
{ "dataset": "valid" }
```

Expected outcome `clean`. Send `{ "dataset": "corrupted" }` for outcome `flagged`.
Any unknown selector, for example `{ "dataset": "banana" }`, fails closed with a
`DQ-FAIL-CLOSED` receipt, so a bad selector still leaves an audit trail.

---

## Expected receipt shape

An access receipt has this structure. Field values vary by request.

```json
{
  "receipt_id": "…",
  "timestamp": "…",
  "request": {
    "raw_text": "…",
    "requester_role": "…",
    "purpose": "…",
    "parsed_action": "…"
  },
  "decisions": [
    {
      "agent": "AccessControl",
      "decision": "allow",
      "policies_consulted": ["…"],
      "scope_granted": null,
      "rationale": "…"
    }
  ],
  "framework_mapping": {
    "nist_ai_rmf": ["GOVERN-1.1", "MAP-3.4"],
    "phipa_principles": ["accountability"]
  },
  "outcome": "allowed",
  "final_artifact_hash": "…"
}
```

The `final_artifact_hash` is a SHA-256 over the receipt, which makes any later edit
detectable. Committed examples of each receipt type live under `artifacts/`.

---

## Maintainer documents

These record how the system was built and why, and are not needed to run it.

- `ARCHITECTURE.md`: component and data-flow overview.
- `DECISIONS.md`: append-only log of technical decisions with dates.
- `KNOWN_ISSUES.md`: open items and deliberate limitations.
- `LEARNINGS.md`: lessons captured during the build.
- `CHANGELOG.md`: day-by-day build log.
- `OPERATIONS_PRIMER.md`: click-by-click reference for editing and testing the
  workflow in the n8n and GitHub web interfaces.

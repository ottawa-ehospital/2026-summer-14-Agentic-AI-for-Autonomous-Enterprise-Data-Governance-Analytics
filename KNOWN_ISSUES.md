# Known issues and quirks

Bugs, limitations, and "weird but acceptable" behaviors. Each entry
is either OPEN (still a problem), FIXED (resolved with a note),
or ACCEPTED (intentional limitation for the prototype).

## FIXED (Day 5): Action is hardcoded to cohort_construction in Access Control
The Day 4 Code node hardcoded `const action = "cohort_construction"`.
Day 5 added a Claude node (Anthropic API, Haiku, temperature 0) between
Edit Fields and Access Control that parses the action from
natural-language request text into a closed enum, and a Parse LLM Output
Code node that extracts the JSON defensively. Access Control now reads
`$json.parsed_action` instead of the hardcoded literal. Verified end-to-end
with receipt_pol002_deny.json, where a research_coordinator's
clinical-notes request denies via POL-002 — the same role that allows
in receipt_pol001_allow.json.

## ACCEPTED: Policies fetched via raw URL require public repo
The URL approach in Access Control assumes policies.json is at a
GitHub raw URL accessible without authentication. If the repo is
private, the inline-policies version of the Code node must be used
instead. Decision deferred until repo visibility is finalized.

## ACCEPTED: Receipt persistence relies on n8n execution history
Receipts are returned to the caller and recoverable from the n8n
Executions tab, but not yet written to an external database. For the
prototype this is sufficient; will revisit in Phase 3 if needed.

## ACCEPTED: SQL-style string interpolation in any future SQLite writes
If/when we add SQLite persistence, string interpolation rather than
parameterized queries will be used for prototype simplicity. Real
deployment would use prepared statements. To be noted in Section VII
(Limitations) of the final report.

## OPEN: Parse LLM Output fallback is fail-open
The Code node's catch block defaults to `action = "cohort_construction"`
and the requester_role from Edit Fields when Claude's response cannot
be parsed. This means a broken or empty Claude response would silently
allow a research_coordinator's cohort request through Access Control.
Production governance should fail closed: default to `action = "unknown"`
and have Access Control deny on unknown. Day 6+ hardening item.

## OPEN: Misclassification is a new threat surface introduced in Day 5
The Webhook payload can now influence the action label through Claude's
classifier. A crafted request_text could attempt to get itself
misclassified into a more permissive action — for example, describing
a clinical-notes request in language that resembles cohort construction.
Current mitigations are the closed enum in the system prompt, temperature
zero for determinism, and logging raw_text alongside parsed action in
the receipt for after-the-fact auditing. Not yet formally red-teamed;
test cases to be added to the Day 6+ test plan.

## OPEN: parsed_request not surfaced in webhook response
The Audit and Lineage node merges Claude's parsed fields internally but
the response body returned by Respond to Webhook does not include
parsed_request as a top-level object. The action used for the decision
is visible inside `decisions[0].action`, which is sufficient for
verification, but the full parsed triple (action, requester_role,
purpose) is not exposed. Low priority. Will be addressed when the
receipt schema is formalized.

R3 fail-closed not implemented; reproduced 2026-06-08 with empty 
request_text; classifier returns null action, Access Control falls back 
to cohort_construction and allows. Fix targeted for final prototype."

## FIXED

R3 (Day 9):** Access Control fail-open on null `parsed_action`. Root 
cause: `const action = input.parsed_action || "cohort_construction"` 
defaulted null to a valid action label, which POL-001 then permitted. 
Fix: removed fallback, added explicit tri-state guard returning deny 
under POL-FAIL-CLOSED before any policy evaluation. Verified with 5 
receipts (artifacts/r3_*_day9.json): empty and nonsense input fail
closed; POL-001 allow, POL-002 deny, POL-003 deny regressions all pass.

- OPEN: Coverage matrix deliverable for final report not yet built. Table of all
  provinces/territories with columns [modeled deeply | supported by schema].
  Tracks the 2026-06-20 jurisdiction-count decision in DECISIONS.md. Target: Week 4.
- OPEN: Quebec (Law 25) depth decision gate. Research front-loaded to Week 1;
  decide end of Week 2 whether Quebec ships as third deep jurisdiction or drops
  to "supported by schema" in the coverage matrix. Floor is Ontario + Alberta.
  Tracks the 2026-06-20 jurisdiction-count decision in DECISIONS.md.

## OPEN: Access Control references upstream nodes by exact name (introduced Day 11)
The Access Control node now reads the request payload via
$('Parse LLM Output').first().json and the policy via
$('HTTP Request').first().json.data, both by exact node name rather than from
direct input. This was the deliberate result of moving the policy-fetch HTTP
Request node inline between Parse LLM Output and Access Control (see DECISIONS
2026-06-25), which guarantees fetch-before-decide ordering. The trade-off is
brittleness: renaming either node, or replacing the HTTP Request node with a
differently-named one, silently breaks the reference. A broken request reference
would corrupt the decision inputs; a broken policy reference would fail closed
under POL-FETCH-FAILED. Mitigation for now is discipline: if either node is
renamed, update the Access Control code in the same edit. Low priority while the
canvas is stable. Will be revisited if the workflow is refactored or split.

## CLOSED (Day 13): Synthea FHIR dataset not present in repo (manual search confirmed). 
Data Quality Agent now takes the documented fallback: hand-authored valid + corrupted 
FHIR R4 set with CORRUPTIONS.md ground truth. Quebec flip condition resolved negative; 
QC stays schema-supported. See DECISIONS 2026-06-27.

## No new known issues (Day 14): 
The guard false-branch governance gap (an unknown selector would have produced no receipt and no response) was identified and closed in the same session by adding Audit DQ FailClosed on the guard false branch and wiring both audit nodes into a single Respond to Webhook node. Recorded here as closed, not open: every DQ outcome (clean, flagged, fail-closed) now emits a tamper-evident receipt and returns it to the caller.

## Two limitations parked from POL-007 authoring (non-blocking) (Day 15): 
(1) Attested-fact limitation. small_cell_suppression_applied is a requester-asserted boolean that the engine trusts, identical in kind to written_agreement_exists on POL-006. The policy engine governs the decision; verification that suppression was actually applied is out of scope this phase. Report framing: decision governance and fact verification are separate concerns. (2) Numeric-comparison engine extension is a deliberate non-goal. Having the engine compute cell_size >= 5 itself would require a Code-node change, which would break the swap-is-data demonstration for this authoring step. The threshold is therefore documented as metadata (minimum_cell_size 5) and enforced as a boolean attestation, by design. Both items are future work, not defects.

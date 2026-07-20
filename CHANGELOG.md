# Changelog

A day-by-day log of what was built or completed. Lighter than
DECISIONS.md — this is "what happened today" rather than "why
I chose X over Y."

Day 9 - R3 fail-closed fix in Access Control

- Identified bug location via node-by-node trace of empty-request execution in n8n Executions. Culprit was line 3 of Access Control: `const action = input.parsed_action || "cohort_construction"`. Parse LLM Output was correctly preserving null; Access Control was the substitution owner.
- Replaced fallback with explicit tri-state guard. Null or undefined `parsed_action` now returns a deny decision under `POL-FAIL-CLOSED` before any policy evaluation runs.
- Verified with 5 receipts saved to `artifacts/`:
  - `r3_fail_closed_empty_day9.json`: empty request_text denied under POL-FAIL-CLOSED.
  - `r3_fail_closed_nonsense_day9.json`: nonsense request_text ("asdfghjkl") denied under POL-FAIL-CLOSED.
  - `r3_regression_research_cohort_allow_day9.json`: POL-001 allow path intact.
  - `r3_regression_billing_cohort_deny_day9.json`: POL-003 deny path intact.
  - `r3_regression_research_notes_deny_day9.json`: POL-002 deny path intact, also closes Day 8 unverified gap.
- Saved, published in n8n Cloud, retested against production webhook URL.
- Side observation: Claude node in n8n has no System Message set and no visible user-message field; node appears to default to stringifying input. Out of scope for R3, captured in LEARNINGS.md as item to investigate.

2026-05-30 (Day 5)

Added language-derived action classification to the governance loop.

* Inserted Claude node (Anthropic API, Haiku, temperature 0) between Edit Fields and Access Control. System prompt constrains output to a closed enum of three actions (cohort_construction, clinical_notes_access, billing_report) plus role classification. Node renamed "Parse Request (Claude)" in n8n.
* Added Parse LLM Output Code node (JavaScript) downstream of Claude to extract JSON defensively. Handles Anthropic's native content-array shape, strips code fences, falls back on parse failure. Currently fail-open; flagged in KNOWN_ISSUES.
* Updated Access Control to read parsed_action and requester_role from the Code node's output instead of the hardcoded "cohort_construction" literal.
* Three end-to-end tests verified via Hoppscotch against the Test Webhook URL:
   * research_coordinator + cohort request, allowed via POL-001 (receipt_pol001_allow.json)
   * billing_analyst + cohort request, denied via POL-003 (receipt_pol003_deny.json)
   * research_coordinator + clinical-notes request, denied via POL-002 (receipt_pol002_deny.json). Same role as test 1, different action, opposite outcome.
* Workflow is now six nodes: Webhook, Edit Fields, Claude, Parse LLM Output, Access Control, Audit and Lineage, Respond to Webhook.

## 2026-05-29 (Day 4)
- Created policies/policies.json with four governance policies
  (POL-001 through POL-004)
- Replaced Access Control stub with logic that consults the policy
  file and returns structured decisions
- Updated Audit and Lineage node to assemble a real governance
  receipt with framework_mapping and SHA-256 final_artifact_hash
- Verified Test 1: research_coordinator → allowed by POL-001
- Verified Test 2: billing_analyst → denied by POL-003 with the
  governing policy correctly cited in the rationale
- Switched testing tool from reqbin to Hoppscotch (see LEARNINGS.md)

## 2026-05-28 (Days 1-3)
- Created GitHub repo (governedhealth)
- Signed up for n8n Cloud (governedhealth-moaz.app.n8n.cloud)
- Signed up for Anthropic API console with $10 spending limit
- Uploaded starter Synthea data zip (1000 patients + 50 sample +
  50 corrupted with ground truth in CORRUPTIONS.md)
- Built 5-node n8n workflow skeleton: Webhook → Edit Fields →
  Access Control → Audit and Lineage → Respond to Webhook
- First end-to-end test returned a stub governance receipt

## 2026-06-21 (Day 10)
Workstream A complete. Classifier prompt rewritten to locked four-action vocabulary; VALID_ACTIONS updated; Gate V1 passed with four captured receipts. Phase 1 technical foundation done.
Workstream B complete. Jurisdiction research for the headline divergence verified against statute text: AB requires a written agreement before any out-of-province disclosure (Health Information Regulation, Alta Reg 70/2001 s.8(4)); QC requires a mandatory privacy impact assessment and an adequacy finding before any communication outside Quebec, and a transfer to another Canadian province counts as outside Quebec (Act respecting the protection of personal information in the private sector, CQLR c P-39.1 s.17); ON gates by purpose and necessity with no pre-transfer assessment or mandatory written agreement (PHIPA, SO 2004 c 3 Sched A, exact out-of-province section number still to be pinned from e-Laws). Key finding: the three jurisdictions use three different gate types on the same record_export action, not three thresholds of one rule. Written to docs/jurisdiction_comparison.md with a verification log. Verifications 4 and 5 (ON de-identification, per-jurisdiction basis for POL-001 and POL-002) deferred to Phase 2 policy authoring.

## 2026-06-25 (Day 11)
Workstream C, gate 1 (HTTP capability probe): added standalone unwired HTTP Request node, GET https://httpbin.org/json, executed in isolation. Returned parsed JSON successfully. Confirms n8n Cloud can make outbound HTTPS calls and auto-parses JSON responses. No change to live pipeline; node not connected, not published.

Workstream C, gate 2 (authenticated private-repo fetch): HTTP Request node, GET GitHub Contents API for policies/policies.json on main, fine-grained read-only PAT via Header Auth credential, User-Agent + Accept: application/vnd.github.raw+json headers. Returns raw file as a string under $json.data (requires JSON.parse). Auth and fetch confirmed. Node still unwired, not published.

Workstream C, gate 3 (investigation): probed fetch-inside-Access-Control
(Option B). Confirmed Code nodes can make unauthenticated HTTP
(this.helpers.httpRequest, verified vs httpbin). Confirmed Code nodes have NO
credential selector, so authenticated Code-node fetch is not viable without an
inline token (forbidden by DECISIONS). Pivoting Option B to a dedicated HTTP
Request node carrying the credential; Access Control to read policy from input.
No live pipeline change; all work in scratch nodes, nothing wired or published.

Workstream C, gate 3 (wiring proven): confirmed Access Control can source
policy from the HTTP Request node via $('HTTP Request').first().json.data +
JSON.parse, while still receiving the request payload from Parse LLM Output.
Cross-node reference verified in scratch (policyCount 4, firstId POL-001).
Wiring shape settled: HTTP Request node fetches (carries credential), Access
ontrol reads by name. Token stays in credential; DECISIONS [2026-06-25] holds.
Still open: where the HTTP Request node sits so it executes before Access
Control, and fail-closed behavior on fetch failure. No live change; scratch
only, nothing published.

Workstream C, gate 3 (branch wired live): added a second connection from
Webhook to the HTTP Request node, so policy is fetched from the private repo on
every run in parallel with the main chain. Verified via test-webhook run
(research_coordinator + cohort_construction): both branches fired, main chain
completed, Access Control still decided allow via POL-001 with correct scope,
identical to Gate V1. No regression; HTTP branch is invisible to the main chain.
Access Control still runs its inline policies (code unchanged this step). NOT
yet published; live editor differs from production webhook.

Workstream C COMPLETE. Access Control now sources policy from
policies/policies.json in the private repo via the inline HTTP Request node
(Parse LLM Output -> HTTP Request -> Access Control), parsed from
$('HTTP Request').first().json.data. Inline policy array removed; repo file is
now the single runtime source. Fail-closed on fetch failure via
POL-FETCH-FAILED (verified). Swap demo proven: narrowing POL-001 scope in
GitHub (dropped then restored "medications") changed scope_granted with zero
code change. Verified on production webhook post-publish. Published.

2026-06-27 (Day 12)
Phase 2, jurisdiction-aware preconditions: extended the policy schema with a jurisdiction field and a preconditions array to express conditional permits (allow only if a named fact holds), which the prior permit/forbid/scope boolean schema could not represent. Schema is additive: a policy with no jurisdiction is treated as all-jurisdictions (wildcard, matching the existing applies_to_role "*" convention), and a permit with an empty preconditions array behaves identically to the old boolean permit. Existing POL-001 through POL-004 untouched and unchanged in behavior.
Authored POL-005 (Ontario record_export, no preconditions, purpose-and-necessity gate) and POL-006 (Alberta record_export, single precondition PRE-AB-AGREEMENT requiring written_agreement_exists when export_destination is out_of_province, basis Alta Reg 70/2001 s.8(4)). Quebec deliberately deferred to the Week 2 depth decision; floor is ON + AB. Committed to policies/policies.json.
Access Control rewritten to be jurisdiction-aware and precondition-gated: jurisdiction read from the envelope; policy match is now jurisdiction-and-action (a policy with a jurisdiction only matches its own jurisdiction, a policy without one is a wildcard); permits are gated by an AND-array of preconditions evaluated against envelope facts. New reason codes: POL-PRECONDITION-UNMET (fact present and false), POL-PRECONDITION-UNVERIFIABLE (fact absent from the envelope), POL-NO-JURISDICTION (jurisdiction-gated action requested with no jurisdiction). All fail closed. Existing forbid loop, permit-then-scope logic, POL-FAIL-CLOSED and POL-FETCH-FAILED paths preserved. Save + Publish, live on production webhook.
Envelope fix: the new fields (jurisdiction, export_destination, facts) reached Access Control as null until added explicitly to the Edit Fields node. Edit Fields runs in Manual Mapping with "Include Other Input Fields" off, so it emits only the fields mapped in its UI; the downstream Parse LLM Output spread faithfully forwards only what Edit Fields emits. Added jurisdiction (String, {{ $json.body.jurisdiction }}), export_destination (String, {{ $json.body.export_destination }}), facts (Object, {{ $json.body.facts }}) to Edit Fields. Confirmed the envelope then flows end to end.
Full test matrix run and verified on the production webhook: Ontario record_export allow via POL-005 (no precondition); Alberta record_export allow via POL-006 with PRE-AB-AGREEMENT satisfied; Alberta deny POL-PRECONDITION-UNMET (agreement asserted false); Alberta deny POL-PRECONDITION-UNVERIFIABLE (agreement fact absent); no-jurisdiction deny POL-NO-JURISDICTION; cohort_construction regression allow via POL-001 with three-category scope (additive change left the original path intact). Six receipts saved to artifacts/ as day12 evidence.
Jurisdiction divergence demonstrated: same role (research_coordinator), same action (record_export), same request text, varied only by jurisdiction, yields structurally different governance: Ontario permits on purpose alone while Alberta gates behind a written-agreement precondition. The "swap is data, not code" thesis now extends from scope (Workstream C) to jurisdiction-gated preconditions, with zero code change required to express the divergence between provinces. Published, production-verified.

2026-06-27 (Day 13)
Data Quality Agent dataset built and committed to data/ on main, ahead of the agent node build. Three files committed. data/valid_bundle.json: FHIR Bundle type collection, id governedhealth-valid-dataset, 9 resources (3 Patients, 4 Observations all LOINC 8310-5, 2 Conditions all ICD-10-CM E11.9). Patient 1 (Tremblay) is the all-clean control: obs-1 and condition-1 stay valid in both bundles. data/corrupted_bundle.json: id governedhealth-corrupted-dataset, identical to the valid bundle except the bundle id and exactly four planted defects: obs-2 status removed, obs-3 code removed, obs-4 LOINC 8310-5 changed to 99999-9, condition-2 ICD-10-CM E11.9 changed to E11.99. data/CORRUPTIONS.md: ground-truth answer key. Dataset map, the two in-scope corruption classes, the allowlist table, a four-row answer key with a governance-concern column (completeness, conformance) that feeds the evaluation rubric, the clean-control note, and the two-sided evaluation expectation.
Verified both ways: a diff of valid versus corrupted is exactly four changes plus the id rename; the corrupted bundle yields exactly the four answer-key defects and the clean controls stay silent. Deliberate simplifications recorded: Bundle entry fullUrl omitted (optional for a collection, the agent does not resolve references), relative references like Patient/patient-1, and the agent runs the two single-resource checks only (referential integrity is not checked).
No workflow nodes changed this day. This is dataset groundwork; the Data Quality Agent node build follows on Day 14. The two-class corruption taxonomy, dataset shape, allowlist method, and locked codes are recorded in DECISIONS 2026-06-27; the Synthea-absent finding and fallback are in KNOWN_ISSUES (CLOSED, Day 13).

2026-06-28 (Day 14)
Added the Data Quality Agent as a separate flow on the workflow canvas. Chain: Webhook (data-quality) to Resolve Dataset to Guard Bundle Path; true branch to Fetch Bundle to Data Quality Checks to Audit DQ to Respond to Webhook; false branch to Audit DQ FailClosed to Respond to Webhook. The agent fetches a committed bundle by closed selector, runs two in-scope checks (missing required field on Observations, terminology allowlist membership), and emits a lineage-only tamper-evident receipt. Verified end to end through the production webhook: valid returns a clean receipt (0 flags), corrupted returns a flagged receipt (exactly 4 answer-key flags), unknown selector returns a fail-closed receipt (DQ-FAIL-CLOSED). Receipt format is consistent with the access receipts (same id and timestamp convention, decisions-array container, SHA-256 final_artifact_hash).

2026-06-28 (Day 15)
- Authored POL-007 in policies/policies.json: aggregate_statistics permitted for research_coordinator, wildcard jurisdiction, PRE-AGG-SUPPRESSION precondition (boolean small_cell_suppression_applied, minimum_cell_size 5 as metadata, CIHI basis). No engine change; swap-is-data.
- Verified aggregate_statistics flips from fail-closed to governed decision across four paths: allow (suppression true), deny POL-PRECONDITION-UNMET (false), deny POL-PRECONDITION-UNVERIFIABLE (absent), deny no-permit (billing_analyst, POL-003 and POL-004 only).
- Committed four verification receipts to artifacts/: receipt_agg_allow_day15.json, receipt_agg_unmet_day15.json, receipt_agg_unverifiable_day15.json, receipt_agg_roledeny_day15.json.
- Gate V6 unblocked: the Analytics Agent capstone now has a real governance decision to route through.

## 2026-07-09 (Day 16)

### Added
- `data/cohort_bundle.json`: 17-patient FHIR collection bundle. 14 diabetes patients (E11.9) with a deliberately skewed gender distribution (female 9, male 4, other 1), plus 3 hypertension-only patients (I10) that serve as a live filter test. A broken condition filter would count 17 and release `male` at 5 rather than suppressing it.
- `If` gate node on the access chain, positioned after `Audit and Lineage`. Compound condition: `receipt.decisions[0].action == "aggregate_statistics"` AND `receipt.decisions[0].decision == "allow"`. Both outputs converge on the shared `Respond to Webhook`.
- `Fetch Cohort Bundle` HTTP Request node on the gate's true branch. Fixed URL, no caller-supplied path.
- `Analytics Compute` Code node. Parses the bundle, counts distinct diabetes patients grouped by `Patient.gender`, resolves the suppression threshold from the live policy file by capability lookup, applies small-cell suppression to the output.
- `Audit Analytics` Code node. Emits the analytics receipt, chained to the parent access receipt via `chained_from.access_receipt_id` and `chained_from.access_receipt_hash`.
- `artifacts/receipt_analytics_allow_day16.json`, `artifacts/receipt_analytics_deny_precondition_unmet_day16.json`, `artifacts/receipt_regression_cohort_allow_day16.json`, `artifacts/receipt_regression_cohort_deny_day16.json`
- `artifacts/canvas_analytics_allow_day16.png`, `artifacts/canvas_analytics_deny_day16.png`

### Verified
- Gate V6 passed. Four executions on one unchanged workflow.
- Allow path: `cohort_size` 14, threshold 5 resolved from POL-007, female 9 released, male and other suppressed, `suppressed_cell_count` 2, no flags, `outcome: released`.
- Deny path (`small_cell_suppression_applied: false`): access receipt returned with `POL-PRECONDITION-UNMET`. `Fetch Cohort Bundle`, `Analytics Compute`, and `Audit Analytics` never executed. Confirmed grey on the execution canvas.
- Regression: `cohort_construction` allow and `billing_analyst` deny both return unchanged access receipts through the gate's false output.

### Unchanged
- `Access Control` engine logic: zero edits.
- `policies/policies.json`: zero edits.

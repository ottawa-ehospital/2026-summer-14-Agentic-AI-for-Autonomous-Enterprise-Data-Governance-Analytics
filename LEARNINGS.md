# Hard-won lessons during GovernedHealth build

A running log of gotchas, workarounds, and lessons learned. Each entry
is something I figured out the hard way that future-me (or a reader of
the repo) should know.

## 2026-05-28: Anthropic API access is separate from claude.ai
An existing claude.ai subscription does not include API access. The
API requires a separate signup at console.anthropic.com with its own
billing and API keys. Both bill independently.

## 2026-05-29: Hoppscotch vs reqbin for testing webhook bodies
Reqbin (reqbin.com) strips JSON request bodies in some configurations.
Symptom: webhook receives content-length 0 and an empty body object.
Hoppscotch (hoppscotch.io) delivers bodies correctly. Recommendation:
use Hoppscotch for all n8n webhook testing.

## 2026-05-29: GitHub web uploader caps at 100 files per batch
Cannot bulk-upload more than 100 files through the website at once.
Workaround: zip files locally first, upload the zip as one file.
Acceptable for bulk data that does not need per-file diffing.

## 2026-05-29: n8n webhook body access in expressions
n8n Cloud webhook node exposes incoming POST body fields under
$json.body.FIELDNAME in expressions. Confirmed by inspecting Webhook
node output panel after a successful test request.

## 2026-05-30: "Anthropic Chat Model" is a sub-node, not a standalone node
In the n8n node picker, "Anthropic Chat Model" is a LangChain sub-node intended to attach beneath an AI Agent or Basic LLM Chain. Trying to use it standalone causes n8n to auto-spawn a "When chat message received" trigger and a chain to host it. The correct standalone node is just called "Anthropic" in the search results, with "Message a Model" as the operation. Lost time to this twice. Recommendation: when adding Claude to an existing flow, search for "Anthropic" and pick the entry whose operation list includes "Message a Model."

## 2026-05-30: n8n Test webhook URL is single-shot
Each click of "Execute workflow" arms the Test webhook for exactly one incoming request. Sending a second request without re-arming either hits an idle webhook or executes against stale state with null field values. Caused a confusing "Bad request" error from Anthropic during Day 5 Test 3 because the user message expression evaluated to null. Recommendation: re-click Execute workflow before every test send. Production URL does not have this constraint but executions are not visible in the editor.

## 2026-05-30: LLM output shape varies with "Simplify Output" toggle
n8n's Anthropic "Message a Model" node has a Simplify Output toggle that changes the response shape downstream nodes see. With it on, the response sits as $json.content (an array of {type, text} blocks). The naive parsing path of checking message.content or content-as-string misses this. Recommendation: in any Code node downstream of an LLM call, branch first on Array.isArray($json.content) and read content[0].text before falling back to other shapes.

## 2026-05-30: Claude wraps JSON in markdown fences by default
Even with temperature 0 and explicit "no markdown, no preamble" instructions in the system prompt, Claude often wraps JSON output in ```json ... ``` blocks on first attempts. Fixing the prompt to be more emphatic ("Return raw JSON only. Do NOT wrap in markdown code fences. Start your response with { and end with }.") usually works, but defensive code fence stripping in a downstream Code node is more reliable. Recommendation: do both. Strict prompt plus defensive parser.

2026-05-30: Temperature setting lives under "Add Option" not Settings tab
On the n8n Anthropic node, Temperature is not in the Settings tab or visible by default in Parameters. It is exposed only via the Add Option dropdown at the bottom of the Parameters panel. Recommendation: when configuring any LLM node for deterministic output, scroll past the Tools section to find Add Option and add Temperature explicitly.

2026-06-07:LLM classifier output schemas must not include fields that are 
authenticated inputs. If the form provides X, the classifier must not 
also produce X. Downstream nodes may read from either source, and the 
inferred value can silently overwrite the authoritative one.

2026-06-07:n8n Cloud serves the last published version on the production webhook, 
not the editor state. Saving a node updates the editor only. The 
Publish button shows an unpublished-change count (e.g. "0/4") that must 
be cleared before testing the production webhook.

## 2026-06-14: Claude node has no visible prompt configuration
While tracing R3, opened the Claude node (n8n's Anthropic
integration) to find the closed vocabulary the LLM is instructed
to return. System Message field was empty (only placeholder text
"e.g. You are a helpful assistant" visible). No user-message,
prompt, or text field was visible anywhere in the Parameters
panel between Model and Add Attachments. Edit Fields node before
Claude only unpacks the webhook body into top-level fields
(request_text, requester_role, purpose, receipt_id, timestamp);
it does not construct a prompt string. Yet the workflow runs
successfully and Claude produces valid JSON classifications for
the three demo scenarios. Working hypothesis: with Simplify
Output enabled, the n8n Anthropic node defaults to stringifying
the incoming JSON and sending it as the user message, with no
system instruction at all. The LLM is inferring the
classification task from the JSON shape alone. This is
architecturally fragile: there is no closed vocabulary defined
anywhere we can find, no instruction to return JSON, no
temperature-zero discipline enforced by prompt content (only by
the node setting). If n8n changes the default user-message
behavior in a future version, classification could silently
break. Not blocking R3 because the fail-closed path catches
parse failures regardless of why they happen, but flagged as
the top investigation target for Phase 2. Action: find or
explicitly configure the user-message field in the Claude
node, write a real system prompt with closed vocabulary, and
re-verify all five test scenarios.


## 2026-06-21: Workstream A.1 resolved: Claude node prompt and classifier output contract documented

### Investigation outcome (A.1 three questions)

1. Is there a real system message configured, or is the field empty?
No System Message is configured. The Claude (Anthropic) node uses no System Message. The classifier instruction is carried in the Messages array as User-role messages, not as a system prompt.

2. Where does the user-side content come from?
Explicit, not stringified. The Messages array holds two blocks, both role User. Values 1 is the full classifier instruction. Values 2 is the request payload, passed via the expression {{ $json.request_text }}. n8n is not defaulting to stringifying the incoming JSON; the request text is referenced explicitly.

3. What is the exact field name and shape of the classifier output that Parse LLM Output consumes?
The prompt asks for three fields (action, requester_role, purpose) as raw JSON. Parse LLM Output extracts the raw text, strips code fences, JSON-parses it, then deliberately deletes requester_role, and emits parsed_action = parsed.action || null. Access Control reads parsed_action as its action. The only classifier-derived field that survives parsing is action. requester_role and purpose are not taken from the LLM (see correction 3).

### Claude node panel, every field and current value
- Credential: Anthropic account
- Resource: Text
- Operation: Message a Model
- Model source: From list
- Model: claude-haiku-4-5-20251001
- Messages: two blocks
  - Values 1, role User: classifier instruction, returns raw JSON with action, requester_role, purpose
  - Values 2, role User: {{ $json.request_text }}
- Add Attachments: off
- Simplify Output: on
- System Message: none configured
- Temperature: not visible in the panel as inspected; confirm under node options before Gate V1 (prompt design assumes 0)

### Corrections to earlier LEARNINGS assumptions
1. The earlier note "prompt undocumented, System Message empty, workflow runs because n8n stringifies input" is wrong. The prompt is explicit in two User messages, and the request text is passed by explicit expression.
2. The earlier note that out-of-vocabulary or hallucinated actions fail through the "no applicable policy permits" path is wrong for the live code. Access Control defines VALID_ACTIONS and routes any action not in that set (including null or undefined) to POL-FAIL-CLOSED before policy evaluation. A closed vocabulary is already enforced in code.
3. The pending verification gate on whether the LLM's requester_role is load-bearing is resolved: it is vestigial. Parse LLM Output explicitly deletes parsed.requester_role with the rationale that role is authenticated request-envelope context, never an LLM inference. Access Control reads role from input.requester_role, which passes through from the payload via Edit Fields. Purpose is likewise payload-sourced; Audit and Lineage records it into the hashed receipt, but no decision consumes it.

### Defense point worth surfacing in the report
Role is authenticated context, not a model guess, and this is enforced in code: Parse LLM Output deletes any role the LLM returns. This is a concrete demonstration of the classify-vs-decide separation and should be cited explicitly.

### Open reconciliation problem for A.3 (not resolved here)
Four action lists are in play and none agree:
- Prompt emits: cohort_construction, clinical_notes_access, billing_report
- Access Control VALID_ACTIONS: cohort_construction, clinical_notes_access, billing_query, medication_review
- Policies (repo policies.json and the inline copy): cohort_construction, clinical_notes_access
- Build guide A.3 proposal: cohort_construction, clinical_notes_access, aggregate_statistics, record_export
Consequence: a prompt label of billing_report is rejected by VALID_ACTIONS and fails closed; billing_query and medication_review are valid in code but unreachable from the prompt and ungoverned by any policy. A.3 locks one vocabulary and propagates it to the prompt, VALID_ACTIONS, and the policies together.

### Logged for later workstreams
The policy list is hardcoded inline in the Access Control node and duplicated with /policies/policies.json. The inline copy is what executes. This must be reconciled for the "swap is data, not code" claim. Carry to Workstream C.3.

Status: A.1 documented. Formal "resolved" marker to be set at Gate V1 per build guide.

Status update (2026-06-21): Gate V1 passed. All four V1 payloads behave as specified (POL-001 allow, POL-002 deny, POL-FAIL-CLOSED on out-of-vocabulary and empty). Closed vocabulary enforced via Access Control VALID_ACTIONS, now set to the locked four. Claude node investigation RESOLVED.

### 2026-06-25 n8n Code nodes have no credential selector. A plain Code
node shows only Parameters and Settings tabs, with no Credentials tab. Therefore
this.helpers.httpRequestWithAuthentication cannot resolve a stored credential
from inside a Code node on this instance. Code nodes CAN make unauthenticated
outbound HTTP via this.helpers.httpRequest (verified against httpbin.org). For
authenticated fetches, the credential must be carried by an HTTP Request node,
which does have a credential selector. Consequence: "Access Control fetches its
own policy via authenticated Code-node HTTP" (Option B) is not viable without
putting the token inline, which DECISIONS [2026-06-25] forbids. Pivoting to an
HTTP Request node performing the fetch.

n8n cross-node data reference works on this instance. A node
can read another node's output by name via $('Node Name').first().json.<field>,
regardless of direct wiring, as long as the referenced node has executed in the
run. Verified: a Code node read the HTTP Request node's fetched policy via
$('HTTP Request').first().json.data, JSON.parsed it, and got policyCount 4,
firstId POL-001. This is the mechanism that lets Access Control stay in the main
chain (receiving the request payload from Parse LLM Output) while pulling policy
from a separate HTTP Request node. Caveat: the referenced node must actually
execute in the run for its output to exist; placement in the chain matters.

In n8n, nodes wired as parallel branches off the same
source do not have guaranteed completion order. A downstream node referencing a
parallel node via $('Name') may run before that node finishes, yielding "Node
hasn't been executed". Fix: place the dependency inline in the chain so execution
order is guaranteed. Branch-and-reference only works if the referenced node is
upstream in the actual execution sequence, not merely present on the canvas.

2026-06-27 In n8n, a Set / Edit Fields node in Manual Mapping mode with "Include
Other Input Fields" toggled off emits ONLY the fields explicitly mapped in its UI;
everything else in the input is silently dropped. Consequence for this build: a new
envelope field cannot be added by sending it in the webhook payload alone. It must
also be added to Edit Fields, because Edit Fields is the single definition point of
what the request envelope contains, and the downstream Parse LLM Output spread
(...previousItem) faithfully forwards only what Edit Fields emitted. Symptom when
missed: the field arrives at Access Control as null no matter what the payload
carries, and (for record_export) the request fails closed under POL-NO-JURISDICTION
because the jurisdiction never made it past Edit Fields. This is the same shape as
the Workstream C inline-policy lesson: the envelope has a single source of truth, and
adding to it is a two-place change (payload + Edit Fields), not one. Fix applied:
added jurisdiction, export_destination (both String), and facts (Object) to Edit
Fields, sourced from $json.body to match the existing requester_role mapping. The
quickest ground-truth check is Edit Fields -> Execute step -> read the OUTPUT panel,
which shows exactly what the node emits before anything downstream touches it.

2026-06-27 The three Canadian jurisdictions modeled so far apply three structurally
different gate types to the SAME action (record_export), not three thresholds of one
rule: Ontario gates on purpose and necessity (an effectively boolean permit, empty
preconditions), Alberta gates on a single prerequisite fact (written agreement, one
precondition), and Quebec gates on two prerequisites ANDed (PIA + adequacy finding,
deferred). This is what makes the divergence demo land: holding role, action, and
request text constant and varying only jurisdiction produces categorically different
governance, which is stronger evidence for the policy-as-data thesis than three
numeric thresholds would be.

**2026-06-27 (Day 13): Hand off a validated file to commit rather than authoring in the GitHub editor**
Handing myself a complete, validated file to commit via the Add file to Create new file path beats hand-authoring structured content (JSON, layered markdown) in the GitHub web editor. It is faster and it sidesteps the editor's paste-clipping. For a new file in a new folder, Add file to Create new file and type the full path (e.g. data/valid_bundle.json); the slash auto-creates the folder. Commit directly to main (solo author, web UI, everything runs on main), not a PR.

**2026-06-27 (Day 13): The GitHub web editor clips leading bold markers on pasted markdown**
The GitHub web editor clips a leading ** on pasted markdown bold labels, so an inline label at the start of a line loses its asterisks. Avoid by putting labels on their own line, or by using headers and tables instead of inline bold labels. Three Day 13 DECISIONS entries rendered with the leading markers clipped; cosmetic, content correct, fixable by relocating the labels to their own lines.

**2026-06-28 (Day 14): HTTP Request replaces the item with its response body**
An HTTP Request node (Fetch Bundle) outputs only its response, here { data: "..." }. Upstream fields (dataset, bundle_path from Resolve Dataset) do NOT flow through it. The Data Quality Checks node initially read input.dataset and input.bundle_path and got null on both, because those fields were gone after the fetch. The checks were still correct (they read the fetched bundle), but provenance was broken. Fix: read provenance from the upstream node by exact name, const prov = $('Resolve Dataset').first().json, the same cross-node reference pattern Access Control uses. Rule: after an HTTP Request node, do not assume upstream fields survived; reference the upstream node directly.

**2026-06-28 (Day 14): Paste-target discipline in multi-node sessions**
When building several Code nodes in one session, the Audit DQ receipt code was briefly pasted into the Data Quality Checks node by mistake. No damage, because the canonical Data Quality Checks code existed in the session and was re-pasted to restore it. Reinforces the validated-file-beats-editor principle: keep the authoritative version of each node's code in hand so a wrong paste is a clean re-paste, not a reconstruction. When handing over code for multiple nodes, name the target node explicitly at the top of each block.

**Day 15 [2026-06-28]: Access Control engine confirmations from pre-author read**
Read the live Access Control node before authoring POL-007 (READ BEFORE EDITING). Three behaviors confirmed against the actual code, not assumed: (1) An absent applies_when on a precondition means always-applies. appliesWhenMatches returns true when pre.applies_when is falsy, so omitting it makes the precondition fire on every matching request, unlike POL-006 which scoped its precondition to out-of-province via applies_when. (2) The precondition basis field surfaces in receipts. The satisfied branch pushes {precondition_id, basis} into preconditions_satisfied, and the deny rationale interpolates basis. So basis must be an honest, presentable string, not a placeholder. (3) The engine reads only a fixed set of policy keys (applies_to_role, jurisdiction, forbids, permits, preconditions, scope, policy_id, name) and a fixed set of precondition keys (requires, applies_when, precondition_id, basis). It never enumerates keys, so unknown fields like minimum_cell_size and phipa_principle are carried harmlessly as documentation metadata.

**Day 15 [2026-06-28]: Role gate precedes precondition gate**
A wrong-role request never reaches precondition evaluation. billing_analyst requesting aggregate_statistics with a perfect suppression attestation (small_cell_suppression_applied true) was still denied, with policies_consulted showing only POL-003 and POL-004 and no precondition code. The applicable-policy filter (role match or wildcard) runs first; a role with no matching permit falls to the generic no-permit deny before the permit-and-precondition loop is entered. Verification expectations for role-deny must therefore not expect a precondition failure code.

## Day 16 [2026-07-09]

### The n8n Executions tab is read-only. The Editor tab is where nodes are editable.

A node opened from an execution replay shows all its fields, and none of them accept input. This looks exactly like a locked or permission-gated field. Cost roughly twenty minutes chasing a "protected" Mode dropdown on `Analytics Compute`. The field was never protected; the tab was. Switching to `Editor` and reopening the node made it change normally. This is correct behaviour for an audit-adjacent tool: a past execution's record should not be retroactively editable.

### Code node Mode must be set before pasting code, not after.

`Run Once for Each Item` disables `.first()` on both `$input` and `$('NodeName')`. Any node that reads a whole payload, or reaches back to an upstream node by name, requires `Run Once for All Items`. `Analytics Compute` failed on its first execution with `Can't use .first() here [line 10, for item 0]`. The phrase "for item 0" is the tell: it only appears when the node is iterating. The code was correct; the mode was wrong. Set Mode first from now on.

### Reading the error text beat all three of my hypotheses.

When `Analytics Compute` errored, three plausible causes were on the table: a `Set` iteration failure in the sandboxed VM, a cross-node reference failure, and a convoluted ternary reading the role. All three were wrong. The error message named the exact line and the exact cause. Reading it took ten seconds. Acting on any hypothesis would have meant editing working code.

### `Audit and Lineage` strips the item to `{ receipt }`.

Its final line is `return [{ json: { receipt: receipt } }];` with no spread of the input. Every upstream field is discarded at that point. The gate downstream of it cannot read `$json.parsed_action` or `$json.access_decision`; both live inside the receipt, at `receipt.decisions[0]`. This was caught by reading the live node before designing the gate, not by debugging a broken gate afterwards.

### A green checkmark is not a passing verification gate.

`Analytics Compute` succeeded on its second run. Success meant it did not throw. It would also have shown green with `cohort_size: 17` and `male` released at 5 rather than suppressed. The demo bundle carries 3 non-diabetes patients precisely so that a broken condition filter produces visibly wrong output instead of silently plausible output. Verify the values, not the status.

### Suppress-everything is the correct failure mode for a disclosure safeguard.

If `Analytics Compute` cannot resolve the threshold from the policy file, it sets `minimum_cell_size` to `Infinity`, which suppresses every cell, and records a flag. The alternative, defaulting to a reasonable number like 5, would release data on the basis of a constant that no policy authorized.

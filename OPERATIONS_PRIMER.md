GovernedHealth Operations Primer
A click-by-click reference for the mechanical actions you repeat in every build step.

The Phase 2 build guide tells you what to change and why. This document tells you how

to do it in the actual web UIs, so you do not have to work it out each time.
Owner: Malik (Moaz Adam), Team 14. Windows, web UIs only. No em dashes anywhere.
Keep this open in a tab while you build. When a build step says "edit the Access

Control node" or "commit the file" or "send the test payload," the exact procedure is here.

How to use the build guide (read this first)
PHASE2_BUILD_GUIDE.md is a sequencing spine, not a click-by-click manual and not a

source of truth about your live system. It tells you the right ORDER of work and the

right DECISIONS to make. It does not reliably describe what your actual n8n nodes and

repo files contain, because parts of it were written from assumptions about them that

turned out to be wrong.
Concrete examples already found:

The guide assumed the Claude node prompt was undocumented and that n8n was

stringifying input. It was not. The prompt was explicit in two User messages.
The guide's A.4 template would have dropped requester_role from the classifier

output. That was safe only because Parse LLM Output already deletes the LLM role

on purpose, which the guide did not know.
The guide says to edit Parse LLM Output to enforce the closed vocabulary. In the

live system the enforcement lives in Access Control's VALID_ACTIONS array. Parse

LLM Output needed no change.

The overriding rule, which beats any guide instruction that conflicts with it:

READ THE LIVE NODE OR FILE BEFORE CHANGING IT. If the guide describes a node

differently from what you see on screen, what you see on screen wins. Open the node,

read its actual code or config against the real input, find the exact line that

matters, then act. This is the same discipline as Procedure 5 below, applied before

every build step, not just when debugging.
When a guide step and this primer disagree about mechanics, this primer wins, because

it was written from the live system. When this primer and the live system disagree,

the live system wins, because nodes change. Trust the screen over any document.

The two iron rules (these cause most "it did not work" confusion)

Save, then Publish. In n8n Cloud the production webhook serves the last PUBLISHED

version, not the last saved version. After any node edit you must Save the workflow

and then Publish. If a test behaves as though your change did nothing, the first

thing to check is whether you published. Watch for the orange Publish button; orange

means there are unpublished changes.
Test the production URL only. Always send test requests to your production webhook

URL, never the test URL. The test URL only fires when the canvas is in listening mode

and does not reflect the published workflow.


Procedure 1: Edit a Code node (Access Control, Parse LLM Output, Audit and Lineage)
These nodes hold JavaScript in a code editor. You almost never rewrite the whole thing;

you replace one line or one block. The safe way to replace a single line:

Open the workflow at governedhealth-moaz.app.n8n.cloud.
Double-click the node. The code editor opens, with line numbers down the left.
Click anywhere on the line you want to replace.
Press the Home key. The cursor moves to the start of that line.
Hold Shift and press End. The entire line highlights.
Press Delete. The line is now empty.
Paste the replacement line.
Look at the line above and below. Your new line should match their style: same

indentation, a semicolon at the end if the others have one, matching quotes and brackets.
Click the back arrow at the top-left of the node panel to return to the canvas.
Save (Ctrl+S or the Save button, top-right).
Publish.

To replace a BLOCK of several lines, do the same but: click at the start of the first

line, then hold Shift and click at the end of the last line, to highlight the whole block,

then Delete and paste.
Known location note: the closed action vocabulary lives in the Access Control node as

the VALID_ACTIONS array, and anything not in that array fails closed under

POL-FAIL-CLOSED. Vocabulary changes are made there, not in Parse LLM Output. As of

the A.3 lock the four valid actions are cohort_construction, clinical_notes_access,

aggregate_statistics, record_export.
If something looks broken after pasting, do not theorize. Close the node without saving

(back arrow, then do not click Save), reopen it, and try the single line again. n8n holds

your edit only in the unsaved workflow state until you Save, so an unsaved mistake is

discarded when you navigate away without saving.

Procedure 2: Edit the Claude node prompt
The classifier prompt is not a Code node. It lives in the Claude (Anthropic) node as

message blocks.

Double-click the Claude node.
Scroll to the Messages section. You will see message blocks, for example Values 1

and Values 2.
Click the block you want to edit to expand it. Each block has a Role (User or

Assistant) and a content text box.
To change the instruction text, edit the content box of Values 1. To change which

input field is passed in, edit Values 2 (it holds an expression like

{{ $json.request_text }}).
Leave the Role dropdowns as they are unless a step tells you to change them.
Return to the canvas, Save, Publish.

Do not put any policy logic, deny rules, or keyword matching in this prompt. The prompt

classifies only. That separation is the core of the project.

Procedure 3: Send a test request with Hoppscotch
This is the only way you send test requests.

Open https://hoppscotch.io
Set the method dropdown to POST.
Paste your production webhook URL into the URL bar.
Click the Body tab.
Set Content Type to application/json.
Choose Raw for the request body.
Paste your JSON payload into the body box.
Click Send.
Read the full response body, not just the status code. The receipt is in the body.

If you get a network error right after a plan change or a long idle, hard refresh the

page and confirm the workflow is Active and Published, then resend.

Procedure 4: Create or edit a file in GitHub (web UI)
This is the only way you change repo files.
To EDIT an existing file:

Open the file in the repo.
Click the pencil icon (top-right of the file view).
Make your edit.
Scroll down to the Commit changes box.
Write a commit message: lowercase, imperative, scoped. For example:

feat: add jurisdiction selector to webhook payload
Click Commit changes.

To CREATE a new file, including inside a new folder:

Click Add file, then Create new file.
In the filename box, type the full path with forward slashes. Typing a slash creates

the folder. For example: policies/jurisdictions/AB.json creates the jurisdictions

folder and the AB.json file inside it.
Paste the file contents.
Scroll down, write a commit message, click Commit changes.

Important: a commit only happens when you click the green Commit changes button. If you

navigate away from a create or edit screen before clicking it, the work is discarded

silently. After any commit, open the file in the repo and confirm it is really there

before moving on. This is the file-level version of read-the-live-system-first.
Keep one logical change per commit where practical.

Procedure 5: Read an execution to debug (find the first wrong node)
When a receipt is wrong, do not guess. Read the actual run.

In the workflow, open the Executions tab (or panel).
Click the run you want to inspect. The canvas shows that run's data.
Click a node to see its Input panel and Output panel. Input is what the node received.

Output is what it produced.
Walk left to right: Webhook, Edit Fields, Claude, Parse LLM Output, Access Control,

Audit and Lineage, Respond to Webhook. Find the FIRST node whose Output is already wrong.
The bug is in that node or in the input it received, not in anything downstream of it.

Fix that node, Save, Publish, retest.

This is the discipline that has caught every real bug so far: read the live data first,

theorize second.

Procedure 6: Capture a receipt to the artifacts folder
After a gate test passes, save the receipt as evidence.

Copy the full JSON receipt from the Hoppscotch response body.
In GitHub, create a new file at artifacts/<descriptive_name>_dayN.json

(use the real day number). For example: artifacts/v1_cohort_allow_day10.json
Paste the receipt JSON.
Commit with a message like: chore: capture v1 cohort allow receipt


The save-and-commit habit (end of each session)
Update the five living docs that changed and commit them:

CHANGELOG.md (day-by-day build log)
DECISIONS.md (append-only; never rewrite earlier entries)
KNOWN_ISSUES.md
LEARNINGS.md
ARCHITECTURE.md

Add any new receipts to artifacts/ with the _dayN suffix. Then commit.

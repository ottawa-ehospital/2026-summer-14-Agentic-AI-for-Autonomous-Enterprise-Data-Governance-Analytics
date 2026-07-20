# Artifacts

Evidence and supporting material captured during development. Used
in midterm slides, final demo, and the final report.

## What goes here

- Canvas screenshots (canvas_dayN.png), one per major build day
- Receipt examples (receipt_*.json), real outputs from test runs
- Policy snapshots (policies_vN.json), versions of policies.json
  at key milestones
- Code node source exports (*.js), standalone copies of JavaScript
  from n8n Code nodes for reviewability without opening the workflow JSON
- Demo recordings (excluded from Git via .gitignore if too large)

## Naming convention

- `canvas_dayN.png`, full n8n canvas at end of Day N
- `receipt_polNNN_<outcome>_dayN.json`, e.g. receipt_pol003_deny_day5.json
- `policies_vN.json`, e.g. policies_v1.json after Day 4
- `<node_name_snake_case>.js`, e.g. parse_llm_output.js
- `screenshot_DESCRIPTION.png`, anything else worth capturing

## Note on file naming history

Day 4 receipts were created without a day suffix. They were renamed
in a Day 5 commit to receipt_pol001_allow_day4.json and
receipt_pol003_deny_day4.json when the day-suffix convention was
adopted. Earlier commits in git history retain the original filenames.

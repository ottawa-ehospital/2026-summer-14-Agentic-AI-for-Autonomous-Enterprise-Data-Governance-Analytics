# CORRUPTIONS.md

Ground-truth answer key for the GovernedHealth Data Quality Agent dataset.

This file is the authority on what is wrong in the corrupted set and what the agent is expected to detect. It exists so that agent runs can be scored against a known answer, not a guess.

## Dataset

| File | Bundle id | Role |
|------|-----------|------|
| `data/valid_bundle.json` | `governedhealth-valid-dataset` | Clean baseline. No defects. The agent should flag nothing. |
| `data/corrupted_bundle.json` | `governedhealth-corrupted-dataset` | Copy of the valid bundle with exactly four planted defects, listed below. |

The corrupted bundle differs from the valid bundle in exactly four places plus the bundle `id`. No other field differs. This is what makes a flag attributable to a planted defect rather than to incidental drift.

## Defect classes in scope

Two classes only, both single-resource checks. Other classes (referential integrity, implausible value, temporal inconsistency) are supported by the same agent design and documented as detectable-by-extension; they are not planted here.

1. Missing required field (structural). A FHIR R4 required field is absent.
2. Invalid terminology code (terminology). A code is well-formed but not a member of the approved value set.

## Terminology allowlist

The agent validates codes by membership in the value set the valid bundle legitimately uses:

| System | Code | Display |
|--------|------|---------|
| `http://loinc.org` | `8310-5` | Body temperature |
| `http://hl7.org/fhir/sid/icd-10-cm` | `E11.9` | Type 2 diabetes mellitus without complications |

Any code outside this set is flagged. The planted bad codes (`99999-9`, `E11.99`) are well-formed strings that are not in the set, which tests value-set conformance rather than mere string shape.

## Planted defects (answer key)

| # | Resource id | Patient | Class | What changed (valid -> corrupted) | Expected agent flag | Governance concern |
|---|-------------|---------|-------|-----------------------------------|---------------------|--------------------|
| 1 | `obs-2` | patient-2 | Missing required field | `status: "final"` removed | MISSING_REQUIRED_FIELD on `status` | Completeness. A required field is absent, so the record is structurally invalid and cannot be trusted as a basis for an access or analytics decision. |
| 2 | `obs-3` | patient-2 | Missing required field | `code` element removed | MISSING_REQUIRED_FIELD on `code` | Completeness. An observation with no code carries no clinical meaning and is not safely usable downstream. |
| 3 | `obs-4` | patient-3 | Invalid terminology code | LOINC `8310-5` -> `99999-9` | INVALID_TERMINOLOGY_CODE `99999-9` | Conformance. A code outside the approved value set breaks interoperability and can silently misclassify clinical meaning. |
| 4 | `condition-2` | patient-3 | Invalid terminology code | ICD-10-CM `E11.9` -> `E11.99` | INVALID_TERMINOLOGY_CODE `E11.99` | Conformance. A diagnosis code not in the bound value set undermines the integrity of the clinical record and any decision that relies on it. |

## Clean controls

Patient 1 (`patient-1`) carries one Observation (`obs-1`, LOINC `8310-5`) and one Condition (`condition-1`, ICD-10 `E11.9`). Both are valid in both bundles. They exist to demonstrate the no-false-positives half of the evaluation: a correct run flags neither.

## Evaluation expectation

A correct agent run produces:

- On `valid_bundle.json`: zero flags.
- On `corrupted_bundle.json`: exactly the four flags in the answer key above, and no others.

Any deviation (a missed planted defect, or a flag on a clean control) is an agent error, not a dataset error, because the dataset is fixed and verified here.


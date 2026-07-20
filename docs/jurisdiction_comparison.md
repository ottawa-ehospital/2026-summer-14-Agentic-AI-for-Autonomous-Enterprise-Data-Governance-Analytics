# Jurisdiction Comparison: Health Data Governance Regimes

Workstream B output. Raw material for the Phase 2 jurisdiction policy files.
Owner: Malik (Moaz Adam), Team 14. No em dashes.

Source discipline: every rule encoded into a policy file must trace to a named
source below. Primary sources (statute, regulation, provincial commissioner) are
preferred. Secondary sources are used only to locate and corroborate the primary
text, never as the sole authority for an encoded rule. Verify each starred item
against the primary source before it goes into a policy file.

Verification status legend (used in the matrix and the verification log):
[CONFIRMED] checked against primary statute or regulation text, exact citation captured.
[PENDING] seeded from primary or authoritative secondary source, not yet checked against statute text.

---

## Primary source set (verified, with links)

Ontario, PHIPA
- Statute, Personal Health Information Protection Act, 2004, SO 2004 c 3 Sched A,
  Ontario e-Laws: https://www.ontario.ca/laws/statute/04p03
- Information and Privacy Commissioner of Ontario (IPC): https://www.ipc.on.ca
- IPC guide to PHIPA (PDF): https://www.ipc.on.ca/sites/default/files/legacy/Resources/hguide-e.pdf

Alberta, HIA
- Statute, Health Information Act, RSA 2000 c H-5, CanLII: https://www.canlii.org/t/81pf
- Health Information Regulation, Alta Reg 70/2001, CanLII:
  https://www.canlii.org/en/ab/laws/regu/alta-reg-70-2001/latest/alta-reg-70-2001.html
- Office of the Information and Privacy Commissioner of Alberta (OIPC): https://oipc.ab.ca/legislation/hia/
- Alberta government, Health data access (research): https://www.alberta.ca/health-research

Quebec, Law 25
- Statute, Act respecting the protection of personal information in the private
  sector, CQLR c P-39.1, as amended by Law 25 (An Act to modernize legislative
  provisions as regards the protection of personal information, SQ 2021 c 25).
  Informally called PPIPSA / ARPPIPS / Quebec Private Sector Act; the citable name
  is the one above. LegisQuebec: https://www.legisquebec.gouv.qc.ca/en/document/cs/p-39.1
- Cross-border transfer obligation: s.17. Equivalence-list mechanism: s.17.1.
  Research/statistics-without-consent pathway: s.21.
- Commission d'acces a l'information du Quebec (CAI): https://www.cai.gouv.qc.ca
- Note: Quebec has NO dedicated health-custodian statute equivalent to PHIPA or
  HIA. Health information about Quebec residents is governed under the general
  Law 25 regime. This structural difference is the reason Quebec is the strongest
  third jurisdiction: it proves the engine generalizes past the custodian-statute
  family.

---

## Comparison matrix

| Dimension | Ontario (PHIPA) | Alberta (HIA) | Quebec (Law 25) |
|---|---|---|---|
| Statute name and citation | Personal Health Information Protection Act, 2004, SO 2004 c 3 Sched A | Health Information Act, RSA 2000 c H-5, plus Health Information Regulation, Alta Reg 70/2001 | Law 25, amending PPIPSA (private sector). No health-specific statute. |
| Regime type | Health-specific custodian statute | Health-specific custodian statute | General privacy law (GDPR-influenced), no health-specific statute |
| Regulated entity | Health Information Custodian (HIC) | Custodian (named organizations and professions) | Enterprise / person carrying on an enterprise; public bodies under the public-sector act |
| Agents / subordinate actors | "Agent" of the HIC | "Affiliate" (employees, volunteers, contractors, agencies) | Service providers and mandataries under contract |
| Consent model (use and disclosure) | Express or implied; implied within circle of care | Consent required unless a specific HIA authority permits without consent; need-to-know and highest anonymity | Default requires free and informed, often express, consent; GDPR-style |
| Secondary use for research | Permitted via research ethics board approval and a research plan under the Act and regulations | Permitted with research ethics board approval; identifiable research disclosure needs a tripartite agreement (researcher, institution, Alberta government) | A PIA is required to assess whether PI can be used for research without individual consent |
| De-identification / aggregate | Aggregate and de-identified use is lower-risk and broadly permitted (verify exact provision) | HIA allows disclosure of non-identifying health information for any purpose | De-identified / anonymized data falls outside the strictest controls, but Quebec's anonymization standard is strict (verify) |
| Out-of-province / cross-border disclosure | [CONFIRMED substance, section number pending] No pre-transfer assessment and no mandatory pre-disclosure written agreement. Governed by consent-and-necessity plus a narrow permissive provision: disclosure to an out-of-province entity is permitted where the recipient performs similar functions, for health planning or administration, and the info relates to care provided in Ontario to a resident of another province. PIPEDA can attach once data leaves Ontario for commercial activity. PHIPA, SO 2004 c 3 Sched A (exact out-of-province section to be pinned from e-Laws). | [CONFIRMED] Permitted only if a written agreement is in place BEFORE disclosure, Health Information Regulation Alta Reg 70/2001 s.8(4); research adds a tripartite agreement (HIA s.54) | [CONFIRMED] A PIA is MANDATORY before any communication outside Quebec, and the communication is lawful only if the assessment establishes the destination gives adequate protection, plus a written agreement reflecting the assessment. A transfer to another Canadian province counts as outside Quebec. Act respecting the protection of personal information in the private sector, CQLR c P-39.1 s.17 (equivalence list s.17.1 eases the equivalence analysis but does not waive the PIA). |
| Audit / accountability | 2020 amendments require an electronic audit log of every EHR access (date, time, who, what, modified) | Need-to-know, highest anonymity, custodian accountable for affiliates; audit disclosure permitted under conditions | Privacy Officer accountability, PIA register, breach register, records of processing |
| Headline divergence vs Ontario | baseline | Hard precondition: written agreement before any out-of-province disclosure | Hard precondition: mandatory PIA plus equivalent-protection finding before any out-of-province communication, including to another province |

---

## The divergence scenario (headline demo material)

The action this maps to: record_export (locked vocabulary).

Scenario: a request to export or transfer identifiable patient records to a
recipient located in another province.

- Ontario: a custodian may disclose out of province, with conditions attaching to
  the outbound transfer, and PIPEDA potentially re-attaching once the data leaves
  Ontario.
  Source: IPC / PHIPA; corroborated by HIPAA Journal PHIPA compliance summary.
- Alberta: permitted only if a written agreement is in place before the data
  leaves Alberta; identifiable research disclosure additionally requires a
  tripartite agreement.
  Source: Health Information Regulation, Alta Reg 70/2001 s.8(4); Alberta health-research guidance.
- Quebec: blocked until a privacy impact assessment establishes the destination
  gives equivalent protection; a sibling Canadian province does not automatically
  qualify.
  Source: PPIPSA s.17 (Law 25); CAI guidance.

Why this is the right demo: same request_text, same locked action (record_export),
three different governance outcomes, driven entirely by which jurisdiction policy
file the engine loads. No node logic changes. This is the proof of the thesis and
the direct answer to the professor's "dynamic and resilient, not Ontario-locked"
feedback.

Modeling note for the policy files: the cleanest way to encode this divergence is
as different effects on record_export per jurisdiction, for example permit-with-
conditions (ON), permit-conditional-on-agreement (AB), and deny-pending-
assessment (QC). The exact effect vocabulary is a Workstream C schema decision,
not settled here. What B establishes is that the divergence is real, sourced, and
hangs on record_export.

---

## Verification log

### Verification 1, AB out-of-province disclosure: CONFIRMED (2026-06-21)

Claim checked: Alberta requires a written agreement before any out-of-province
disclosure of health information.

Primary source: Health Information Regulation, Alta Reg 70/2001, section 8(4).

Confirmed: prior to storage, use, or disclosure of health information by or to a
person in a jurisdiction outside Alberta, the custodian must enter into a written
agreement with that person. The agreement must do five things: (a) provide for the
custodian to retain control over the information, (b) adequately address the risks,
(c) require the person to implement and maintain adequate safeguards, (d) allow the
custodian to monitor compliance, and (e) contain remedies for non-compliance.

Notes for later encoding (not part of the record_export divergence, do not encode yet):
- The trigger is broader than disclosure: it also covers storage or use by a person
  outside Alberta.
- Research disclosure of identifiable information ties to a written agreement under
  HIA s.54, with a research ethics board response provided. Raw material for the AB
  research policy, not the export divergence.
- A custodian disclosing identifying diagnostic, treatment, and care information
  without consent must record the disclosure and keep the notation for ten years,
  HIA s.41(1). This is the AB audit hook. Raw material for the AB audit policy.

### Verification 2, QC out-of-province transfer: CONFIRMED (2026-06-21)

Claim checked: Quebec requires a mandatory PIA and an equivalent-protection finding
before any communication of personal information outside Quebec, including to
another Canadian province.

Primary source: Act respecting the protection of personal information in the
private sector, CQLR c P-39.1, section 17 (as amended by Law 25, SQ 2021 c 25).

Confirmed text: before communicating personal information outside Quebec, a person
carrying on an enterprise must conduct a privacy impact assessment, taking into
account the sensitivity of the information, the purposes for which it is to be
used, the protection measures that would apply, and the legal framework applicable
in the State where it would be communicated. The information may be communicated
only if the assessment establishes it would receive adequate protection, and the
communication must be the subject of a written agreement reflecting the assessment.

Citation correction: the statute's citable name is Act respecting the protection
of personal information in the private sector, CQLR c P-39.1. The labels PPIPSA /
ARPPIPS used earlier are informal aliases, not the citation.

The demo-critical detail (another province counts as outside Quebec) is confirmed
by McCarthy Tetrault commentary on article 17: PI collected in Quebec requires a
PIA before being communicated outside the province, including to another Canadian
province. This is the point on which QC denies where ON and AB permit.

Notes for later encoding (do not encode yet):
- s.17.1 provides for a published list of jurisdictions deemed equivalent. Being on
  the list eases the equivalence analysis but does NOT waive the PIA obligation. So
  even a deemed-equivalent Ontario still triggers a PIA step QC imposes and the
  others do not.
- s.21 permits communication without consent for study, research, or statistics,
  gated on a PIA. This is the QC research pathway, the analog to ON's REB route and
  AB's s.54. Raw material for the QC research policy.

### Verification 3, ON out-of-province disclosure: CONFIRMED substance (2026-06-21), section number pending

Claim checked: Ontario permits out-of-province export under lighter-touch
conditions than Alberta's pre-agreement rule or Quebec's pre-PIA rule.

Confirmed: PHIPA does not require PHI to remain in Ontario and imposes neither a
pre-transfer impact assessment nor a mandatory pre-disclosure written agreement.
Out-of-province disclosure runs on the consent-and-necessity model plus a narrow
permissive provision: a custodian may disclose to an entity outside Ontario where
the recipient performs functions similar to the custodian, the disclosure is for
health planning or health administration, and the information relates to care
provided in Ontario to a resident of another province. A custodian may never
disclose more than is reasonably necessary. Once data leaves Ontario for
commercial activity, PIPEDA can attach.

Sources: IPC PHIPA FAQ; IPC collection-use-disclosure guidance; HIPAA Journal and
Proofpoint PHIPA summaries. Statute: PHIPA, SO 2004 c 3 Sched A.

Residual to pin before report: the exact PHIPA section number for the
out-of-province disclosure provision. The e-Laws page is JavaScript-gated and did
not return statute text in this session. Substance is confirmed across multiple
sources; the clean section citation is the one open item. Pin it from
https://www.ontario.ca/laws/statute/04p03 (Part IV, disclosure provisions) before
the report cites it.

The structural finding (this is the report framing):
The three jurisdictions differ not in degree but in the TYPE of gate they put on
the same record_export request.
- Ontario: gates by purpose and necessity. Lawful purpose plus minimum-necessary;
  no prior procedure required before the data moves.
- Alberta: gates by a prior contractual precondition. A written agreement meeting
  five conditions must exist before disclosure (Alta Reg 70/2001 s.8(4)).
- Quebec: gates by a prior assessment and adequacy finding. A PIA must first
  establish the destination gives adequate protection (CQLR c P-39.1 s.17); another
  province does not automatically qualify.
Three different gate types on one action is a stronger thesis claim than three
different thresholds of the same gate. Lead with this in the report.

### Verification 4, ON de-identified and aggregate data treatment: PENDING
### Verification 4, ON de-identified and aggregate data treatment: PENDING
### Verification 5, per-jurisdiction basis for cohort_construction and clinical_notes_access: PENDING

---

## Open verifications before encoding (do not skip)

Each of these must be checked against the primary statute or regulation text, not
a secondary summary, before the corresponding rule is written into a policy file:

1. ON: exact PHIPA provision and conditions governing out-of-province disclosure.
2. ON: exact treatment of de-identified and aggregate data (for aggregate_statistics
   and cohort_construction policies).
3. AB: confirm s.8(4) Health Information Regulation wording and the research
   tripartite-agreement basis.
4. QC: confirm PPIPSA s.17 wording and the CAI equivalent-protection test, and
   confirm the research-without-consent PIA trigger.
5. All three: the precise basis for permitting cohort_construction (de-identified
   research cohorts) and for restricting clinical_notes_access, so the existing
   POL-001 and POL-002 logic is re-grounded per jurisdiction rather than assumed
   to carry over from Ontario unchanged.

---

## Status

Verified divergence scenario identified (record_export, out-of-province). Matrix
seeded from verified sources. Primary-source verifications listed above remain to
be done against statute text before policy authoring in Phase 2. Quebec depth gate
(end of Phase 2) will decide whether QC ships as a modeled jurisdiction or as
"supported by schema."


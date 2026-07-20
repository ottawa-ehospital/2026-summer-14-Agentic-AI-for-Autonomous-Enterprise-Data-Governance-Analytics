# Architecture
 
This document will hold the architecture description for GovernedHealth.
 
To be filled in during Phase 1 (Days 10-12).
 
## Components
 
- **Orchestrator**: n8n workflow entry point (Webhook node)
- **Access Control agent**: Code node that consults policies.json
- **Data Quality agent**: Code node that validates FHIR records (Phase 3)
- **Analytics agent**: Code node that constructs cohorts (Phase 3)
- **Audit & Lineage agent**: Code node that assembles governance receipt
- **Policy enforcement layer**: shared policies.json file consulted by all agents
 
## Governance receipt schema
 
See the implementation guide for the current schema. Updated as the
workflow evolves.

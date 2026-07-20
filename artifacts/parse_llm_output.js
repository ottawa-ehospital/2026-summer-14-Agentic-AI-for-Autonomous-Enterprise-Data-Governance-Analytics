// Parse Claude's response into structured fields.
// Handles Anthropic's native content-array shape, with defensive
// fallbacks for other LLM output shapes and code-fence wrapping.
// NOTE: current fallback is fail-open (defaults action to
// "cohort_construction"). See KNOWN_ISSUES.md for hardening item.

const llmItem = $input.first().json;
const previousItem = $('Edit Fields').first().json;

let rawText = "";
if (Array.isArray(llmItem.content) && llmItem.content[0]?.text) {
  rawText = llmItem.content.map(c => c.text || "").join("");
} else if (llmItem.message && llmItem.message.content) {
  if (Array.isArray(llmItem.message.content)) {
    rawText = llmItem.message.content.map(c => c.text || "").join("");
  } else {
    rawText = llmItem.message.content;
  }
} else if (typeof llmItem.content === "string") {
  rawText = llmItem.content;
} else if (llmItem.text) {
  rawText = llmItem.text;
}

let parsed = null;
try {
  const cleaned = rawText.replace(/^\s*```json\s*/i, '').replace(/\s*```\s*$/, '').trim();
  parsed = JSON.parse(cleaned);
} catch (e) {
  parsed = {
    action: "cohort_construction",
    requester_role: previousItem.requester_role || "research_coordinator",
    purpose: "fallback - LLM output could not be parsed"
  };
}

return [{
  json: {
    ...previousItem,
    parsed_request: parsed,
    requester_role: parsed.requester_role || previousItem.requester_role,
    parsed_action: parsed.action || "cohort_construction"
  }
}];
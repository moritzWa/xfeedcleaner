import defaultPrompts from '../../../shared/default-prompts.json';

export const DEFAULT_BAD_CRITERIA = defaultPrompts.badCriteria;
export const DEFAULT_GOOD_CRITERIA = defaultPrompts.goodCriteria;
export const DEFAULT_HIGHLIGHT_CRITERIA = defaultPrompts.highlightCriteria;

export const SYSTEM_PROMPT_PREFIX = `You are a tweet classifier. Classify this tweet into one of three categories based on the criteria below.`;

export const SYSTEM_PROMPT_SUFFIX = `
Respond in JSON: {"reason": "7-12 word explanation", "verdict": "filtered" | "allowed" | "highlighted"}

Classification rules:
1. If tweet matches FILTER criteria → "filtered"
2. If tweet matches HIGHLIGHT criteria → "highlighted"
3. If tweet matches ALLOW criteria → "allowed"

Examples:
{"reason": "electoral politics discussing voting and partisan candidates", "verdict": "filtered"}
{"reason": "engagement bait asking followers to ratio this post", "verdict": "filtered"}
{"reason": "useful tech workflow tip for developer productivity", "verdict": "allowed"}
{"reason": "founder sharing startup product update and roadmap", "verdict": "allowed"}
{"reason": "thought-provoking question about AI product design choices", "verdict": "highlighted"}
{"reason": "insightful debate on UX patterns for complex workflows", "verdict": "highlighted"}`;

export function constructFullPrompt(
  badCriteria: string,
  goodCriteria: string,
  highlightCriteria: string
): string {
  return `${SYSTEM_PROMPT_PREFIX}

FILTER these tweets:
${badCriteria}

ALLOW these tweets:
${goodCriteria}

HIGHLIGHT these tweets (most interesting, discussion-worthy):
${highlightCriteria}

${SYSTEM_PROMPT_SUFFIX}`;
}

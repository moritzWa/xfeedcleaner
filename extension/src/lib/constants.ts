export const DEFAULT_BAD_CRITERIA = `- Engagement bait: rage bait, thirst traps, "hot take", "agree or disagree?", ratio requests
- Vapid musings: "ugh mondays", "vibes", trend-riding with no actual thought or insight
- Personal updates without insight: moving announcements, visa news, team offsites, company culture posts
- Electoral politics: elections, political parties, candidates, voting, partisan debates
- Culture war content: racism debates, immigration policy, DEI controversy, left vs right ideology
- Low-effort replies: emoji-only, "this", "lol", "+1", "W", "L", "ratio"
- Generic complaints: "is X down?", venting without substance
- Celebrity gossip, sports drama, reality TV`;

export const DEFAULT_GOOD_CRITERIA = `- Tech, programming, software, AI/ML, startups, founder content
- Economics, finance, markets, investing, business news, global trade
- Intellectual discussion: philosophy, science, rationality, ideas
- Wisdom, quotes, or life lessons - especially from founders, investors, or notable figures
- Productivity, self-improvement, or life philosophy with actual insight
- Product announcements, tutorials, tips, workflows
- Personal projects, side projects, open source
- Hiring posts, career advice, industry analysis
- Book recommendations, learning resources
- Original thoughts and opinions on any allowed topic above

Note: Economics and business news mentioning governments or politicians in economic context is NOT political content - allow it.`;

export const DEFAULT_HIGHLIGHT_CRITERIA = `- Tweets that invite discussion or debate on design, product, or AI/ML topics
- Insightful opinions or hot takes on product strategy, UX, or design systems
- AI research breakthroughs, new models, or technical deep dives
- Thought-provoking questions about building products or startups
- Contrarian or novel perspectives on tech industry trends`;

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

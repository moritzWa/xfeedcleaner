export const DEFAULT_CRITERIA = `FILTER these types of tweets:
- Engagement bait: rage bait, thirst traps, "hot take", "agree or disagree?", ratio requests
- Empty musings: rhetorical questions or personal statements with no new information, insights, or useful thoughts - just vibes or trend-riding
- Government politics: elections, political parties, candidates, voting
- Culture war content: racism debates, immigration policy, DEI controversy, left vs right ideology
- Low-effort replies: emoji-only, "this", "lol", "+1", "W", "L", "ratio"
- Generic complaints: "is X down?", "ugh mondays", venting without substance
- Celebrity gossip, sports drama, reality TV

DO NOT FILTER (always allow):
- Tech, programming, software, AI/ML, startups, founder content
- Intellectual discussion: philosophy, science, rationality, ideas
- Product announcements, tutorials, tips, workflows
- Personal projects, side projects, open source
- Hiring posts, career advice, industry analysis
- Book recommendations, learning resources
- Original thoughts and opinions on any allowed topic above`;

export const SYSTEM_PROMPT_PREFIX = `You are a tweet filter. Decide if this tweet should be filtered based on:`;

export const SYSTEM_PROMPT_SUFFIX = `
Respond in JSON: {"filter": true/false, "reason": "3-5 word explanation"}

Examples:
{"filter": true, "reason": "political election content"}
{"filter": true, "reason": "engagement bait ratio request"}
{"filter": true, "reason": "empty musing no substance"}
{"filter": false, "reason": "tech workflow tip"}
{"filter": false, "reason": "startup product update"}`;

export function constructFullPrompt(criteria: string): string {
  return `${SYSTEM_PROMPT_PREFIX}

${criteria}

${SYSTEM_PROMPT_SUFFIX}`;
}

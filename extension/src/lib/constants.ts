export const DEFAULT_CRITERIA = `FILTER these types of tweets:
- Engagement bait: rage bait, thirst traps, "hot take", "agree or disagree?", ratio requests
- Vapid musings: "ugh mondays", "vibes", trend-riding with no actual thought or insight
- Electoral politics: elections, political parties, candidates, voting, partisan debates
- Culture war content: racism debates, immigration policy, DEI controversy, left vs right ideology
- Low-effort replies: emoji-only, "this", "lol", "+1", "W", "L", "ratio"
- Generic complaints: "is X down?", venting without substance
- Celebrity gossip, sports drama, reality TV

DO NOT FILTER (always allow):
- Tech, programming, software, AI/ML, startups, founder content
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

export const SYSTEM_PROMPT_PREFIX = `You are a tweet filter. Decide if this tweet should be filtered based on:`;

export const SYSTEM_PROMPT_SUFFIX = `
Respond in JSON: {"filter": true/false, "reason": "brief 4-8 word explanation"}

Examples:
{"filter": true, "reason": "electoral politics about voting"}
{"filter": true, "reason": "engagement bait asking for ratio"}
{"filter": true, "reason": "vapid musing with no real insight"}
{"filter": false, "reason": "useful tech workflow tip"}
{"filter": false, "reason": "founder sharing startup product update"}
{"filter": false, "reason": "meaningful quote about excellence"}
{"filter": false, "reason": "economics and global investment news"}`;

export function constructFullPrompt(criteria: string): string {
  return `${SYSTEM_PROMPT_PREFIX}

${criteria}

${SYSTEM_PROMPT_SUFFIX}`;
}

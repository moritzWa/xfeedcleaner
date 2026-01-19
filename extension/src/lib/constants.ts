export const DEFAULT_CRITERIA = `- The tweet uses manipulative tactics to gain engagement (engagement bait, rage bait, thirst traps)
- The tweet is about government politics, elections, political parties, or candidates
- The tweet is ideological debate: racism, immigration policy, culture wars, DEI controversy, far-left/far-right
- The tweet is a low-effort reply (emoji-only, "this", "lol", "+1", "W", "L")
- The tweet is poll-style engagement bait ("hot take", "agree or disagree?", "ratio")
- The tweet is a generic complaint with no substance ("is X down?", "ugh mondays")
- The tweet promotes events/meetups unrelated to tech, startups, or AI
- The tweet is celebrity gossip, sports drama, or reality TV discussion`;

export const SYSTEM_PROMPT_PREFIX = `You are a tweet analyzer. Your job is to decide if the content of a tweet is met with the following criteria:`;

export const SYSTEM_PROMPT_SUFFIX = `
If any of the above criteria are met, the tweet should be considered bait.
Respond EXCLUSIVELY using one of these formats:
- "true: reason1, reason2, reason3" (if bait)
- "false" (if not bait)

Where reasons are 1-3 lowercase keywords from the criteria. Example responses:
"true: political, divisive"
"true: sensationalized, manipulative"
"false"`;

export function constructFullPrompt(criteria: string): string {
  return `${SYSTEM_PROMPT_PREFIX}

${criteria}

${SYSTEM_PROMPT_SUFFIX}`;
}

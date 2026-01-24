import '@std/dotenv/load';
import { z } from 'zod';
import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

const groq = new OpenAI({
  apiKey: Deno.env.get('GROQ_API_KEY'),
  baseURL: 'https://api.groq.com/openai/v1',
});

// Use Llama 4 Scout - cheap multimodal model ($0.11/$0.34 per M tokens)
const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

// Zod schema for structured output
const TweetAnalysisSchema = z.object({
  verdict: z.enum(['filtered', 'allowed', 'highlighted']),
  reason: z.string(),
});

type TweetAnalysis = z.infer<typeof TweetAnalysisSchema>;

// Fixed system prompt prefix and suffix (not editable by users)
const SYSTEM_PROMPT_PREFIX = `You are a tweet classifier. Classify this tweet into one of three categories based on the criteria below.`;

const SYSTEM_PROMPT_SUFFIX = `
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

const DEFAULT_BAD_CRITERIA = `- Engagement bait: rage bait, thirst traps, "hot take", "agree or disagree?", ratio requests
- Vapid musings: "ugh mondays", "vibes", trend-riding with no actual thought or insight
- Personal updates without insight: moving announcements, visa news, team offsites, company culture posts
- Electoral politics: elections, political parties, candidates, voting, partisan debates
- Culture war content: racism debates, immigration policy, DEI controversy, left vs right ideology
- Low-effort replies: emoji-only, "this", "lol", "+1", "W", "L", "ratio"
- Generic complaints: "is X down?", venting without substance
- Celebrity gossip, sports drama, reality TV`;

const DEFAULT_GOOD_CRITERIA = `- Tech, programming, software, AI/ML, startups, founder content
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

const DEFAULT_HIGHLIGHT_CRITERIA = `- Tweets that invite discussion or debate on design, product, or AI/ML topics
- Insightful opinions or hot takes on product strategy, UX, or design systems
- AI research breakthroughs, new models, or technical deep dives
- Thought-provoking questions about building products or startups
- Contrarian or novel perspectives on tech industry trends`;

function constructFullPrompt(
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

interface AnalyzeRequest {
  tweetText: string;
  tweetId: string;
  author?: string;
  images?: string[];
  badCriteria?: string;
  goodCriteria?: string;
  highlightCriteria?: string;
}

async function analyzeTweet(request: AnalyzeRequest): Promise<TweetAnalysis> {
  const {
    tweetText,
    author,
    images = [],
    badCriteria,
    goodCriteria,
    highlightCriteria,
  } = request;

  // Use user criteria if provided, otherwise use defaults
  const effectiveBadCriteria = badCriteria || DEFAULT_BAD_CRITERIA;
  const effectiveGoodCriteria = goodCriteria || DEFAULT_GOOD_CRITERIA;
  const effectiveHighlightCriteria = highlightCriteria || DEFAULT_HIGHLIGHT_CRITERIA;

  const systemPrompt = constructFullPrompt(
    effectiveBadCriteria,
    effectiveGoodCriteria,
    effectiveHighlightCriteria
  );

  // Include author for context
  const tweetWithAuthor = author ? `@${author}: ${tweetText}` : tweetText;

  // Build message content - use multimodal format if images present
  let userContent: string | ChatCompletionContentPart[];

  if (images.length > 0) {
    // Vision model with images - send first image
    userContent = [
      { type: 'text' as const, text: tweetWithAuthor || 'Analyze this tweet image:' },
      {
        type: 'image_url' as const,
        image_url: { url: images[0] },
      },
    ];
  } else {
    userContent = tweetWithAuthor;
  }

  const completion = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 100,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const response = completion.choices[0].message.content;
  if (!response) {
    throw new Error('No response from Groq');
  }

  // Parse and validate response
  const parsed = JSON.parse(response);
  return TweetAnalysisSchema.parse(parsed);
}

Deno.serve({ port: 8000 }, async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method === 'POST' && new URL(req.url).pathname === '/analyze') {
    try {
      const body = await req.json();
      const {
        tweetText,
        tweetId,
        author,
        images,
        badCriteria,
        goodCriteria,
        highlightCriteria,
      } = body;

      if (!tweetText || !tweetId) {
        return new Response(
          JSON.stringify({ error: 'Missing tweetText or tweetId' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      console.log(`📡 Analyzing tweet ${tweetId} from @${author || 'unknown'}`);

      const result = await analyzeTweet({
        tweetText,
        tweetId,
        author,
        images,
        badCriteria,
        goodCriteria,
        highlightCriteria,
      });

      console.log(`✅ Result for ${tweetId}: verdict=${result.verdict}`);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  }

  return new Response('Not Found', { status: 404 });
});

console.log('🚀 Unbaited server running on http://localhost:8000');

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
  filter: z.boolean(),
  reason: z.string(),
});

type TweetAnalysis = z.infer<typeof TweetAnalysisSchema>;

// Fixed system prompt prefix and suffix (not editable by users)
const SYSTEM_PROMPT_PREFIX = `You are a tweet filter. Decide if this tweet should be filtered based on:`;

const SYSTEM_PROMPT_SUFFIX = `
Respond in JSON: {"filter": true/false, "reason": "brief 4-8 word explanation"}

Examples:
{"filter": true, "reason": "electoral politics about voting"}
{"filter": true, "reason": "engagement bait asking for ratio"}
{"filter": true, "reason": "vapid musing with no real insight"}
{"filter": false, "reason": "useful tech workflow tip"}
{"filter": false, "reason": "founder sharing startup product update"}
{"filter": false, "reason": "meaningful quote about excellence"}
{"filter": false, "reason": "economics and global investment news"}`;

const DEFAULT_CRITERIA = `FILTER these types of tweets:
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

function constructFullPrompt(criteria: string): string {
  return `${SYSTEM_PROMPT_PREFIX}

${criteria}

${SYSTEM_PROMPT_SUFFIX}`;
}

interface AnalyzeRequest {
  tweetText: string;
  tweetId: string;
  author?: string;
  images?: string[];
  criteria?: string; // User's custom criteria (optional)
}

async function analyzeTweet(request: AnalyzeRequest): Promise<TweetAnalysis> {
  const { tweetText, author, images = [], criteria } = request;

  // Use user criteria if provided, otherwise use default
  const effectiveCriteria = criteria || DEFAULT_CRITERIA;
  const systemPrompt = constructFullPrompt(effectiveCriteria);

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
      const { tweetText, tweetId, author, images, criteria } = body;

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
        criteria,
      });

      console.log(`✅ Result for ${tweetId}: filter=${result.filter}`);

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

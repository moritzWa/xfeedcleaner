// NOTE: these DEFAULT_CRITERIA, SYSTEM_PROMPT_PREFIX, SYSTEM_PROMPT_SUFFIX, and constructFullPrompt
//       are duplicated in src/lib/constants.ts since we cannot import them from the service worker.

export const DEFAULT_CRITERIA = `- The tweet is not interesting and just making a joke or pointing out something funny
- The tweet uses manipulative tactics to gain engagement (engagement bait)
- The tweet is political in nature. It discusses politics, government, political issues, parties, candidates, elections, or any other political topic, be it related to any country or region.
- The tweet discusses ideologies in relation to politics. Topics such as racism, communism, fascism, nationalism, immigration, anti-immigration, DEI, woke-ism, far-left, far-right, etc.
- The tweet is a low-effort reply (emoji-only, single word like "this", "lol", "+1", etc.)
- The tweet is shallow social commentary or poll-style engagement bait ("hot take", "agree or disagree?", "X vs Y" comparisons, "is this enough money?", generic lifestyle debates)
- The tweet is a generic complaint or status update with no substance ("is X down?", "ugh mondays", etc.)
- The tweet promotes events, meetups, or announcements unrelated to technology, startups, AI, or software engineering
- The tweet does not provide any novel insight, interesting information, technical content, or thought-provoking ideas
`;

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

// Polyfill for Firefox
if (typeof browser === "undefined") {
  (globalThis as any).browser = chrome;
}

async function analyzeWithGroq(
  text: string,
  tweetId: string
): Promise<{
  tweetId: string;
  isBait: boolean;
  reasons?: string[];
  error?: string;
}> {
  try {
    console.log("Analyzing tweet:", { tweetId, text });

    // Get all settings from sync storage
    const { groqApiKey, promptCriteria, selectedModel, isEnabled } =
      await browser.storage.sync.get([
        "groqApiKey",
        "promptCriteria",
        "selectedModel",
        "isEnabled",
      ]);

    console.log("Retrieved settings:", {
      hasApiKey: !!groqApiKey,
      hasCriteria: !!promptCriteria,
      model: selectedModel,
      isEnabled,
    });

    if (!groqApiKey) {
      throw new Error(
        "Groq API key not found. Please set it in the extension settings."
      );
    }

    // Use the stored criteria or fall back to default
    const criteria = promptCriteria || DEFAULT_CRITERIA;
    const fullPrompt = constructFullPrompt(criteria);

    // Use selected model or fall back to default
    const model = selectedModel || "gemma2-9b-it";

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: fullPrompt,
            },
            {
              role: "user",
              content: text,
            },
          ],
          temperature: 0,
          max_tokens: 10,
        }),
      }
    );

    const data = await response.json();
    console.log("Groq API response:", data);

    if (
      !data ||
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message
    ) {
      console.error("Invalid response from Groq:", data);
      return {
        tweetId,
        isBait: false,
        error: "Invalid API response",
      };
    }

    const responseContent = data.choices[0].message.content
      .toLowerCase()
      .trim();
    const isBait = responseContent.startsWith("true");
    let reasons: string[] = [];

    if (isBait) {
      const parts = responseContent.split(":");
      if (parts.length > 1) {
        reasons = parts[1]
          .split(",")
          .map((r: string) => r.trim())
          .filter(Boolean);
      }
    }
    // console.log("Analysis result:", { tweetId, isPolitical, responseContent });

    return {
      tweetId,
      isBait,
      reasons
    };
  } catch (error) {
    console.error("Error analyzing tweet:", error);
    return {
      tweetId,
      isBait: false,
      error: (error as Error).message || "Unknown error",
    };
  }
}

browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === "newTweet") {
    // Check if extension is enabled from sync storage
    browser.storage.sync.get(["isEnabled"]).then(async (result) => {
      // Default to enabled if not set
      const isEnabled = result.isEnabled ?? true;

      if (!isEnabled) {
        return; // Don't analyze if disabled
      }

      const tweetId = request.content.id;

      // Continue with analysis...
      analyzeWithGroq(request.content.text, tweetId).then((result) => {
        console.log("Analysis result:", result);
        if (sender.tab && sender.tab.id) {
          browser.tabs.sendMessage(sender.tab.id, {
            action: "analysisResult",
            result: {
              tweetId,
              isBait: result.isBait,
              reasons: result.reasons as string[],
              error: null,
            },
          });
        }
      });
    });
  }
  // Required for Firefox to keep message port open
  return true;
});

// When the service worker starts, ensure defaults are set
browser.runtime.onInstalled.addListener(async () => {
  const { promptCriteria, selectedModel } = await browser.storage.sync.get([
    "promptCriteria",
    "selectedModel",
  ]);
  const defaults = {
    ...(promptCriteria ? {} : { promptCriteria: DEFAULT_CRITERIA }),
    ...(selectedModel ? {} : { selectedModel: "gemma2-9b-it" }),
    isEnabled: true,
  };

  if (Object.keys(defaults).length > 0) {
    await browser.storage.sync.set(defaults);
    console.log("Default settings set:", defaults);
  }
});

// TypeScript declarations for Firefox WebExtension API
declare namespace browser {
  export const runtime: typeof chrome.runtime;
  export const storage: typeof chrome.storage;
  export const tabs: typeof chrome.tabs;
}

/*
 * Browser Compatibility Notes:
 * - Chrome/Safari: Uses service workers via chrome.* API
 * - Firefox: Uses background scripts via browser.* API
 *
 * This script handles both environments by:
 * 1. Polyfilling the browser API for Chrome/Safari
 * 2. Using browser.* API consistently throughout the code
 * 3. Keeping message ports open for Firefox (return true in listeners)
 */

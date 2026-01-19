import {
  DEFAULT_CRITERIA,
  constructFullPrompt,
} from "./lib/constants";

// Polyfill for Firefox
if (typeof browser === "undefined") {
  (globalThis as any).browser = chrome;
}

// Models that support vision/image input
const VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
];

async function analyzeWithGroq(
  text: string,
  tweetId: string,
  images: string[] = []
): Promise<{
  tweetId: string;
  isBait: boolean;
  reason?: string;
  debugInfo?: { prompt: string; tweetText: string; images: string[]; rawResponse: string };
  error?: string;
}> {
  let fullPrompt = "";
  let rawResponse = "";

  try {
    console.log("Analyzing tweet:", { tweetId, text, imageCount: images.length });

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
    fullPrompt = constructFullPrompt(criteria);

    // Use selected model or fall back to default
    const model = selectedModel || "llama-3.3-70b-versatile";

    // Check if model supports vision and we have images
    const isVisionModel = VISION_MODELS.includes(model);
    const hasImages = images.length > 0;

    // Build user message content based on model capabilities
    let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

    if (isVisionModel && hasImages) {
      // Vision model with images - use multimodal format (send only first image for simplicity)
      userContent = [
        { type: "text", text: text || "Analyze this tweet image:" },
        {
          type: "image_url" as const,
          image_url: { url: images[0] },
        },
      ];
    } else {
      // Text-only
      userContent = text;
    }

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
              content: userContent,
            },
          ],
          temperature: 0,
          max_tokens: 100,
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
        debugInfo: { prompt: fullPrompt, tweetText: text, images, rawResponse: JSON.stringify(data) },
      };
    }

    rawResponse = data.choices[0].message.content;

    // Parse JSON response
    let isBait = false;
    let reason = "";

    try {
      // Try to extract JSON from response (handle potential extra text)
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        isBait = parsed.filter === true;
        reason = parsed.reason || "";
      } else {
        // Fallback: check if response contains "true" or "filter": true
        isBait = rawResponse.toLowerCase().includes('"filter": true') ||
                 rawResponse.toLowerCase().includes('"filter":true');
        reason = rawResponse;
      }
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      // Fallback to old logic
      isBait = rawResponse.toLowerCase().includes("true");
      reason = rawResponse;
    }

    return {
      tweetId,
      isBait,
      reason,
      debugInfo: { prompt: fullPrompt, tweetText: text, images, rawResponse },
    };
  } catch (error) {
    console.error("Error analyzing tweet:", error);
    return {
      tweetId,
      isBait: false,
      error: (error as Error).message || "Unknown error",
      debugInfo: { prompt: fullPrompt, tweetText: text, images, rawResponse },
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
      const images = request.content.images || [];

      // Continue with analysis...
      analyzeWithGroq(request.content.text, tweetId, images).then((result) => {
        console.log("Analysis result:", result);
        if (sender.tab && sender.tab.id) {
          browser.tabs.sendMessage(sender.tab.id, {
            action: "analysisResult",
            result: {
              tweetId,
              isBait: result.isBait,
              reason: result.reason,
              debugInfo: result.debugInfo,
              error: result.error || null,
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
    ...(selectedModel ? {} : { selectedModel: "llama-3.3-70b-versatile" }),
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

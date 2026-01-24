import { DEFAULT_CRITERIA } from "./lib/constants";
import { analyzeTweet, type AnalyzeResponse } from "./lib/api-service";

// Polyfill for Firefox
if (typeof browser === "undefined") {
  (globalThis as any).browser = chrome;
}

async function analyzeWithServer(
  text: string,
  tweetId: string,
  author: string,
  images: string[] = []
): Promise<{
  tweetId: string;
  isBait: boolean;
  reason?: string;
  debugInfo?: { tweetText: string; author: string; images: string[] };
  error?: string;
}> {
  try {
    console.log("Analyzing tweet:", { tweetId, text, imageCount: images.length });

    // Get criteria from sync storage
    const { promptCriteria } = await browser.storage.sync.get(["promptCriteria"]);

    console.log("Retrieved settings:", {
      hasCriteria: !!promptCriteria,
    });

    // Use the stored criteria or fall back to default
    const criteria = promptCriteria || DEFAULT_CRITERIA;

    // Call server API
    const result = await analyzeTweet({
      tweetText: text,
      tweetId,
      author,
      images,
      criteria,
    });

    // Check for error response
    if ("error" in result) {
      return {
        tweetId,
        isBait: false,
        error: result.error,
        debugInfo: { tweetText: text, author, images },
      };
    }

    const analysisResult = result as AnalyzeResponse;

    return {
      tweetId,
      isBait: analysisResult.filter,
      reason: analysisResult.reason,
      debugInfo: { tweetText: text, author, images },
    };
  } catch (error) {
    console.error("Error analyzing tweet:", error);
    return {
      tweetId,
      isBait: false,
      error: (error as Error).message || "Unknown error",
      debugInfo: { tweetText: text, author, images },
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
      const author = request.content.author || "";
      const images = request.content.images || [];

      // Continue with analysis...
      analyzeWithServer(request.content.text, tweetId, author, images).then((result) => {
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
  const { promptCriteria } = await browser.storage.sync.get(["promptCriteria"]);
  const defaults = {
    ...(promptCriteria ? {} : { promptCriteria: DEFAULT_CRITERIA }),
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

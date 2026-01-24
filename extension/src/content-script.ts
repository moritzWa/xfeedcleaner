import './index.css';
import {
    detectThreadConnector,
    getAllParentTweetContent,
    getTweetContent,
    getAllThreadTweets,
} from './tweet-extraction';
import {
    applyBlurEffect,
    hideTweet,
    addVerdictBadge,
} from './tweet-filter';
import { initSidebarRemover } from './sidebar-remover';

// Inject styles
const style = document.createElement('style');
style.textContent = `
  #xfeedcleaner * {
    all: unset;
  }

  #xfeedcleaner ul {
    list-style-type: disc !important;
    margin: 0 !important;
    padding-left: 20px !important;
  }

  #xfeedcleaner li {
  display: list-item !important;
    margin: 0.5em 0 !important;
  }

  #xfeedcleaner a {
    cursor: pointer;
  }

  #xfeedcleaner hr {
    height: 1px !important;
    border: none !important;
    padding: 0 !important;
    background-color: var(--black) !important;
  }
`;
document.head.appendChild(style);

const link = document.createElement('link');
link.type = 'text/css';
link.rel = 'stylesheet';
document.head.appendChild(link);

const showButtonStyle = document.createElement('style');
showButtonStyle.textContent = `
  .xfc-controls {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 1000;
  }

  .xfc-show-tweet-button {
    background-color: white;
    color: black;
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    cursor: pointer;
    font-family: system-ui;
  }

  .xfc-reasons {
    color: #666;
    font-size: 12px;
    text-align: center;
    white-space: nowrap;
    font-family: system-ui;
    background: rgba(255, 255, 255, 0.9);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .xfc-tweet-container {
    position: relative;
  }

  .xfc-tweet.hidden-tweet {
    display: none !important;
  }

  .xfc-verdict-card {
    position: fixed;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 8px;
    z-index: 9999;
    max-width: 220px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #e1e8ed;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
    pointer-events: auto;
  }

  /* Dark mode styles */
  .xfc-verdict-card.dark {
    background: rgba(32, 35, 39, 0.95);
    border-color: #38444d;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }

  .xfc-verdict-card .xfc-verdict-icon {
    font-weight: 600;
    margin-bottom: 5px;
  }

  .xfc-verdict-card.allowed .xfc-verdict-icon {
    color: #16a34a;
  }

  .xfc-verdict-card.filtered .xfc-verdict-icon {
    color: #dc2626;
  }

  .xfc-verdict-card.highlighted {
    border: 2px solid #16a34a;
    box-shadow: 0 1px 4px rgba(22, 163, 74, 0.2);
  }

  .xfc-verdict-card.highlighted.dark {
    border-color: #22c55e;
    box-shadow: 0 1px 4px rgba(34, 197, 94, 0.3);
  }

  .xfc-verdict-card.highlighted .xfc-verdict-icon {
    color: #16a34a;
  }

  .xfc-verdict-card .xfc-verdict-reason {
    color: #536471;
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 8px;
  }

  .xfc-verdict-card.dark .xfc-verdict-reason {
    color: #8b98a5;
  }

  .xfc-verdict-card .xfc-copy-debug {
    background: #f7f9fa;
    border: 1px solid #e1e8ed;
    border-radius: 5px;
    padding: 5px 8px;
    font-size: 12px;
    cursor: pointer;
    color: #536471;
    text-align: center;
    white-space: nowrap;
    flex: 1;
  }

  .xfc-verdict-card.dark .xfc-copy-debug {
    background: #2f3336;
    border-color: #38444d;
    color: #8b98a5;
  }

  .xfc-verdict-card .xfc-copy-debug:hover {
    background: #e8ebed;
  }

  .xfc-verdict-card.dark .xfc-copy-debug:hover {
    background: #3a3f42;
  }
`;
document.head.appendChild(showButtonStyle);

// Initialize sidebar remover
initSidebarRemover();

const DEBUG = true;

function debugLog(...args: unknown[]) {
    if (DEBUG) {
        console.log('[xfc]', ...args);
    }
}

// In-memory store for tweet connections
interface TweetConnection {
    element: Element;
    parentElement: Element | null;
    replyElement: Element | null;
}
const tweetConnections = new Map<string, TweetConnection>();

const tweetObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            const tweetElement = entry.target;

            // Only process tweets that are becoming visible
            if (entry.isIntersecting) {
                // Check if we've already processed this tweet
                if (!tweetElement.hasAttribute('data-processed')) {
                    const tweetContent = getTweetContent(tweetElement);

                    // Detect thread context
                    const threadInfo = detectThreadConnector(tweetElement);

                    // Store connector info for fallback detection by other tweets
                    if (threadInfo.hasConnectorBelow) {
                        tweetElement.setAttribute('data-has-connector-below', 'true');
                    }

                    debugLog('Tweet processed:', {
                        author: tweetContent.author,
                        text: tweetContent.text.slice(0, 50) + '...',
                        threadInfo
                    });

                    // If this is a reply (has connector above), get ALL parent context
                    // Include article text if present
                    let contextualText = tweetContent.text;
                    if (tweetContent.articleText) {
                        contextualText += ` [Article: ${tweetContent.articleText}]`;
                    }
                    if (threadInfo.hasConnectorAbove) {
                        const parentContents = getAllParentTweetContent(tweetElement);
                        if (parentContents.length > 0) {
                            contextualText = `${parentContents.join(' ')} [Reply @${tweetContent.author}: ${tweetContent.text}]`;
                            debugLog('Combined context:', contextualText.slice(0, 150) + '...', `(${parentContents.length} parents)`);
                        }
                    }

                    // Store connections in memory
                    const cellInner = tweetElement.closest('[data-testid="cellInnerDiv"]');
                    let parentElement: Element | null = null;
                    let replyElement: Element | null = null;

                    // Find parent tweet element if this is a reply
                    if (threadInfo.hasConnectorAbove && cellInner) {
                        const prevCell = cellInner.previousElementSibling;
                        if (prevCell?.getAttribute('data-testid') === 'cellInnerDiv') {
                            parentElement = prevCell.querySelector('[data-testid="tweet"]');
                        }
                    }

                    // Find reply tweet element if this has a reply below
                    if (threadInfo.hasConnectorBelow && cellInner) {
                        const nextCell = cellInner.nextElementSibling;
                        if (nextCell?.getAttribute('data-testid') === 'cellInnerDiv') {
                            replyElement = nextCell.querySelector('[data-testid="tweet"]');
                        }
                    }

                    // Store in Map
                    tweetConnections.set(tweetContent.id, {
                        element: tweetElement,
                        parentElement,
                        replyElement
                    });

                    // Also update the parent's replyElement to point to us (if parent was processed first)
                    if (parentElement) {
                        const parentId = parentElement.getAttribute('data-tweet-id');
                        if (parentId && tweetConnections.has(parentId)) {
                            const parentConnection = tweetConnections.get(parentId)!;
                            parentConnection.replyElement = tweetElement;
                        }
                    }

                    debugLog('Stored connection:', {
                        id: tweetContent.id,
                        hasParent: !!parentElement,
                        hasReply: !!replyElement,
                        images: tweetContent.images.length
                    });

                    // Skip analysis only if no text AND no images
                    const textToAnalyze = contextualText.trim();
                    const hasContent = textToAnalyze.length >= 5 || tweetContent.images.length > 0;

                    if (!hasContent) {
                        debugLog('Skipping tweet with no content:', tweetContent.id);
                    } else {
                        chrome.runtime.sendMessage({
                            action: 'newTweet',
                            content: {
                                ...tweetContent,
                                text: contextualText,
                                isReply: threadInfo.hasConnectorAbove,
                                hasReplyBelow: threadInfo.hasConnectorBelow,
                            },
                        });
                    }

                    // Mark as processed to avoid duplicate analysis
                    tweetElement.setAttribute('data-processed', 'true');
                }

                // Optionally, stop observing once processed
                tweetObserver.unobserve(tweetElement);
            }
        });
    },
    {
        // Configure the observer:
        threshold: 0.3, // Trigger when at least 30% of the tweet is visible
        rootMargin: '100px', // Start loading slightly before the tweet enters viewport
    }
);

const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
                const tweets = node.querySelectorAll(
                    '[data-testid="tweet"]:not([data-processed])'
                );
                tweets.forEach((tweet) => {
                    // Instead of analyzing immediately, start observing for visibility
                    tweetObserver.observe(tweet);
                });
            }
        });
    });
});

if (
    window.location.hostname === 'twitter.com' ||
    window.location.hostname === 'x.com'
) {
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Handle existing tweets
    const existingTweets = document.querySelectorAll(
        '[data-testid="tweet"]:not([data-processed])'
    );
    existingTweets.forEach((tweet) => {
        tweetObserver.observe(tweet);
    });
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'analysisResult') {
        const { tweetId, verdict, reason, debugInfo, error } = message.result;

        if (error) {
            console.error(`Error analyzing tweet ${tweetId}:`, error);
            return;
        }

        const tweetElement = document.querySelector(
            `[data-tweet-id="${tweetId}"]`
        );

        if (!tweetElement) return;

        // Always add verdict card showing the decision
        addVerdictBadge(tweetElement, verdict, reason, debugInfo);

        // Only apply blur/hide for filtered tweets
        if (verdict === 'filtered') {
            chrome.storage.sync.get(['displayMode'], (result) => {
                const displayMode = result.displayMode || 'blur';

                // Get ALL tweets in this thread chain
                const threadTweets = getAllThreadTweets(tweetElement);
                debugLog('Filtering thread:', {
                    tweetId,
                    threadSize: threadTweets.length,
                    reason
                });

                // Blur/hide the main tweet with reason and debug info
                if (displayMode === 'blur') {
                    applyBlurEffect(tweetElement, reason);
                } else {
                    hideTweet(tweetElement);
                }

                // Blur/hide all other tweets in the thread
                threadTweets.forEach((tweet) => {
                    if (tweet !== tweetElement) {
                        debugLog('Hiding thread tweet');
                        if (displayMode === 'blur') {
                            applyBlurEffect(tweet, 'Part of filtered thread');
                        } else {
                            hideTweet(tweet);
                        }
                    }
                });
            });
        }
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'toggleExtension') {
        if (!message.isEnabled) {
            // Remove all blur effects and show buttons when disabled
            document.querySelectorAll('.xfc-tweet').forEach((tweet) => {
                (tweet as HTMLElement).style.filter = 'none';
                tweet.classList.remove('xfc-tweet');
            });
            document
                .querySelectorAll('.xfc-show-tweet-button')
                .forEach((button) => {
                    button.remove();
                });
        }
    }
});

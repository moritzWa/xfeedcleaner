import './index.css';

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
`;
document.head.appendChild(showButtonStyle);

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

// Detect if a tweet has a thread connector (grey vertical line)
function detectThreadConnector(tweetElement: Element): {
    hasConnectorAbove: boolean;
    hasConnectorBelow: boolean;
} {
    const cellInner = tweetElement.closest('[data-testid="cellInnerDiv"]');
    if (!cellInner) {
        return { hasConnectorAbove: false, hasConnectorBelow: false };
    }

    let hasConnectorAbove = false;
    let hasConnectorBelow = false;

    const cellRect = cellInner.getBoundingClientRect();
    const tweetRect = tweetElement.getBoundingClientRect();

    // Look for narrow vertical elements that could be the connector line
    const allDivs = cellInner.querySelectorAll('div');

    for (const div of allDivs) {
        const rect = div.getBoundingClientRect();

        // Skip elements that aren't rendered
        if (rect.width === 0 || rect.height === 0) continue;

        // Connector line should be narrow (2-10px)
        if (rect.width > 10) continue;

        // Must be in the left portion (avatar column area)
        if (rect.left > tweetRect.left + 100) continue;

        // Check computed style for background color (the line has a grey background)
        const style = getComputedStyle(div);
        const bgColor = style.backgroundColor;

        // Skip transparent elements
        const isTransparent =
            bgColor === 'transparent' ||
            bgColor === 'rgba(0, 0, 0, 0)';

        if (isTransparent) continue;

        // The connector is INSIDE the cell (in the avatar column)
        const topThreshold = 25;
        const bottomThreshold = 15;

        // For "above" connector: can be very short, just needs to be near top of cell
        if (rect.top <= cellRect.top + topThreshold && rect.height >= 2) {
            hasConnectorAbove = true;
        }
        // For "below" connector: should be taller since it extends down
        if (rect.bottom >= cellRect.bottom - bottomThreshold && rect.height >= 15) {
            hasConnectorBelow = true;
        }
    }

    // FALLBACK: Check if previous cellInnerDiv's tweet has connector-below
    // If so, this tweet has a connector above (they're linked)
    if (!hasConnectorAbove) {
        const prevCell = cellInner.previousElementSibling;
        if (prevCell?.getAttribute('data-testid') === 'cellInnerDiv') {
            const prevTweet = prevCell.querySelector('[data-testid="tweet"]');
            if (prevTweet?.getAttribute('data-has-connector-below') === 'true') {
                hasConnectorAbove = true;
            }
        }
    }

    return { hasConnectorAbove, hasConnectorBelow };
}

// Get all parent tweets in a thread (walks up the entire chain)
function getAllParentTweetContent(tweetElement: Element): string[] {
    const parents: string[] = [];
    let currentCell = tweetElement.closest('[data-testid="cellInnerDiv"]');

    while (currentCell) {
        const prevCell = currentCell.previousElementSibling;
        if (!prevCell || prevCell.getAttribute('data-testid') !== 'cellInnerDiv') {
            break;
        }

        const parentTweet = prevCell.querySelector('[data-testid="tweet"]');
        if (!parentTweet) break;

        // Check if this parent has a connector below (meaning it's part of the thread)
        // First check stored attribute (more reliable), then fall back to visual detection
        let hasConnectorBelow = parentTweet.getAttribute('data-has-connector-below') === 'true';
        if (!hasConnectorBelow) {
            // Visual detection fallback
            const detected = detectThreadConnector(parentTweet);
            hasConnectorBelow = detected.hasConnectorBelow;
        }

        // Extract text from parent tweet
        const textEl = parentTweet.querySelector('[data-testid="tweetText"]');
        const authorEl = parentTweet.querySelector('[data-testid="User-Name"]');

        const text = textEl?.textContent?.trim() || '';
        const author = authorEl?.textContent?.split('·')[0]?.trim() || '';

        // Add to beginning of array (oldest first)
        parents.unshift(`[Thread @${author}: ${text}]`);

        // If this parent doesn't have a connector below, it's the thread root - stop here
        if (!hasConnectorBelow) break;

        currentCell = prevCell;
    }

    return parents;
}

// Get parent tweet content if this tweet is a reply in a thread (legacy, for single parent)
function getParentTweetContent(tweetElement: Element): string | null {
    const parents = getAllParentTweetContent(tweetElement);
    return parents.length > 0 ? parents[parents.length - 1] : null;
}

// Function to extract tweet content
function getTweetContent(tweetElement: Element): {
    text: string;
    author: string;
    images: string[];
    videos: string[];
    urls: string[];
    timestamp: string;
    metrics: {
        replies: string;
        reposts: string;
        likes: string;
        views: string;
    };
    id: string;
} {
    // console.log("Getting content for tweet element:", tweetElement);

    // Helper function to recursively find elements by data-testid
    function findElementsByTestId(element: Element, testId: string): Element[] {
        const results: Element[] = [];

        // Check current element
        if (element.getAttribute('data-testid') === testId) {
            results.push(element);
        }

        // Check children recursively
        element.childNodes.forEach((child) => {
            if (child instanceof Element) {
                results.push(...findElementsByTestId(child, testId));
            }
        });

        return results;
    }

    // Helper function to get text content from an element and its children
    function getTextContent(element: Element): string {
        let text = '';
        element.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent?.trim() + ' ';
            } else if (node instanceof Element) {
                text += getTextContent(node) + ' ';
            }
        });
        return text.trim();
    }

    // Find text content
    const textElements = findElementsByTestId(tweetElement, 'tweetText');
    const text = textElements
        .map((el) => getTextContent(el))
        .join(' ')
        .trim();

    // Find author
    const authorElements = findElementsByTestId(tweetElement, 'User-Name');
    const authorText = authorElements.map((el) => getTextContent(el)).join(' ');
    const author =
        authorText
            .split(/[·\n]/)
            .map((part) => part.trim())
            .filter((part) => part)[0] || '';

    // Find images - look for tweetPhoto containers first
    const images: string[] = [];
    const photoContainers = findElementsByTestId(tweetElement, 'tweetPhoto');
    // console.log("Found photo containers:", photoContainers);

    photoContainers.forEach((container) => {
        // Recursively find all img elements within the photo container
        const findImages = (element: Element) => {
            element.childNodes.forEach((child) => {
                if (child instanceof Element) {
                    if (child.tagName === 'IMG') {
                        const src = child.getAttribute('src');
                        // console.log("Found image in photo container:", { src });
                        if (src && !src.includes('profile')) {
                            const highQualitySrc = src.replace(
                                /\?format=\w+&name=\w+/,
                                '?format=jpg&name=large'
                            );
                            images.push(highQualitySrc);
                        }
                    }
                    findImages(child);
                }
            });
        };

        findImages(container);
    });

    // Find videos - look for video player containers
    const videos: string[] = [];
    const videoContainers = findElementsByTestId(tweetElement, 'videoPlayer');
    // console.log("Found video containers:", videoContainers);

    videoContainers.forEach((container) => {
        // Recursively find all video elements and sources
        const findVideos = (element: Element) => {
            element.childNodes.forEach((child) => {
                if (child instanceof Element) {
                    if (child.tagName === 'VIDEO') {
                        const src = child.getAttribute('src');
                        // console.log("Found video source:", { src });
                        if (src) videos.push(src);
                    }
                    // Also check for source elements within video
                    if (child.tagName === 'SOURCE') {
                        const src = child.getAttribute('src');
                        // console.log("Found video source element:", { src });
                        if (src) videos.push(src);
                    }
                    findVideos(child);
                }
            });
        };

        findVideos(container);
    });

    // Find URLs
    const urls: string[] = [];
    const allLinks = tweetElement.getElementsByTagName('a');
    Array.from(allLinks).forEach((link) => {
        const href = link.getAttribute('href');
        if (href?.startsWith('https://') && !href.includes('twitter.com')) {
            urls.push(href);
        }
    });

    // Find timestamp
    const timeElements = tweetElement.getElementsByTagName('time');
    const timestamp = timeElements[0]?.getAttribute('datetime') || '';

    // Find metrics
    const metrics = {
        replies: '0',
        reposts: '0',
        likes: '0',
        views: '0',
    };

    // Process metrics recursively
    const metricsMap = {
        reply: 'replies',
        retweet: 'reposts',
        like: 'likes',
        analytics: 'views',
    };

    Object.entries(metricsMap).forEach(([testId, metricKey]) => {
        const elements = findElementsByTestId(tweetElement, testId);
        if (elements.length > 0) {
            const value = getTextContent(elements[0]);
            if (value) {
                metrics[metricKey as keyof typeof metrics] = value;
            }
        }
    });

    const id = Math.random().toString(36).substring(7);
    tweetElement.setAttribute('data-tweet-id', id);

    const result = {
        text,
        author,
        images,
        videos,
        urls,
        timestamp,
        metrics,
        id,
    };

    // console.log("Final extracted content:", result);
    return result;
}

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
                    let contextualText = tweetContent.text;
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
                        hasReply: !!replyElement
                    });

                    chrome.runtime.sendMessage({
                        action: 'newTweet',
                        content: {
                            ...tweetContent,
                            text: contextualText,
                            isReply: threadInfo.hasConnectorAbove,
                            hasReplyBelow: threadInfo.hasConnectorBelow,
                        },
                    });

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

// Helper function to apply blur effect to a tweet
function applyBlurEffect(tweetElement: Element, reasons?: string[]) {
    // Skip if already blurred
    if (tweetElement.classList.contains('xfc-tweet')) return;

    // Add container for relative positioning
    const container = document.createElement('div');
    container.className = 'xfc-tweet-container';
    tweetElement.parentNode?.insertBefore(container, tweetElement);
    container.appendChild(tweetElement);

    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'xfc-controls';
    container.appendChild(controlsContainer);

    // Add the show button
    const showButton = document.createElement('button');
    showButton.className = 'xfc-show-tweet-button';
    showButton.textContent = 'Show';
    controlsContainer.appendChild(showButton);

    // Add filter reasons if available
    if (reasons && reasons.length > 0) {
        const reasonsEl = document.createElement('div');
        reasonsEl.className = 'xfc-reasons';
        reasonsEl.textContent = `Filtered: ${reasons.join(', ')}`;
        controlsContainer.appendChild(reasonsEl);
    }

    // Apply blur effect
    tweetElement.classList.add('xfc-tweet');
    (tweetElement as HTMLElement).style.filter = 'blur(12px)';

    // Add click handler for the show button
    showButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Remove blur effect
        (tweetElement as HTMLElement).style.filter = 'none';
        tweetElement.classList.remove('xfc-tweet');

        // Remove the controls container
        controlsContainer.remove();
    });
}

// Helper function to hide a tweet completely
function hideTweet(tweetElement: Element) {
    if (tweetElement.classList.contains('xfc-tweet')) return;
    tweetElement.classList.add('xfc-tweet', 'hidden-tweet');
}

// Get all tweets in a thread chain (walks both up and down)
function getAllThreadTweets(tweetElement: Element): Element[] {
    const allTweets: Element[] = [tweetElement];
    const cellInner = tweetElement.closest('[data-testid="cellInnerDiv"]');
    if (!cellInner) return allTweets;

    // Walk up to find all parent tweets
    let upCell: Element | null = cellInner;
    while (upCell) {
        const prevCell = upCell.previousElementSibling as Element | null;
        if (!prevCell || prevCell.getAttribute('data-testid') !== 'cellInnerDiv') break;

        const parentTweet = prevCell.querySelector('[data-testid="tweet"]');
        if (!parentTweet) break;

        // Check if connected via connector
        const hasConnectorBelow = parentTweet.getAttribute('data-has-connector-below') === 'true' ||
            detectThreadConnector(parentTweet).hasConnectorBelow;

        if (!hasConnectorBelow) break;

        allTweets.unshift(parentTweet);
        upCell = prevCell;
    }

    // Walk down to find all reply tweets
    let downCell: Element | null = cellInner;
    while (downCell) {
        const nextCell = downCell.nextElementSibling as Element | null;
        if (!nextCell || nextCell.getAttribute('data-testid') !== 'cellInnerDiv') break;

        const replyTweet = nextCell.querySelector('[data-testid="tweet"]');
        if (!replyTweet) break;

        // Check if connected via connector
        const { hasConnectorAbove } = detectThreadConnector(replyTweet);
        if (!hasConnectorAbove) break;

        allTweets.push(replyTweet);
        downCell = nextCell;
    }

    return allTweets;
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'analysisResult') {
        const { tweetId, isBait, error } = message.result;

        if (error) {
            console.error(`Error analyzing tweet ${tweetId}:`, error);
            return;
        }

        const tweetElement = document.querySelector(
            `[data-tweet-id="${tweetId}"]`
        );

        if (tweetElement && isBait) {
            chrome.storage.sync.get(['displayMode'], (result) => {
                const displayMode = result.displayMode || 'blur';

                // Get ALL tweets in this thread chain
                const threadTweets = getAllThreadTweets(tweetElement);
                debugLog('Filtering thread:', {
                    tweetId,
                    threadSize: threadTweets.length
                });

                // Blur/hide the main tweet with reasons
                if (displayMode === 'blur') {
                    applyBlurEffect(tweetElement, message.result.reasons);
                } else {
                    hideTweet(tweetElement);
                }

                // Blur/hide all other tweets in the thread
                threadTweets.forEach((tweet) => {
                    if (tweet !== tweetElement) {
                        debugLog('Hiding thread tweet');
                        if (displayMode === 'blur') {
                            applyBlurEffect(tweet, ['thread filtered']);
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

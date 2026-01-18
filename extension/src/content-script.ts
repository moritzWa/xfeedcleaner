import './index.css';

const style = document.createElement('style');
style.textContent = `
  #unbaited * {
    all: unset;
  }

  #unbaited ul {
    list-style-type: disc !important;
    margin: 0 !important;
    padding-left: 20px !important;
  }

  #unbaited li {
  display: list-item !important;
    margin: 0.5em 0 !important;
  }

  #unbaited a {
    cursor: pointer;
  }

  #unbaited hr {
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
  .unbaited-controls {
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

  .unbaited-show-tweet-button {
    background-color: white;
    color: black;
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    cursor: pointer;
    font-family: system-ui;
  }

  .unbaited-reasons {
    color: #666;
    font-size: 12px;
    text-align: center;
    white-space: nowrap;
    font-family: system-ui;
    background: rgba(255, 255, 255, 0.9);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .unbaited-tweet-container {
    position: relative;
  }

  .unbaited-tweet.hidden-tweet {
    display: none !important;
  }
`;
document.head.appendChild(showButtonStyle);

const DEBUG = true;

function debugLog(...args: unknown[]) {
    if (DEBUG) {
        console.log('[unbaited]', ...args);
    }
}

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

// Get parent tweet content if this tweet is a reply in a thread
function getParentTweetContent(tweetElement: Element): string | null {
    const cellInner = tweetElement.closest('[data-testid="cellInnerDiv"]');
    if (!cellInner) return null;

    // Get previous sibling cellInnerDiv
    const prevCell = cellInner.previousElementSibling;
    if (!prevCell || prevCell.getAttribute('data-testid') !== 'cellInnerDiv') {
        return null;
    }

    const parentTweet = prevCell.querySelector('[data-testid="tweet"]');
    if (!parentTweet) return null;

    // Extract text from parent tweet
    const textEl = parentTweet.querySelector('[data-testid="tweetText"]');
    const authorEl = parentTweet.querySelector('[data-testid="User-Name"]');

    const text = textEl?.textContent?.trim() || '';
    const author = authorEl?.textContent?.split('·')[0]?.trim() || '';

    return `[Parent @${author}: ${text}]`;
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
                    debugLog('Tweet processed:', {
                        author: tweetContent.author,
                        text: tweetContent.text.slice(0, 50) + '...',
                        threadInfo
                    });

                    // If this is a reply (has connector above), get parent context
                    let contextualText = tweetContent.text;
                    if (threadInfo.hasConnectorAbove) {
                        const parentContent = getParentTweetContent(tweetElement);
                        if (parentContent) {
                            contextualText = `${parentContent} [Reply @${tweetContent.author}: ${tweetContent.text}]`;
                            debugLog('Combined context:', contextualText.slice(0, 100) + '...');
                        }
                    }

                    // Store thread info on element for later use when filtering
                    tweetElement.setAttribute('data-has-connector-above', String(threadInfo.hasConnectorAbove));
                    tweetElement.setAttribute('data-has-connector-below', String(threadInfo.hasConnectorBelow));

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
    if (tweetElement.classList.contains('unbaited-tweet')) return;

    // Add container for relative positioning
    const container = document.createElement('div');
    container.className = 'unbaited-tweet-container';
    tweetElement.parentNode?.insertBefore(container, tweetElement);
    container.appendChild(tweetElement);

    // Create controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'unbaited-controls';
    container.appendChild(controlsContainer);

    // Add the show button
    const showButton = document.createElement('button');
    showButton.className = 'unbaited-show-tweet-button';
    showButton.textContent = 'Show';
    controlsContainer.appendChild(showButton);

    // Add filter reasons if available
    if (reasons && reasons.length > 0) {
        const reasonsEl = document.createElement('div');
        reasonsEl.className = 'unbaited-reasons';
        reasonsEl.textContent = `Filtered: ${reasons.join(', ')}`;
        controlsContainer.appendChild(reasonsEl);
    }

    // Apply blur effect
    tweetElement.classList.add('unbaited-tweet');
    (tweetElement as HTMLElement).style.filter = 'blur(12px)';

    // Add click handler for the show button
    showButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Remove blur effect
        (tweetElement as HTMLElement).style.filter = 'none';
        tweetElement.classList.remove('unbaited-tweet');

        // Remove the controls container
        controlsContainer.remove();
    });
}

// Helper function to hide a tweet completely
function hideTweet(tweetElement: Element) {
    if (tweetElement.classList.contains('unbaited-tweet')) return;
    tweetElement.classList.add('unbaited-tweet', 'hidden-tweet');
}

// Helper function to get parent tweet (if this tweet has connector above)
function getParentTweetElement(tweetElement: Element): Element | null {
    const cellInner = tweetElement.closest('[data-testid="cellInnerDiv"]');
    if (!cellInner) return null;

    const prevCell = cellInner.previousElementSibling;
    if (!prevCell || prevCell.getAttribute('data-testid') !== 'cellInnerDiv') {
        return null;
    }

    return prevCell.querySelector('[data-testid="tweet"]');
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

                // Debug: log the connector attributes
                const hasConnectorAbove = tweetElement.getAttribute('data-has-connector-above');
                const hasConnectorBelow = tweetElement.getAttribute('data-has-connector-below');
                debugLog('Filtering tweet:', {
                    tweetId,
                    hasConnectorAbove,
                    hasConnectorBelow
                });

                if (displayMode === 'blur') {
                    applyBlurEffect(tweetElement, message.result.reasons);
                } else {
                    hideTweet(tweetElement);
                }

                // If this tweet has a connector above (it's a reply), also hide the parent
                if (hasConnectorAbove === 'true') {
                    debugLog('Tweet has connector above, looking for parent...');
                    const parentTweet = getParentTweetElement(tweetElement);
                    debugLog('Parent tweet found:', !!parentTweet);
                    if (parentTweet) {
                        debugLog('Hiding parent tweet because reply was filtered');
                        if (displayMode === 'blur') {
                            applyBlurEffect(parentTweet, ['thread filtered']);
                        } else {
                            hideTweet(parentTweet);
                        }
                    }
                }

                // If this tweet has a connector below (it's a parent), also hide the reply
                if (hasConnectorBelow === 'true') {
                    debugLog('Tweet has connector below, looking for reply...');
                    const cellInner = tweetElement.closest('[data-testid="cellInnerDiv"]');
                    const nextCell = cellInner?.nextElementSibling;
                    debugLog('Next cell found:', !!nextCell, nextCell?.getAttribute('data-testid'));
                    if (nextCell?.getAttribute('data-testid') === 'cellInnerDiv') {
                        const replyTweet = nextCell.querySelector('[data-testid="tweet"]');
                        debugLog('Reply tweet found:', !!replyTweet);
                        if (replyTweet) {
                            debugLog('Hiding reply tweet because parent was filtered');
                            if (displayMode === 'blur') {
                                applyBlurEffect(replyTweet, ['thread filtered']);
                            } else {
                                hideTweet(replyTweet);
                            }
                        }
                    }
                }
            });
        }
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'toggleExtension') {
        if (!message.isEnabled) {
            // Remove all blur effects and show buttons when disabled
            document.querySelectorAll('.unbaited-tweet').forEach((tweet) => {
                (tweet as HTMLElement).style.filter = 'none';
                tweet.classList.remove('unbaited-tweet');
            });
            document
                .querySelectorAll('.unbaited-show-tweet-button')
                .forEach((button) => {
                    button.remove();
                });
        }
    }
});

// Tweet content extraction and thread detection

// Detect if a tweet has a thread connector (grey vertical line)
export function detectThreadConnector(tweetElement: Element): {
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
export function getAllParentTweetContent(tweetElement: Element): string[] {
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

// Helper function to recursively find elements by data-testid
function findElementsByTestId(element: Element, testId: string): Element[] {
    const results: Element[] = [];

    if (element.getAttribute('data-testid') === testId) {
        results.push(element);
    }

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

export interface TweetContent {
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
    articleText: string;
    cardText: string; // URL card preview content (title, domain)
}

// Function to extract tweet content
export function getTweetContent(tweetElement: Element): TweetContent {
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

    photoContainers.forEach((container) => {
        const findImages = (element: Element) => {
            element.childNodes.forEach((child) => {
                if (child instanceof Element) {
                    if (child.tagName === 'IMG') {
                        const src = child.getAttribute('src');
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

    videoContainers.forEach((container) => {
        const findVideos = (element: Element) => {
            element.childNodes.forEach((child) => {
                if (child instanceof Element) {
                    if (child.tagName === 'VIDEO') {
                        const src = child.getAttribute('src');
                        if (src) videos.push(src);
                    }
                    if (child.tagName === 'SOURCE') {
                        const src = child.getAttribute('src');
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

    // Find article content (X articles have title and description)
    let articleText = '';
    const articleCoverImages = findElementsByTestId(tweetElement, 'article-cover-image');
    if (articleCoverImages.length > 0) {
        const coverImage = articleCoverImages[0];
        const parentContainer = coverImage.parentElement;
        if (parentContainer) {
            const siblings = Array.from(parentContainer.children);
            const coverIndex = siblings.indexOf(coverImage);

            for (let i = coverIndex + 1; i < siblings.length; i++) {
                const sibling = siblings[i];
                const siblingText = getTextContent(sibling);
                if (siblingText) {
                    articleText += siblingText + ' ';
                }
            }
        }
        articleText = articleText.trim();
    }

    // Find URL card content (link previews with title and domain)
    let cardText = '';
    const cardWrappers = findElementsByTestId(tweetElement, 'card.wrapper');
    if (cardWrappers.length > 0) {
        const cardWrapper = cardWrappers[0];
        // Get all text from the card (title, domain, description)
        cardText = getTextContent(cardWrapper).trim();
    }

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

    return {
        text,
        author,
        images,
        videos,
        urls,
        timestamp,
        metrics,
        id,
        articleText,
        cardText,
    };
}

// Get all tweets in a thread chain (walks both up and down)
export function getAllThreadTweets(tweetElement: Element): Element[] {
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

        const { hasConnectorAbove } = detectThreadConnector(replyTweet);
        if (!hasConnectorAbove) break;

        allTweets.push(replyTweet);
        downCell = nextCell;
    }

    return allTweets;
}

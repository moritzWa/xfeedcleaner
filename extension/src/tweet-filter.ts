// Tweet filtering UI - blur, hide, and verdict cards

export interface DebugInfo {
    prompt: string;
    tweetText: string;
    author: string;
    images: string[];
    rawResponse: string;
}

// Helper function to apply blur effect to a tweet
export function applyBlurEffect(
    tweetElement: Element,
    reason?: string,
) {
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

    // Add filter reason if available
    if (reason) {
        const reasonsEl = document.createElement('div');
        reasonsEl.className = 'xfc-reasons';
        reasonsEl.textContent = reason;
        controlsContainer.appendChild(reasonsEl);
    }

    // Apply blur effect
    tweetElement.classList.add('xfc-tweet');
    (tweetElement as HTMLElement).style.filter = 'blur(20px)';

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
export function hideTweet(tweetElement: Element) {
    if (tweetElement.classList.contains('xfc-tweet')) return;
    tweetElement.classList.add('xfc-tweet', 'hidden-tweet');
}

// Detect if Twitter is in dark mode
function isDarkMode(): boolean {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    // Parse RGB values - dark mode has low RGB values
    const match = bodyBg.match(/\d+/g);
    if (match) {
        const [r, g, b] = match.map(Number);
        // If average brightness is below 128, it's dark mode
        return (r + g + b) / 3 < 128;
    }
    return false;
}

// Add a verdict card floating to the right of the tweet
export function addVerdictBadge(
    tweetElement: Element,
    isFiltered: boolean,
    reason: string,
    debugInfo?: DebugInfo
) {
    // Skip if already has a card (check via data attribute since card is not a child)
    const article = tweetElement.closest('article');
    if (!article || article.hasAttribute('data-xfc-verdict')) return;
    article.setAttribute('data-xfc-verdict', 'true');

    const darkMode = isDarkMode();
    const card = document.createElement('div');
    card.className = `xfc-verdict-card ${isFiltered ? 'filtered' : 'allowed'}${darkMode ? ' dark' : ''}`;

    // Build card content
    const iconDiv = document.createElement('div');
    iconDiv.className = 'xfc-verdict-icon';
    iconDiv.textContent = isFiltered ? '✗ Filtered' : '✓ Allowed';
    card.appendChild(iconDiv);

    const reasonDiv = document.createElement('div');
    reasonDiv.className = 'xfc-verdict-reason';
    reasonDiv.textContent = reason || 'analyzed';
    card.appendChild(reasonDiv);

    // Add copy buttons if debug info available
    if (debugInfo) {
        // Button container for side-by-side layout
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '4px';

        // Copy Tweet button - tweet content + AI decision
        const copyTweetBtn = document.createElement('button');
        copyTweetBtn.className = 'xfc-copy-debug';
        copyTweetBtn.textContent = '📝 Tweet';
        copyTweetBtn.title = 'Copy tweet + AI decision';
        copyTweetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const imagesSection = debugInfo.images.length > 0
                ? `\nImages: ${debugInfo.images.length}`
                : '';
            const decision = isFiltered ? 'FILTERED' : 'ALLOWED';
            const tweetContent = `@${debugInfo.author}: ${debugInfo.tweetText}${imagesSection}\n\nAI Decision: ${decision} - "${reason}"`;
            navigator.clipboard.writeText(tweetContent).then(() => {
                copyTweetBtn.textContent = '✓';
                setTimeout(() => {
                    copyTweetBtn.textContent = '📝 Tweet';
                }, 1500);
            });
        });
        btnContainer.appendChild(copyTweetBtn);

        // Copy Debug button - full debug info
        const copyDebugBtn = document.createElement('button');
        copyDebugBtn.className = 'xfc-copy-debug';
        copyDebugBtn.textContent = '🔧 Debug';
        copyDebugBtn.title = 'Copy full debug info';
        copyDebugBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const imagesSection = debugInfo.images.length > 0
                ? `\nIMAGES SENT (${debugInfo.images.length}):\n${debugInfo.images.join('\n')}\n`
                : '\nIMAGES SENT: none\n';

            const debugText = `FILTER DECISION: ${isFiltered ? 'FILTERED' : 'ALLOWED'}
REASON: ${reason}

PROMPT SENT:
${debugInfo.prompt}

TWEET TEXT SENT:
@${debugInfo.author}: ${debugInfo.tweetText}
${imagesSection}
MODEL RESPONSE:
${debugInfo.rawResponse}
`;
            navigator.clipboard.writeText(debugText).then(() => {
                copyDebugBtn.textContent = '✓';
                setTimeout(() => {
                    copyDebugBtn.textContent = '🔧 Debug';
                }, 1500);
            });
        });
        btnContainer.appendChild(copyDebugBtn);

        card.appendChild(btnContainer);
    }

    // Append card to body and position it next to the tweet
    document.body.appendChild(card);

    // Position update function
    const updatePosition = () => {
        const rect = article.getBoundingClientRect();
        card.style.top = `${rect.top + 8}px`;
        card.style.left = `${rect.right + 12}px`;
    };

    // Initial position
    updatePosition();

    // Update on scroll (use passive listener for performance)
    const scrollHandler = () => requestAnimationFrame(updatePosition);
    window.addEventListener('scroll', scrollHandler, { passive: true });

    // Clean up when article is removed from DOM
    const observer = new MutationObserver(() => {
        if (!document.contains(article)) {
            card.remove();
            window.removeEventListener('scroll', scrollHandler);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

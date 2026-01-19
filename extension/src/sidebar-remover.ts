// Sidebar junk remover - hides Premium upsells, Trending, Who to follow

// Hide sidebar junk modules
function hideSidebarJunk() {
    const sidebar = document.querySelector('[data-testid="sidebarColumn"]');
    if (!sidebar) return;

    // Selectors for junk modules to hide
    const junkSelectors = [
        '[data-testid="renew-subscription-module"]', // Premium renewal
        '[aria-label="Subscribe to Premium"]', // Premium upsell
        '[aria-label="Trending"]', // Today's News / Trending
        '[aria-label="Who to follow"]', // Who to follow
    ];

    junkSelectors.forEach(selector => {
        const module = sidebar.querySelector(selector);
        if (module) {
            // Find the parent container that holds the module
            let container: Element | null = module.closest('[data-testid="sidebarColumn"] > div > div > div');
            if (!container) {
                container = module.parentElement?.parentElement?.parentElement || null;
            }
            if (container && container instanceof HTMLElement) {
                container.style.display = 'none';
            }
        }
    });

    // Also hide any "Get Verified" or subscription prompts
    sidebar.querySelectorAll('aside, [role="complementary"]').forEach(aside => {
        const text = aside.textContent?.toLowerCase() || '';
        if (text.includes('premium') || text.includes('subscribe') || text.includes('verified')) {
            if (aside instanceof HTMLElement) {
                aside.style.display = 'none';
            }
        }
    });
}

// Run sidebar cleanup on page load and watch for changes
const sidebarObserver = new MutationObserver(() => {
    hideSidebarJunk();
});

// Initialize sidebar remover
export function initSidebarRemover() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            hideSidebarJunk();
            sidebarObserver.observe(document.body, { childList: true, subtree: true });
        });
    } else {
        hideSidebarJunk();
        sidebarObserver.observe(document.body, { childList: true, subtree: true });
    }
}

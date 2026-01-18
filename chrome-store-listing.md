# Chrome Web Store Listing

## Extension Name

**XFeedCleaner - AI Twitter/X Feed Filter**

Includes key SEO terms: X, Twitter, Feed, Filter, AI (39 chars, under 75 limit)

---

## Short Description (132 character limit)

Filter boring tweets with AI. Customize what to hide: politics, engagement bait, low-effort posts. Clean X feed in seconds. (124 chars)

---

## Detailed Description

TAKE CONTROL OF YOUR X/TWITTER FEED WITH AI

Tired of scrolling through engagement bait, political rants, and low-effort content? XFeedCleaner uses AI to analyze tweets in real-time and hides the content you don't want to see.

HOW IT WORKS:

🔍 REAL-TIME AI ANALYSIS
As you scroll, the extension analyzes each tweet using Groq's ultra-fast AI. Tweets matching your filter criteria get blurred instantly.

✏️ FULLY CUSTOMIZABLE FILTERS
Define exactly what you want to hide:
• Political content and ideological debates
• Engagement bait ("hot takes", "agree or disagree?")
• Low-effort replies (emoji-only, "lol", "+1")
• Shallow social commentary and poll-style posts
• Off-topic promotions and announcements
• Or write your own custom criteria

🧵 THREAD-AWARE FILTERING
When a reply gets filtered, the parent tweet is also hidden. No more orphaned tweets or confusing partial conversations.

👁️ ONE-CLICK REVEAL
Curious what was hidden? Click to reveal any filtered tweet instantly. You're always in control.

⚡ LIGHTNING FAST
Powered by Groq's API - tweets are analyzed in milliseconds. No lag, no waiting.

🔒 PRIVACY FIRST
Your API key stays local. Tweet content is only sent to Groq for analysis - we never see or store your data.

GETTING STARTED:
1. Get a free API key from console.groq.com
2. Enter your key in extension settings
3. Customize your filter criteria
4. Enjoy a cleaner X feed

COMING SOON:
📸 Image analysis - Filter based on image content, not just text
🚀 Hosted mode - No API key needed (optional)
👎 Quick "Not Interested" - One-click to add new filter categories
🔄 Reverse mode - See only filtered tweets to tune your settings

PERFECT FOR:
• Professionals who want signal over noise
• Anyone avoiding political content online
• Users tired of engagement bait and rage farming
• People who value their time and attention

No tracking. No ads. Just a cleaner feed.

---

## Screenshots Captions

1. "Filtered tweets are blurred - click to reveal anytime"
2. "Customize exactly what content to filter"
3. "Choose from multiple fast AI models"
4. "Thread-aware: parent and reply filtered together"
5. "Clean, distraction-free browsing experience"

---

## Category

**Primary:** Productivity

---

## Single Purpose Description

Filter tweets on X/Twitter using AI analysis. The extension analyzes tweet content and blurs posts matching user-defined criteria (engagement bait, political content, low-effort replies, etc.).

---

## Permission Justifications

### Storage Permission
**Why needed:** To save user preferences including API key, filter criteria, selected AI model, and enabled/disabled state. All settings sync across devices using Chrome's sync storage.

### Host Permissions (x.com, twitter.com)
**Why needed:** The content script must run on X/Twitter pages to detect tweets as they appear in the viewport, apply blur effects to filtered content, and inject the reveal UI. Without this permission, the extension cannot interact with the X/Twitter feed.

### Host Permission (api.groq.com)
**Why needed:** To send tweet text to Groq's AI API for content analysis. The service worker makes API calls to determine if tweets match the user's filter criteria. This is the core functionality of the extension.

### Service Worker (Background)
**Why needed:** The service worker handles communication between the content script and Groq's API. When a new tweet is detected, the content script sends a message to the service worker, which then calls the Groq API and returns the analysis result. This architecture keeps API keys secure (not exposed in content scripts) and allows for efficient request handling.

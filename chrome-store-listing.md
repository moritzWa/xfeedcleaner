# Chrome Web Store Listing

## Extension Name

**Chirply - X Feed Cleaner**

Bird-themed name + clear purpose. SEO terms: X, Feed, Cleaner (29 chars, under 75 limit)

---

## Short Description (132 character limit)

AI-powered Twitter/X feed filter. Hide engagement bait, politics, and low-effort posts. Highlight the best content. (114 chars)

---

## Detailed Description

TAKE CONTROL OF YOUR X/TWITTER FEED WITH AI

Tired of scrolling through engagement bait, political rants, and low-effort content? Chirply uses AI to analyze tweets in real-time and filters the content you don't want to see.

HOW IT WORKS:

🔍 REAL-TIME AI ANALYSIS
As you scroll, Chirply analyzes each tweet using fast AI. Tweets matching your filter criteria get blurred instantly.

⚡ THREE-TIER CLASSIFICATION
• FILTER - Hide engagement bait, politics, low-effort posts
• ALLOW - Keep tech, startups, finance, intellectual discussion
• HIGHLIGHT - Surface the most interesting, discussion-worthy tweets

✏️ FULLY CUSTOMIZABLE FILTERS
Define exactly what you want to filter, allow, or highlight:
• Political content and ideological debates
• Engagement bait ("hot takes", "agree or disagree?")
• Low-effort replies (emoji-only, "lol", "+1")
• Vapid musings and trend-riding
• Or write your own custom criteria

🧵 THREAD-AWARE FILTERING
When a reply gets filtered, the parent tweet is also hidden. No more orphaned tweets or confusing partial conversations.

👁️ ONE-CLICK REVEAL
Curious what was hidden? Click to reveal any filtered tweet instantly. You're always in control.

⚡ LIGHTNING FAST
Powered by Groq's API - tweets are analyzed in milliseconds. No lag, no waiting.

🔒 NO API KEY NEEDED
Just install and go. No setup required.

PERFECT FOR:
• Professionals who want signal over noise
• Anyone avoiding political content online
• Users tired of engagement bait and rage farming
• People who value their time and attention

No tracking. No ads. Just a cleaner feed.

---

## Screenshots Captions

1. "Filtered tweets are blurred - click to reveal anytime"
2. "Customize exactly what content to filter, allow, or highlight"
3. "Highlighted tweets get a green border for easy discovery"
4. "Thread-aware: parent and reply filtered together"
5. "Clean, distraction-free browsing experience"

---

## Category

**Primary:** Productivity

---

## Single Purpose Description

Filter tweets on X/Twitter using AI analysis. The extension analyzes tweet content and classifies posts as filtered (hidden), allowed (shown), or highlighted (emphasized) based on user-defined criteria.

---

## Permission Justifications

### Storage Permission
**Why needed:** To save user preferences including filter criteria, display mode, and enabled/disabled state. All settings sync across devices using Chrome's sync storage.

### Host Permissions (x.com, twitter.com)
**Why needed:** The content script must run on X/Twitter pages to detect tweets as they appear in the viewport, apply blur effects to filtered content, and inject the reveal UI. Without this permission, the extension cannot interact with the X/Twitter feed.

### Service Worker (Background)
**Why needed:** The service worker handles communication between the content script and the AI backend. When a new tweet is detected, the content script sends a message to the service worker, which then calls the API and returns the analysis result.

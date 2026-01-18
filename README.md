# XFeedCleaner

A Chrome extension that helps you filter out boring, sloppy, and uninteresting content from your X (formerly Twitter) feed using AI.

Fork of [danielpetho/unbaited](https://github.com/danielpetho/unbaited) with improvements.

## Features

- **Customizable filters** - define your own criteria for what content to hide
- **Thread context awareness** - when a reply is filtered, the parent tweet is also hidden to avoid orphaned content
- **One-click reveal** - easily see what was hidden if you're curious
- **Multiple LLM models** - choose from different Groq models based on speed/quality tradeoff

## Planned Features

- **Image support**: Analyze images in tweets using a vision model. Currently only text is analyzed.
- **Hosted proxy server**: Add a server as a proxy to the LLM API, so users don't need to manage their own API key.
- **Quick "Not Interested" button**: Click a button on any tweet to have an LLM analyze what it's about and automatically add that category to your filter criteria.
- **Reverse mode**: Toggle to only show filtered tweets. Useful for validating and tuning your prompt.

## How it works

The extension uses Groq's ultra-fast API to analyze tweets using a model of your choice. When you scroll through X, it:

1. Detects new tweets as they appear in your viewport
2. Sends the tweet content to Groq's API for analysis
3. Blurs tweets that match your filter criteria (engagement bait, politics, low-effort content, etc.)
4. Gives you the option to reveal hidden tweets with a single click

## Installation

1. Install the extension from the [Chrome Web Store](https://chromewebstore.google.com/detail/unbaited-prototype/bpbnggihcaknipcgbpgjgfhgmdgcokcg)
2. Get your API key from [Groq](https://console.groq.com)
3. Open the extension settings and enter your API key
4. Optionally customize the system prompt to adjust how tweets are analyzed

## Development

The project consists of two parts:
- `extension/`: The Chrome extension
- `landing/`: The landing page built with Next.js

### Extension Development

```bash
cd extension
npm i
npm run build
```

Load the `extension/dist` directory as an unpacked extension:
1. Open Chrome
2. Go to Extensions page
3. Enable Developer Mode
4. Click "Load unpacked" and select the `extension/dist` directory

import Link from "next/link";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/unbaited-prototype/bpbnggihcaknipcgbpgjgfhgmdgcokcg";

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12 font-mono lowercase">
      <div className="flex flex-col items-center">
        <h1 className="text-4xl font-bold">XFeedCleaner</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 text-center mt-4">
          Filter boring and sloppy content from your X feed
        </p>
      </div>

      <div className="flex justify-center mt-8">
        <a
          href={CHROME_STORE_URL}
          className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Add to Chrome
        </a>
      </div>

      <div className="space-y-8 mb-12 mt-8">
        <section>
          <h2 className="text-2xl font-bold mb-4">What is this?</h2>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            XFeedCleaner is a Chrome extension that helps you filter out
            content you don&apos;t want to see on X (formerly Twitter). It uses
            AI to analyze tweets in real-time and hides boring, low-effort,
            engagement bait, and off-topic content so you can focus on what
            actually interests you.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">How it works</h2>
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <p>
              The extension uses Groq&apos;s ultra-fast API to analyze tweets
              using an LLM of your choice. When you scroll through X, it:
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Detects new tweets as they appear in your viewport</li>
              <li>Sends the tweet content to Groq&apos;s API for analysis</li>
              <li>
                Blurs tweets that match your filter criteria (engagement bait,
                politics, low-effort content, etc.)
              </li>
              <li>
                Gives you the option to reveal hidden tweets with a single click
              </li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Features</h2>
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Customizable filters</strong> - define your own criteria
                for what content to hide
              </li>
              <li>
                <strong>Thread-aware filtering</strong> - when a reply is
                filtered, the parent tweet is also hidden to avoid orphaned
                content
              </li>
              <li>
                <strong>One-click reveal</strong> - easily see what was hidden
                if you&apos;re curious
              </li>
              <li>
                <strong>Multiple LLM models</strong> - choose from different
                Groq models based on speed/quality tradeoff
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
          <div className="space-y-4 text-gray-600 dark:text-gray-400">
            <p>To use the extension, you&apos;ll need:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                A free{" "}
                <a
                  href="https://console.groq.com"
                  className="text-black dark:text-white underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Groq API key
                </a>
              </li>
            </ul>
            <p>
              You can customize the system prompts to adjust how tweets are
              analyzed, making the extension work according to your preferences.
            </p>
          </div>
        </section>

        <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
          Read the{" "}
          <Link href="/privacy" className="underline">
            privacy policy
          </Link>{" "}
          to learn how your data is handled.
        </p>
      </div>
    </main>
  );
}

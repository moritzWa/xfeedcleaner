export interface AnalyzeResponse {
  filter: boolean;
  reason: string;
}

export interface AnalyzeRequest {
  tweetText: string;
  tweetId: string;
  author?: string;
  images?: string[];
  criteria?: string;
}

const API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:8000/analyze'
  : 'https://unbaited.moritzwa.deno.dev/analyze';

console.log('🔗 API_URL:', API_URL, '(NODE_ENV:', process.env.NODE_ENV, ')');

const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 5; // For serverless cold starts

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function analyzeTweet(
  request: AnalyzeRequest
): Promise<AnalyzeResponse | { error: string }> {
  let lastError: Error | null = null;

  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `🤖 Analysis attempt ${attempt}/${MAX_RETRIES} for tweet ${request.tweetId}`
      );

      const response = await fetchWithTimeout(
        API_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        },
        REQUEST_TIMEOUT
      );

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.log(`❌ Server error (${response.status}):`, errorText);
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Analysis successful:`, data);
      return data;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log(`⏱️ Request timeout (attempt ${attempt}/${MAX_RETRIES})`);
        } else if (error.message.includes('Failed to fetch')) {
          console.log(
            `🌐 Network error - likely serverless cold start (attempt ${attempt}/${MAX_RETRIES}):`,
            error.message
          );
        } else {
          console.log(
            `❌ Analysis error (attempt ${attempt}/${MAX_RETRIES}):`,
            error.message
          );
        }
      }

      // Don't retry on last attempt
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 1s → 2s → 4s → 8s
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms... (exponential backoff)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  console.error(`💥 All ${MAX_RETRIES} attempts failed. Last error:`, lastError);

  let errorMessage = 'Failed to connect to analysis service.';
  if (lastError?.name === 'AbortError') {
    errorMessage = 'Request timed out after multiple attempts. Please try again.';
  } else if (lastError?.message.includes('Failed to fetch')) {
    errorMessage = 'Network error - server may be starting up. Please try again in a moment.';
  }

  return { error: errorMessage };
}

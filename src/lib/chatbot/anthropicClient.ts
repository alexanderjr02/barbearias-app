import Anthropic from "@anthropic-ai/sdk";

// One place to build the Anthropic client with production-grade resilience:
// - `maxRetries`: auto-retries transient failures (429 rate limit, 5xx, 529
//   overloaded, network blips) with exponential backoff, so a momentary hiccup
//   doesn't break the chat.
// - `timeout`: a hard cap so a hung request never leaves the user waiting
//   forever — it throws instead, and every caller has a graceful fallback
//   (canned/simulated reply).
export function getAnthropic(): Anthropic {
  return new Anthropic({ maxRetries: 3, timeout: 45_000 });
}

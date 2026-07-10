// Small helpers for the chat widgets (AdminChatbot, ChatbotWidget, ClientChatbot,
// LandingChatbot). Message IDs and simulated typing delays don't need to be
// truly random/time-based — pulling Math.random()/Date.now() out of the
// component body keeps those components' render output pure.

let messageIdCounter = 0;

export function nextMessageId(): string {
  messageIdCounter += 1;
  return `msg-${messageIdCounter}`;
}

export function randomDelay(base: number, spread: number): number {
  return base + Math.random() * spread;
}

export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

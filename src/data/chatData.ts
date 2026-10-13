import type { Channel, Member, Message } from "@/types/chat";

export const currentUserId = "alex";
export const members: Member[] = [
  {
    id: "alex",
    name: "Alex Morgan",
    initials: "AM",
    color: "#635baf",
    role: "Product engineer",
  },
  {
    id: "maya",
    name: "Maya Chen",
    initials: "MC",
    color: "#bc7854",
    role: "Product designer",
  },
  {
    id: "jordan",
    name: "Jordan Lee",
    initials: "JL",
    color: "#467e84",
    role: "Frontend engineer",
  },
  {
    id: "sam",
    name: "Sam Rivera",
    initials: "SR",
    color: "#a35e86",
    role: "Engineering lead",
  },
];
export const channels: Channel[] = [
  {
    id: "general",
    name: "general",
    description: "The big picture, little wins, and everything in between.",
    members: 24,
  },
  {
    id: "product",
    name: "product",
    description:
      "Building something people love. One thoughtful detail at a time.",
    members: 12,
  },
  {
    id: "engineering",
    name: "engineering",
    description:
      "Shipping notes, technical decisions, and a little rubber ducking.",
    members: 8,
  },
  {
    id: "design",
    name: "design",
    description: "Work in progress. Feedback welcome.",
    members: 6,
  },
  {
    id: "random",
    name: "random",
    description: "A little room for everything else.",
    members: 24,
  },
];
const conversations: Record<string, [string, string][]> = {
  general: [
    [
      "sam",
      "Morning, team! ☀️ A new week and a fresh start. What’s everyone looking forward to shipping?",
    ],
    [
      "maya",
      "The new onboarding flow is ready for a final look. Really happy with how the empty states turned out.",
    ],
    [
      "jordan",
      "Nice! I’ve got the performance improvements lined up. The dashboard is feeling a lot snappier.",
    ],
    ["alex", "I’ll take the onboarding flow for a spin this morning."],
    [
      "sam",
      "Love it. Small improvements add up. Let’s keep sharing things as we go.",
    ],
    [
      "maya",
      "Also, a little Friday win: our first customer sent us a handwritten thank-you note 💛",
    ],
    ["jordan", "That belongs on the office wall."],
    [
      "sam",
      "Reminder: product demo at 3. Bring something unfinished — that’s where the best conversations start.",
    ],
  ],
  product: [
    [
      "maya",
      "I’ve pulled together the feedback from last week’s customer calls. Three themes keep coming up: clarity, fewer clicks, and better collaboration.",
    ],
    [
      "sam",
      "Collaboration feels like the biggest opportunity. Conversations get lost when everything lives in one long channel.",
    ],
    [
      "jordan",
      "Agreed. It’s hard to follow up on one specific message without interrupting everyone else.",
    ],
    [
      "alex",
      "We should explore threaded conversations. Keep the channel focused and give discussions their own space.",
    ],
    [
      "maya",
      "Exactly. I’m picturing a panel on the right, with the original message at the top.",
    ],
    [
      "sam",
      "Let’s start there. We’ll want it to feel seamless when moving between conversations.",
    ],
    [
      "maya",
      "I’ll share some interaction notes after lunch. Happy to pair on the details ✨",
    ],
  ],
  engineering: [
    [
      "jordan",
      "The app runs entirely against the mock API for now. No services to spin up.",
    ],
    [
      "sam",
      "Perfect for local development. Please keep the loading and error states in mind when adding features.",
    ],
    [
      "alex",
      "I’m checking the channel switching behavior and message subscriptions today.",
    ],
  ],
  design: [
    [
      "maya",
      "A few principles for this week: less chrome, more breathing room, and make the next action obvious.",
    ],
    ["jordan", "The new spacing already makes such a difference."],
    ["maya", "Thanks! I’ll keep the component notes updated as we go."],
  ],
  random: [
    ["sam", "Very serious question: best soundtrack for a focused afternoon?"],
    ["jordan", "Rain sounds and an unreasonable amount of coffee."],
    ["maya", "The soundtrack from a game I haven’t played. Every time."],
  ],
};
export const initialMessages: Message[] = channels.flatMap((channel) =>
  conversations[channel.id].map(([authorId, body], index) => ({
    id: `${channel.id}-${index + 1}`,
    channelId: channel.id,
    authorId,
    body,
    parentId: null,
    createdAt: `2026-10-13T${String(9 + Math.floor(index / 6)).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}:00`,
  })),
);

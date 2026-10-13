import type { User } from "@/types/review";

export const CURRENT_USER = "mara";
export const users: User[] = [
  { login: "mara", name: "Mara Jensen", color: "#8250df" },
  { login: "deshawn", name: "DeShawn Ellis", color: "#1a7f37" },
  { login: "yuki", name: "Yuki Tanaka", color: "#bf3989" },
];

/** A file snapshot keyed by stable file ID. */
export type Tree = Record<string, { path: string; content: string }>;

const serverBase = `import express from "express";
import { loadConfig } from "./config";
import { throttle } from "./legacy/throttle";
import { issuesRouter } from "./routes/issues";

const config = loadConfig();
const app = express();

app.use(express.json());
app.use(throttle(config.requestsPerMinute));
app.use("/v1/issues", issuesRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(config.port, () => {
  console.log(\`API listening on \${config.port}\`);
});
`;

const serverHead1 = `import express from "express";
import { loadConfig } from "./config";
import { createRateLimiter } from "./rateLimiter";
import { issuesRouter } from "./routes/issues";

const config = loadConfig();
const app = express();
const limiter = createRateLimiter({
  windowMs: 60_000,
  limit: config.requestsPerMinute,
});

app.use(express.json());
app.use(limiter.middleware);
app.use("/v1/issues", issuesRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true, limiter: limiter.stats() });
});

app.listen(config.port, () => {
  console.log(\`API listening on \${config.port}\`);
});
`;

const serverHead2 = `import express from "express";
import { loadConfig } from "./config";
import { createRateLimiter } from "./rateLimiter";
import { issuesRouter } from "./routes/issues";

const config = loadConfig();
const app = express();
const limiter = createRateLimiter({
  windowMs: 60_000,
  limit: config.requestsPerMinute,
  keyBy: (req) => req.header("x-api-key") ?? req.ip,
});

app.use(express.json());
app.use(limiter.middleware);
app.use("/v1/issues", issuesRouter);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(config.port, () => {
  console.log(\`API listening on \${config.port}\`);
});
`;

const rateLimiter1 = `import type { Request, Response, NextFunction } from "express";

export interface RateLimiterOptions {
  windowMs: number;
  limit: number;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const hits = new Map<string, number[]>();

  function middleware(req: Request, res: Response, next: NextFunction) {
    const key = req.ip;
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < options.windowMs);
    recent.push(now);
    hits.set(key, recent);
    res.setHeader("X-RateLimit-Limit", options.limit);
    res.setHeader("X-RateLimit-Remaining", options.limit - recent.length);
    if (recent.length > options.limit) {
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  }

  function stats() {
    return { keys: hits.size };
  }

  return { middleware, stats };
}
`;

const rateLimiter2 = `import type { Request, Response, NextFunction } from "express";

export interface RateLimiterOptions {
  windowMs: number;
  limit: number;
  keyBy?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const hits = new Map<string, number[]>();
  const keyBy = options.keyBy ?? ((req: Request) => req.ip ?? "unknown");

  function middleware(req: Request, res: Response, next: NextFunction) {
    const key = keyBy(req);
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < options.windowMs);
    recent.push(now);
    hits.set(key, recent);
    res.setHeader("X-RateLimit-Limit", options.limit);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, options.limit - recent.length));
    if (recent.length > options.limit) {
      res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  }

  function stats() {
    return { keys: hits.size };
  }

  return { middleware, stats };
}
`;

const configBase = `export interface Config {
  port: number;
  requestsPerMinute: number;
}

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 3000),
    requestsPerMinute: 120,
  };
}
`;

const configHead = `export interface Config {
  port: number;
  requestsPerMinute: number;
}

export function loadConfig(): Config {
  return {
    port: Number(process.env.PORT ?? 3000),
    requestsPerMinute: Number(process.env.RATE_LIMIT ?? 120),
  };
}
`;

const throttleBase = `// Deprecated: replaced by rateLimiter.ts
export function throttle(perMinute: number) {
  let count = 0;
  setInterval(() => (count = 0), 60_000);
  return (_req: unknown, res: { status: (n: number) => { end: () => void } }, next: () => void) => {
    count += 1;
    if (count > perMinute) return res.status(429).end();
    next();
  };
}
`;

const readmeBase = `# Public API

Run locally with \`npm run dev\`.

## Limits

Requests are throttled globally to 120 per minute.
`;

const readmeHead = `# Public API

Run locally with \`npm run dev\`.

## Limits

Each client may make \`RATE_LIMIT\` requests per minute (default 120).
Responses include \`X-RateLimit-Limit\` and \`X-RateLimit-Remaining\` headers.
`;

const issuesRoute = `import { Router } from "express";

export const issuesRouter = Router();

issuesRouter.get("/", (_req, res) => {
  res.json({ issues: [] });
});
`;

export const baseTree: Tree = {
  "f-server": { path: "src/server.ts", content: serverBase },
  "f-config": { path: "src/config.ts", content: configBase },
  "f-throttle": { path: "src/legacy/throttle.ts", content: throttleBase },
  "f-readme": { path: "README.md", content: readmeBase },
  "f-issues": { path: "src/routes/issues.ts", content: issuesRoute },
};

export interface CommitFixture {
  sha: string;
  message: string;
  author: string;
  /** Hours before the mock clock's start. */
  ageHours: number;
  tree: Tree;
}

export const commit1: CommitFixture = {
  sha: "a1c9e42",
  message: "Add per-client rate limiter",
  author: "deshawn",
  ageHours: 26,
  tree: {
    "f-server": { path: "src/server.ts", content: serverHead1 },
    "f-config": { path: "src/config.ts", content: configHead },
    "f-limiter": { path: "src/rateLimiter.ts", content: rateLimiter1 },
    "f-readme": { path: "README.md", content: readmeHead },
    "f-issues": { path: "src/routes/issues.ts", content: issuesRoute },
  },
};

/** Pushed by the "Author pushes a new commit" mock control. */
export const commit2: CommitFixture = {
  sha: "e77d0b5",
  message: "Key limiter by API key and add Retry-After",
  author: "deshawn",
  ageHours: 0,
  tree: {
    ...commit1.tree,
    "f-server": { path: "src/server.ts", content: serverHead2 },
    "f-limiter": { path: "src/rateLimiter.ts", content: rateLimiter2 },
  },
};

export const PULL = {
  number: 482,
  title: "Add per-client rate limiting to the public API",
  body: "Replaces the global throttle with a sliding-window limiter keyed per client. Adds rate-limit headers and makes the limit configurable.",
  author: "deshawn",
  baseRef: "main",
  headRef: "deshawn/rate-limiter",
};

/** Comments already published on commit 1: [fileId, line, side, author, body]. */
export const seedComments: [string, number, "new" | "old", string, string][] = [
  ["f-limiter", 12, "new", "yuki", "`req.ip` can be undefined behind some proxies — should we fall back to something?"],
  ["f-server", 18, "new", "yuki", "Do we want limiter stats exposed on an unauthenticated health endpoint?"],
  ["f-readme", 7, "new", "mara", "Nice, thanks for documenting the headers."],
];

/** Suggestions published on commit 1: [fileId, startLine, endLine, author, body, replacement]. */
export const seedSuggestions: [string, number, number, string, string, string[]][] = [
  ["f-limiter", 12, 12, "yuki", "Guard against a missing IP.", ['    const key = req.ip ?? "unknown";']],
  ["f-limiter", 18, 18, "yuki", "Never send a negative remaining count.", ['    res.setHeader("X-RateLimit-Remaining", Math.max(0, options.limit - recent.length));']],
  ["f-limiter", 17, 19, "mara", "Clamp remaining and add Retry-After on 429 (overlaps Yuki's suggestion).", [
    '    res.setHeader("X-RateLimit-Limit", options.limit);',
    '    res.setHeader("X-RateLimit-Remaining", Math.max(0, options.limit - recent.length));',
    "    if (recent.length > options.limit) {",
    '      res.setHeader("Retry-After", Math.ceil(options.windowMs / 1000));',
  ]],
  ["f-limiter", 26, 28, "yuki", "Expose the configured limit too.", ["  function stats() {", "    return { keys: hits.size, limit: options.limit };", "  }"]],
  ["f-server", 17, 19, "yuki", "Don't leak limiter stats on the public health check.", ['app.get("/health", (_req, res) => {', "  res.json({ ok: true });", "});"]],
  ["f-readme", 7, 7, "mara", "Tiny wording fix.", ["Each client may make up to `RATE_LIMIT` requests per minute (default 120)."]],
  ["f-config", 9, 9, "yuki", "This suggestion was written against an older version of the line.", ["    requestsPerMinute: parseInt(process.env.RATE_LIMIT ?? \"120\", 10),"]],
];

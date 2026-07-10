import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
export const TEST_PORT = 3399;
export const BASE_URL = `http://localhost:${TEST_PORT}`;
const TEST_DB_FILE = path.resolve(ROOT, "tests/test.db");

function runToCompletion(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, env, stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

// child.kill() only signals the direct child. On Windows, spawning without
// `shell: true` means the child *is* the real process (good — no shell
// wrapper to leak), but Next's Turbopack dev server can still spawn its own
// subprocess, which `child.kill()` would leave orphaned holding the port.
// Killing the whole process tree avoids that either way.
function killProcessTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" }).on("exit", () => resolve());
    } else {
      try {
        process.kill(-pid, "SIGKILL");
      } catch {
        // ignore — process may already be gone
      }
      resolve();
    }
  });
}

async function waitForHealth(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // server not accepting connections yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("Test server did not become healthy in time");
}

// Spins up a real `next dev` server against an isolated, disposable SQLite
// file — integration tests hit it over real HTTP. This is deliberate: the
// app's auth (src/lib/auth.ts getSession()) reads next/headers' cookies()/
// headers(), which only work inside a real Next.js request lifecycle, so
// importing route handlers directly and calling them would require mocking
// framework internals. A real server sidesteps that entirely.
export default async function setup() {
  if (existsSync(TEST_DB_FILE)) rmSync(TEST_DB_FILE);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: `file:${TEST_DB_FILE}`,
    JWT_SECRET: "vitest-test-secret-do-not-use-in-prod",
    NODE_ENV: "test",
    // Explicitly blank (not just "unset") — Next's dotenv loader only fills
    // in a var from .env when it's *not already present* in process.env, so
    // this stops the developer's real GOOGLE_CLIENT_ID (in their local
    // .env) from leaking into the test run and making the "not configured"
    // test flaky depending on whose machine it runs on.
    GOOGLE_CLIENT_ID: "",
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: "",
  };

  await runToCompletion("node", ["node_modules/prisma/build/index.js", "db", "push", "--accept-data-loss"], env);

  const server: ChildProcess = spawn("node", ["node_modules/next/dist/bin/next", "dev", "-p", String(TEST_PORT)], {
    cwd: ROOT,
    env,
    stdio: "inherit",
    detached: process.platform !== "win32",
  });

  await waitForHealth(60_000);

  return async function teardown() {
    if (server.pid) {
      await new Promise<void>((resolve) => {
        server.once("exit", () => resolve());
        killProcessTree(server.pid!);
        // Don't let cleanup hang if the exit event is ever missed.
        setTimeout(resolve, 5000);
      });
    }
    try {
      // Best-effort: on Windows the SQLite file can still be briefly locked
      // right after the process exits. A leftover test.db is harmless
      // (gitignored, and the next run recreates it via `prisma db push`).
      if (existsSync(TEST_DB_FILE)) rmSync(TEST_DB_FILE);
    } catch {
      // ignore
    }
  };
}

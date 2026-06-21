// Analytics tests — runs in the default node testEnvironment.
// We manually mock browser globals (window, localStorage, navigator, fetch, crypto)
// before each test. The analytics module only accesses these inside function bodies,
// so the module loads cleanly and the mocks are in place before any function is called.

import {
  track,
  flushQueue,
  getInstallId,
  readQueue,
  pruneQueue,
} from "@/lib/analytics";

// ── Mock infrastructure ───────────────────────────────────────────────────────

let localStore: Record<string, string> = {};

const localStorageMock = {
  getItem(k: string) { return localStore[k] ?? null; },
  setItem(k: string, v: string) { localStore[k] = v; },
  removeItem(k: string) { delete localStore[k]; },
  clear() { localStore = {}; },
};

const mockFetch = jest.fn(() => Promise.resolve({ ok: true } as Response));

let onlineStatus = true;

const navigatorMock = {
  get onLine() { return onlineStatus; },
};

function setOnline(val: boolean) { onlineStatus = val; }

beforeEach(() => {
  localStore = {};
  mockFetch.mockClear();
  setOnline(true);
  delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
  delete process.env.NEXT_PUBLIC_POSTHOG_HOST;

  // Set browser globals before any test function is called.
  // The analytics module only reads these inside function bodies, so this is safe.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  (global as any).window = global;
  (global as any).localStorage = localStorageMock;
  (global as any).navigator = navigatorMock;
  (global as any).fetch = mockFetch;
  (global as any).crypto = {
    randomUUID() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
    },
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
});

// ── getInstallId ──────────────────────────────────────────────────────────────

describe("getInstallId", () => {
  test("generates an ID on first call and stores it in localStorage", () => {
    const id = getInstallId();
    expect(id).toMatch(/^hw_/);
    expect(localStorageMock.getItem("highwise_install_id")).toBe(id);
  });

  test("returns the same ID on subsequent calls", () => {
    const id1 = getInstallId();
    const id2 = getInstallId();
    expect(id1).toBe(id2);
  });

  test("ID contains no email, name, phone, GPS, or medical data — only hex chars", () => {
    const id = getInstallId();
    expect(id).toMatch(/^hw_[0-9a-f-]+$/i);
  });
});

// ── pruneQueue ────────────────────────────────────────────────────────────────

describe("pruneQueue", () => {
  test("keeps events newer than 14 days", () => {
    const recent = {
      eventName: "e",
      properties: {},
      queuedAt: new Date().toISOString(),
    };
    expect(pruneQueue([recent])).toHaveLength(1);
  });

  test("drops events older than 14 days", () => {
    const old = {
      eventName: "e",
      properties: {},
      queuedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    };
    expect(pruneQueue([old])).toHaveLength(0);
  });

  test("keeps events 1 ms inside the 14-day window", () => {
    const borderline = {
      eventName: "e",
      properties: {},
      queuedAt: new Date(
        Date.now() - 14 * 24 * 60 * 60 * 1000 + 1
      ).toISOString(),
    };
    expect(pruneQueue([borderline])).toHaveLength(1);
  });

  test("mixed: retains recent, drops old", () => {
    const recent = { eventName: "r", properties: {}, queuedAt: new Date().toISOString() };
    const old = {
      eventName: "o",
      properties: {},
      queuedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const result = pruneQueue([recent, old]);
    expect(result).toHaveLength(1);
    expect(result[0].eventName).toBe("r");
  });
});

// ── track — no PostHog configured ────────────────────────────────────────────

describe("track — PostHog not configured", () => {
  test("does not throw", () => {
    expect(() => track("test_event")).not.toThrow();
  });

  test("does not call fetch", async () => {
    track("no_config_event");
    await new Promise((r) => setTimeout(r, 20));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("queues the event when offline", async () => {
    setOnline(false);
    track("offline_event");
    await new Promise((r) => setTimeout(r, 20));
    const q = readQueue();
    expect(q.some((e) => e.eventName === "offline_event")).toBe(true);
  });

  test("queued event only contains allowed properties", async () => {
    setOnline(false);
    track("prop_check", { riskLevel: "low" });
    await new Promise((r) => setTimeout(r, 20));
    const q = readQueue();
    const evt = q.find((e) => e.eventName === "prop_check");
    expect(evt).toBeDefined();
    const allowed = new Set([
      "appVersion",
      "installId",
      "timestamp",
      "onlineStatus",
      "screenName",
      "riskLevel",
      "clinicalGroup",
      "llsSeverity",
    ]);
    for (const k of Object.keys(evt!.properties)) {
      expect(allowed.has(k)).toBe(true);
    }
  });
});

// ── track — PostHog configured ────────────────────────────────────────────────

describe("track — PostHog configured", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";
  });

  test("calls /capture/ when online", async () => {
    track("configured_online");
    await new Promise((r) => setTimeout(r, 20));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://eu.i.posthog.com/capture/",
      expect.objectContaining({ method: "POST" })
    );
  });

  test("request body contains the event name and installId", async () => {
    track("body_check");
    await new Promise((r) => setTimeout(r, 20));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.event).toBe("body_check");
    expect(typeof body.distinct_id).toBe("string");
  });

  test("queues event when fetch returns ok:false", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false } as Response);
    track("failed_send");
    await new Promise((r) => setTimeout(r, 20));
    const q = readQueue();
    expect(q.some((e) => e.eventName === "failed_send")).toBe(true);
  });

  test("queues event when offline, does not call fetch", async () => {
    setOnline(false);
    track("offline_configured");
    await new Promise((r) => setTimeout(r, 20));
    expect(mockFetch).not.toHaveBeenCalled();
    const q = readQueue();
    expect(q.some((e) => e.eventName === "offline_configured")).toBe(true);
  });
});

// ── Queue size cap ────────────────────────────────────────────────────────────

describe("queue size cap", () => {
  test("never stores more than 200 events", async () => {
    setOnline(false);
    for (let i = 0; i < 220; i++) {
      track(`evt_${i}`);
    }
    await new Promise((r) => setTimeout(r, 60));
    expect(readQueue().length).toBeLessThanOrEqual(200);
  });
});

// ── flushQueue ────────────────────────────────────────────────────────────────

describe("flushQueue", () => {
  test("does nothing when queue is empty", () => {
    flushQueue();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("sends queued events via /batch/ when multiple events are queued", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    setOnline(false);
    track("queued_event_1");
    track("queued_event_2");
    await new Promise((r) => setTimeout(r, 30));
    expect(readQueue().length).toBe(2);

    setOnline(true);
    flushQueue();
    await new Promise((r) => setTimeout(r, 30));
    expect(mockFetch).toHaveBeenCalledWith(
      "https://eu.i.posthog.com/batch/",
      expect.objectContaining({ method: "POST" })
    );
  });

  test("clears queue after successful flush", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    setOnline(false);
    track("to_flush_a");
    track("to_flush_b");
    await new Promise((r) => setTimeout(r, 30));
    expect(readQueue().length).toBe(2);

    setOnline(true);
    flushQueue();
    await new Promise((r) => setTimeout(r, 50));
    expect(readQueue().length).toBe(0);
  });

  test("retains queue when flush send fails", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.i.posthog.com";

    setOnline(false);
    track("keep_me_a");
    track("keep_me_b");
    await new Promise((r) => setTimeout(r, 30));

    mockFetch.mockResolvedValueOnce({ ok: false } as Response);
    setOnline(true);
    flushQueue();
    await new Promise((r) => setTimeout(r, 50));
    expect(readQueue().some((e) => e.eventName === "keep_me_a")).toBe(true);
  });
});

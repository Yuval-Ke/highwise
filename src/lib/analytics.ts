const INSTALL_ID_KEY = "highwise_install_id";
const QUEUE_KEY = "highwise_analytics_queue";
const APP_VERSION = "0.2.0";
const MAX_QUEUE_SIZE = 200;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// Only these properties are ever sent — whitelist enforced before every send.
export type AllowedEventProperties = {
  appVersion?: string;
  installId?: string;
  timestamp?: string;
  onlineStatus?: string;
  screenName?: string;
  riskLevel?: string;
  clinicalGroup?: string;
  llsSeverity?: string;
};

type QueuedEvent = {
  eventName: string;
  properties: AllowedEventProperties;
  queuedAt: string;
};

const ALLOWED_KEYS: ReadonlyArray<keyof AllowedEventProperties> = [
  "appVersion",
  "installId",
  "timestamp",
  "onlineStatus",
  "screenName",
  "riskLevel",
  "clinicalGroup",
  "llsSeverity",
];

function sanitize(props: AllowedEventProperties): AllowedEventProperties {
  const out: AllowedEventProperties = {};
  for (const key of ALLOWED_KEYS) {
    if (props[key] !== undefined) {
      (out as Record<string, string | undefined>)[key] = props[key];
    }
  }
  return out;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
  );
}

// ── Install ID ────────────────────────────────────────────────────────────────

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return "hw_" + crypto.randomUUID();
  }
  return (
    "hw_" +
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    })
  );
}

export function getInstallId(): string {
  const stored = localStorage.getItem(INSTALL_ID_KEY);
  if (stored) return stored;
  const id = newId();
  localStorage.setItem(INSTALL_ID_KEY, id);
  return id;
}

// ── Queue helpers ─────────────────────────────────────────────────────────────

export function readQueue(): QueuedEvent[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // storage full — silently ignore
  }
}

export function pruneQueue(q: QueuedEvent[]): QueuedEvent[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return q.filter((e) => new Date(e.queuedAt).getTime() > cutoff);
}

function enqueue(event: QueuedEvent): void {
  const q = pruneQueue(readQueue());
  if (q.length >= MAX_QUEUE_SIZE) return;
  q.push(event);
  writeQueue(q);
}

// ── PostHog REST send ─────────────────────────────────────────────────────────

async function sendEvents(events: QueuedEvent[], installId: string): Promise<boolean> {
  if (!isConfigured()) return false;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY!;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST!;

  try {
    let endpoint: string;
    let body: string;

    if (events.length === 1) {
      endpoint = `${host}/capture/`;
      body = JSON.stringify({
        api_key: key,
        event: events[0].eventName,
        distinct_id: installId,
        properties: events[0].properties,
        timestamp: events[0].properties.timestamp ?? events[0].queuedAt,
      });
    } else {
      endpoint = `${host}/batch/`;
      body = JSON.stringify({
        api_key: key,
        batch: events.map((e) => ({
          event: e.eventName,
          distinct_id: installId,
          properties: e.properties,
          timestamp: e.properties.timestamp ?? e.queuedAt,
        })),
      });
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

async function _track(
  eventName: string,
  properties?: AllowedEventProperties
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const installId = getInstallId();
    const now = new Date().toISOString();
    const event: QueuedEvent = {
      eventName,
      properties: sanitize({
        appVersion: APP_VERSION,
        installId,
        timestamp: now,
        onlineStatus: navigator.onLine ? "online" : "offline",
        ...properties,
      }),
      queuedAt: now,
    };

    if (navigator.onLine) {
      const sent = await sendEvents([event], installId);
      if (sent) return;
    }
    enqueue(event);
  } catch {
    // analytics errors must never surface to the user
  }
}

/** Fire-and-forget analytics event. Never throws. */
export function track(
  eventName: string,
  properties?: AllowedEventProperties
): void {
  void _track(eventName, properties);
}

/** Send any queued events. Called on app init and when going back online. */
export function flushQueue(): void {
  if (typeof window === "undefined" || !navigator.onLine) return;
  try {
    const installId = localStorage.getItem(INSTALL_ID_KEY);
    if (!installId) return;
    const pruned = pruneQueue(readQueue());
    writeQueue(pruned); // persist pruned list regardless
    if (pruned.length === 0) return;
    void sendEvents(pruned, installId).then((sent) => {
      if (sent) writeQueue([]);
    });
  } catch {
    // ignore
  }
}

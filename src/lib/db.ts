/**
 * Prototype "backend": a small database kept in the browser's localStorage.
 * It stands in for the hosted database so the demo runs with no accounts or servers.
 * All reads and writes go through src/lib/api.ts, which mirrors the database functions
 * and row-level-security rules in the brief, so swapping in a real backend later only
 * touches that file.
 */
import { DB_VERSION, createSeedDatabase } from "./seed";
import type { Database } from "./types";

const KEY = "rideeasy-db";

let cache: Database | null = null;
const listeners = new Set<() => void>();

function read(): Database {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Database;
      if (parsed.version === DB_VERSION) return parsed;
    }
  } catch {
    /* corrupt or blocked storage — reseed */
  }
  const fresh = createSeedDatabase();
  persist(fresh);
  return fresh;
}

function persist(db: Database) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    // Storage full (large photo uploads) or blocked: keep working in memory for this session
    console.warn("Could not save to browser storage; changes will last until the page is closed.");
  }
}

export function getDb(): Database {
  if (!cache) cache = read();
  return cache;
}

/** Run a change as one unit (JS is single-threaded, so this behaves like a transaction). */
export function transaction<T>(fn: (db: Database) => T): T {
  const draft = structuredClone(getDb());
  const result = fn(draft); // throws → nothing is saved
  cache = draft;
  persist(draft);
  notify();
  return result;
}

export function resetDatabase() {
  cache = createSeedDatabase();
  persist(cache);
  notify();
}

function notify() {
  listeners.forEach((l) => l());
}

/** Subscribe to data changes in this tab and in other open tabs (e.g. admin + public site side by side). */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

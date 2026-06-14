import { promises as fs } from "fs";
import path from "path";
import { portalConfig } from "@/app/tableConfig";
import type { Store } from "./types";

/**
 * Server-side persistence for the CMS.
 *
 * Data lives in a single JSON file under `data/`. Reads are cheap; every
 * mutation goes through `mutate()`, which serialises read-modify-write cycles
 * behind an in-process lock and writes atomically (temp file + rename) so a
 * crash mid-write can never corrupt the store.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

/** Most recent history entries to retain (older entries lose revert ability). */
const MAX_HISTORY = 500;

function emptyStore(): Store {
  return {
    users: [],
    // Deep clone the defaults so the seed can never be mutated by reference.
    tables: JSON.parse(JSON.stringify(portalConfig.tables)),
    history: [],
  };
}

async function ensureFile(): Promise<void> {
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await writeStore(emptyStore());
  }
}

export async function readStore(): Promise<Store> {
  await ensureFile();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      users: parsed.users ?? [],
      tables: parsed.tables ?? [],
      history: parsed.history ?? [],
    };
  } catch {
    // Corrupt file — fall back to a fresh store rather than crashing the app.
    return emptyStore();
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Trim history to the newest entries before persisting.
  if (store.history.length > MAX_HISTORY) {
    store.history = store.history.slice(-MAX_HISTORY);
  }
  const tmp = `${STORE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tmp, STORE_PATH);
}

// Simple promise-chain mutex: each mutation awaits the previous one.
let lock: Promise<unknown> = Promise.resolve();

/**
 * Runs `fn` with exclusive access to the store. `fn` receives the current
 * store, may mutate it freely, and returns a value to the caller. The
 * (possibly) mutated store is persisted after `fn` resolves.
 */
export async function mutate<T>(fn: (store: Store) => T | Promise<T>): Promise<T> {
  const run = lock.then(async () => {
    const store = await readStore();
    const result = await fn(store);
    await writeStore(store);
    return result;
  });
  // Keep the chain alive regardless of whether this run succeeded or threw.
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(import.meta.dir, "..", "data");

if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(join(DATA_DIR, "moltchat.db"), { create: true });
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=ON;");

// Schema migrations
db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts_cache (
    id TEXT PRIMARY KEY,
    submolt TEXT,
    title TEXT,
    content TEXT,
    url TEXT,
    author TEXT,
    score INTEGER,
    created_at TEXT,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS comments_cache (
    id TEXT PRIMARY KEY,
    post_id TEXT,
    parent_id TEXT,
    author TEXT,
    content TEXT,
    score INTEGER,
    created_at TEXT,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations_cache (
    id TEXT PRIMARY KEY,
    with_agent TEXT,
    last_message_at TEXT,
    unread_count INTEGER DEFAULT 0,
    fetched_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS action_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target_id TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Config helpers
export function getConfig(key: string): string | null {
  const row = db.query("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | null;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  db.query("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)").run(key, value);
}

export function deleteConfig(key: string): void {
  db.query("DELETE FROM config WHERE key = ?").run(key);
}

// Posts cache
export function cachePost(post: {
  id: string; submolt?: string; title?: string; content?: string;
  url?: string; author?: string; score?: number; created_at?: string;
}): void {
  db.query(`INSERT OR REPLACE INTO posts_cache (id, submolt, title, content, url, author, score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    post.id, post.submolt ?? null, post.title ?? null, post.content ?? null,
    post.url ?? null, post.author ?? null, post.score ?? 0, post.created_at ?? null
  );
}

export function getCachedPost(id: string) {
  return db.query("SELECT * FROM posts_cache WHERE id = ?").get(id);
}

// Comments cache
export function cacheComment(comment: {
  id: string; post_id?: string; parent_id?: string;
  author?: string; content?: string; score?: number; created_at?: string;
}): void {
  db.query(`INSERT OR REPLACE INTO comments_cache (id, post_id, parent_id, author, content, score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    comment.id, comment.post_id ?? null, comment.parent_id ?? null,
    comment.author ?? null, comment.content ?? null, comment.score ?? 0, comment.created_at ?? null
  );
}

// Conversations cache
export function cacheConversation(conv: {
  id: string; with_agent?: string; last_message_at?: string; unread_count?: number;
}): void {
  db.query(`INSERT OR REPLACE INTO conversations_cache (id, with_agent, last_message_at, unread_count)
    VALUES (?, ?, ?, ?)`).run(
    conv.id, conv.with_agent ?? null, conv.last_message_at ?? null, conv.unread_count ?? 0
  );
}

// Action log
export function logAction(action: string, targetId?: string, detail?: string): void {
  db.query("INSERT INTO action_log (action, target_id, detail) VALUES (?, ?, ?)").run(
    action, targetId ?? null, detail ?? null
  );
}

export function getRecentActions(limit = 50) {
  return db.query("SELECT * FROM action_log ORDER BY created_at DESC LIMIT ?").all(limit);
}

export default db;

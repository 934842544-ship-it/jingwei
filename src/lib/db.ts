import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  migrate(db);
  _db = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS Session (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Goal (
      id TEXT PRIMARY KEY,
      userId TEXT,
      parentId TEXT,
      title TEXT NOT NULL,
      description TEXT,
      deadline TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      progressMode TEXT NOT NULL DEFAULT 'MANUAL',
      manualProgress INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      FOREIGN KEY (parentId) REFERENCES Goal(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS Task (
      id TEXT PRIMARY KEY,
      userId TEXT,
      title TEXT NOT NULL,
      notes TEXT,
      goalId TEXT,
      priority TEXT NOT NULL DEFAULT 'NORMAL',
      dueDate TEXT,
      plannedDate TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      waitingOn TEXT,
      followUpDate TEXT,
      checklist TEXT,
      estimatedMinutes INTEGER,
      done INTEGER NOT NULL DEFAULT 0,
      doneAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (goalId) REFERENCES Goal(id) ON DELETE SET NULL,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Habit (
      id TEXT PRIMARY KEY,
      userId TEXT,
      name TEXT NOT NULL,
      targetPerWeek INTEGER NOT NULL DEFAULT 7,
      archived INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS HabitRecord (
      id TEXT PRIMARY KEY,
      habitId TEXT NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (habitId) REFERENCES Habit(id) ON DELETE CASCADE,
      UNIQUE(habitId, date)
    );

    CREATE TABLE IF NOT EXISTS EventLog (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      action TEXT NOT NULL,
      before TEXT,
      after TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_event_user_time ON EventLog(userId, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_event_entity ON EventLog(entityType, entityId, createdAt DESC);

    CREATE TABLE IF NOT EXISTS Daily (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      focus TEXT,
      win TEXT,
      improve TEXT,
      nextStep TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
      UNIQUE(userId, date)
    );
  `);

  const goalColumns = db.pragma("table_info(Goal)") as { name: string }[];
  if (!goalColumns.find((c) => c.name === "userId")) {
    db.exec(`ALTER TABLE Goal ADD COLUMN userId TEXT REFERENCES User(id) ON DELETE CASCADE`);
  }
  if (!goalColumns.find((c) => c.name === "parentId")) {
    db.exec(`ALTER TABLE Goal ADD COLUMN parentId TEXT REFERENCES Goal(id) ON DELETE SET NULL`);
  }
  if (!goalColumns.find((c) => c.name === "progressMode")) {
    db.exec(`ALTER TABLE Goal ADD COLUMN progressMode TEXT NOT NULL DEFAULT 'MANUAL'`);
  }

  const taskColumns = db.pragma("table_info(Task)") as { name: string }[];
  if (!taskColumns.find((c) => c.name === "userId")) {
    db.exec(`ALTER TABLE Task ADD COLUMN userId TEXT REFERENCES User(id) ON DELETE CASCADE`);
  }
  if (!taskColumns.find((c) => c.name === "plannedDate")) {
    db.exec(`ALTER TABLE Task ADD COLUMN plannedDate TEXT`);
  }
  if (!taskColumns.find((c) => c.name === "status")) {
    db.exec(`ALTER TABLE Task ADD COLUMN status TEXT NOT NULL DEFAULT 'OPEN'`);
  }
  if (!taskColumns.find((c) => c.name === "waitingOn")) {
    db.exec(`ALTER TABLE Task ADD COLUMN waitingOn TEXT`);
  }
  if (!taskColumns.find((c) => c.name === "followUpDate")) {
    db.exec(`ALTER TABLE Task ADD COLUMN followUpDate TEXT`);
  }
  if (!taskColumns.find((c) => c.name === "checklist")) {
    db.exec(`ALTER TABLE Task ADD COLUMN checklist TEXT`);
  }
  if (!taskColumns.find((c) => c.name === "estimatedMinutes")) {
    db.exec(`ALTER TABLE Task ADD COLUMN estimatedMinutes INTEGER`);
  }

  const habitColumns = db.pragma("table_info(Habit)") as { name: string }[];
  if (!habitColumns.find((c) => c.name === "userId")) {
    db.exec(`ALTER TABLE Habit ADD COLUMN userId TEXT REFERENCES User(id) ON DELETE CASCADE`);
  }
}

export function cuid(): string {
  return (
    "c" +
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-6)
  );
}

export function nowIso(): string {
  return new Date().toISOString();
}

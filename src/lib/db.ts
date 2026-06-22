import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'smc.db');

// ensure data directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
    migrate(_db);
  }
  return _db;
}

// Idempotent migrations for databases created before a column existed.
function migrate(db: Database.Database) {
  const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!userCols.some(c => c.name === 'status')) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
  }
  // Per-shop OAuth token storage for real channel integrations.
  const shopCols = db.prepare("PRAGMA table_info(shops)").all() as { name: string }[];
  const addShopCol = (name: string, ddl: string) => {
    if (!shopCols.some(c => c.name === name)) db.exec(`ALTER TABLE shops ADD COLUMN ${ddl}`);
  };
  addShopCol('external_shop_id', 'external_shop_id TEXT');
  addShopCol('access_token', 'access_token TEXT');
  addShopCol('refresh_token', 'refresh_token TEXT');
  addShopCol('token_expires_at', 'token_expires_at TEXT');
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'owner',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      product_count INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      orders INTEGER DEFAULT 0,
      connected_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      weight REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      external_id TEXT,
      status TEXT DEFAULT 'pending',
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      sales INTEGER DEFAULT 0,
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      status TEXT DEFAULT 'new',
      total REAL NOT NULL,
      shipping_fee REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id),
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      channel TEXT NOT NULL,
      gmv REAL DEFAULT 0,
      orders INTEGER DEFAULT 0,
      sessions INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS market_trends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      trend TEXT NOT NULL,
      score INTEGER DEFAULT 50,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,        -- pull | stock_push | sale
      channel TEXT,
      shop_name TEXT,
      sku TEXT,
      status TEXT NOT NULL,      -- success | error
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

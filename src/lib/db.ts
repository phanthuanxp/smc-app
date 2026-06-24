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

  // sale_price and image_url for products
  const prodCols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
  if (!prodCols.some(c => c.name === 'sale_price')) {
    db.exec('ALTER TABLE products ADD COLUMN sale_price REAL DEFAULT 0');
  }
  if (!prodCols.some(c => c.name === 'image_url')) {
    db.exec('ALTER TABLE products ADD COLUMN image_url TEXT DEFAULT \'\'');
  }

  // Seed default AI provider rows (one per provider, idempotent)
  const AI_DEFAULTS = [
    { provider: 'claude',   model: 'claude-sonnet-4-6', priority: 1 },
    { provider: 'openai',   model: 'gpt-4o',            priority: 2 },
    { provider: 'gemini',   model: 'gemini-2.0-flash',  priority: 3 },
    { provider: 'grok',     model: 'grok-2-latest',     priority: 4 },
    { provider: '9router',  model: 'auto',              priority: 5 },
  ];
  const insertAi = db.prepare(
    'INSERT OR IGNORE INTO ai_configs (provider, model, priority) VALUES (?,?,?)'
  );
  for (const r of AI_DEFAULTS) insertAi.run(r.provider, r.model, r.priority);
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

    CREATE TABLE IF NOT EXISTS ai_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL UNIQUE,
      api_key TEXT DEFAULT '',
      model TEXT DEFAULT '',
      endpoint TEXT DEFAULT '',
      enabled INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 99,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS affiliate_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      shop_id INTEGER REFERENCES shops(id),
      product_id INTEGER REFERENCES products(id),
      commission_rate REAL NOT NULL DEFAULT 10,
      status TEXT DEFAULT 'active',
      clicks INTEGER DEFAULT 0,
      conversions INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      external_id TEXT,
      enrolled_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS affiliate_creators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      shop_id INTEGER REFERENCES shops(id),
      creator_name TEXT NOT NULL,
      creator_handle TEXT,
      followers INTEGER DEFAULT 0,
      gmv REAL DEFAULT 0,
      orders INTEGER DEFAULT 0,
      commission_earned REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      joined_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      shop_id INTEGER REFERENCES shops(id),
      name TEXT NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percent',
      discount_value REAL NOT NULL,
      min_purchase REAL DEFAULT 0,
      max_discount REAL DEFAULT 0,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      status TEXT DEFAULT 'scheduled',
      external_id TEXT,
      products TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      shop_id INTEGER REFERENCES shops(id),
      code TEXT NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'percent',
      discount_value REAL NOT NULL,
      min_purchase REAL DEFAULT 0,
      max_discount REAL DEFAULT 0,
      usage_limit INTEGER DEFAULT 100,
      usage_count INTEGER DEFAULT 0,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      external_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS live_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      shop_id INTEGER REFERENCES shops(id),
      title TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 60,
      status TEXT DEFAULT 'scheduled',
      products TEXT DEFAULT '[]',
      script TEXT DEFAULT '',
      viewer_count INTEGER DEFAULT 0,
      orders_count INTEGER DEFAULT 0,
      gmv REAL DEFAULT 0,
      stream_url TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      order_id INTEGER REFERENCES orders(id),
      order_no TEXT NOT NULL,
      shop_id INTEGER REFERENCES shops(id),
      customer_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      items TEXT DEFAULT '[]',
      refund_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      restock INTEGER DEFAULT 1,
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );
  `);
}

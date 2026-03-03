import Database from "better-sqlite3";
import pg from "pg";

const { Pool } = pg;

// Interface for database operations to abstract away the underlying DB
interface IDatabase {
  query(sql: string, params?: any[]): Promise<any>;
  get(sql: string, params?: any[]): Promise<any>;
  run(sql: string, params?: any[]): Promise<any>;
}

class SQLiteDB implements IDatabase {
  private db: any;

  constructor(filename: string) {
    this.db = new Database(filename);
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return this.db.prepare(sql).all(...params);
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return this.db.prepare(sql).get(...params);
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return { 
      lastInsertRowid: info.lastInsertRowid, 
      changes: info.changes 
    };
  }
}

class PostgresDB implements IDatabase {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false } // Required for many cloud providers like Railway/Heroku
    });
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    // Convert SQLite ? placeholders to Postgres $1, $2, etc.
    const { text, values } = this.convertQuery(sql, params);
    const res = await this.pool.query(text, values);
    return res.rows;
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const { text, values } = this.convertQuery(sql, params);
    const res = await this.pool.query(text, values);
    return res.rows[0];
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    const { text, values } = this.convertQuery(sql, params);
    
    // Handle INSERT returning id for lastInsertRowid compatibility
    if (text.trim().toUpperCase().startsWith('INSERT')) {
      const returningSql = text + ' RETURNING id';
      const res = await this.pool.query(returningSql, values);
      return {
        lastInsertRowid: res.rows[0]?.id,
        changes: res.rowCount
      };
    }

    const res = await this.pool.query(text, values);
    return {
      lastInsertRowid: 0, // Not available for non-insert
      changes: res.rowCount
    };
  }

  private convertQuery(sql: string, params: any[]) {
    let paramIndex = 1;
    const text = sql.replace(/\?/g, () => `$${paramIndex++}`);
    return { text, values: params };
  }
}

// Factory to get the correct DB instance
export function getDb(): IDatabase {
  if (process.env.DATABASE_URL) {
    console.log("Using PostgreSQL database");
    return new PostgresDB(process.env.DATABASE_URL);
  }
  console.log("Using SQLite database");
  return new SQLiteDB("worktime.db");
}

import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { CONFIG } from '../config';

class DatabaseManager {
  private db: Database | null = null;
  private SQL: SqlJsStatic | null = null;
  private dbPath: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;

  constructor() {
    this.dbPath = path.resolve(CONFIG.DATABASE_PATH);
  }

  public async init(): Promise<void> {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const filebuffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(filebuffer);
      console.log(`[DB] Loaded existing SQLite database from ${this.dbPath}`);
    } else {
      this.db = new this.SQL.Database();
      console.log(`[DB] Created new SQLite database at ${this.dbPath}`);
    }

    // Execute schema
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      this.db.run(schemaSql);
      this.persist();
    }

    // Auto-save interval every 5 seconds if dirty
    setInterval(() => {
      if (this.isDirty) {
        this.persist();
      }
    }, 5000);
  }

  public run(sql: string, params: any[] = []): void {
    if (!this.db) throw new Error('Database not initialized');
    this.db.run(sql, params);
    this.isDirty = true;
  }

  public query<T = any>(sql: string, params: any[] = []): T[] {
    if (!this.db) throw new Error('Database not initialized');
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  }

  public queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const results = this.query<T>(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  public persist(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      this.isDirty = false;
    } catch (err) {
      console.error('[DB] Failed to persist database:', err);
    }
  }

  public close(): void {
    if (this.db) {
      this.persist();
      this.db.close();
      this.db = null;
      console.log('[DB] Database closed cleanly.');
    }
  }
}

export const dbManager = new DatabaseManager();

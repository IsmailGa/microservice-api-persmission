import { Pool } from 'pg';
import { Permission } from '../types';

export class PostgresClient {
  private pool: Pool;

  constructor(url: string) {
    this.pool = new Pool({ 
      connectionString: url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async init() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS permissions (
          id SERIAL PRIMARY KEY,
          api_key VARCHAR(255) NOT NULL,
          module VARCHAR(255) NOT NULL,
          action VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(api_key, module, action)
        )
      `);

      // Создаем индексы для производительности
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_permissions_api_key ON permissions(api_key)
      `);
      
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_permissions_module_action ON permissions(module, action)
      `);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize database: ${errorMessage}`);
    }
  }

  async grant(apiKey: string, module: string, action: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO permissions (api_key, module, action) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [apiKey, module, action]
    );
  }

  async revoke(apiKey: string, module: string, action: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM permissions WHERE api_key = $1 AND module = $2 AND action = $3',
      [apiKey, module, action]
    );
  }

  async check(apiKey: string, module: string, action: string): Promise<boolean> {
    const result = await this.pool.query(
      'SELECT 1 FROM permissions WHERE api_key = $1 AND module = $2 AND action = $3',
      [apiKey, module, action]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async list(apiKey: string): Promise<Permission[]> {
    const result = await this.pool.query(
      'SELECT module, action FROM permissions WHERE api_key = $1',
      [apiKey]
    );
    return result.rows.map(row => ({ module: row.module, action: row.action }));
  }
}

export const postgresClient = new PostgresClient(
  process.env.POSTGRES_URL || 'postgresql://user:password@localhost:5432/permissions'
);
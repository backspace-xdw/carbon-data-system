import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { logger } from '../utils/logger'

const DB_PATH = path.join(__dirname, '../../data/carbon.db')
let db: Database.Database

export function getDatabase(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initializeDatabase(): void {
  const database = getDatabase()
  // In compiled mode, SQL files are in src/db; in dev mode, also src/db
  const srcRoot = path.join(__dirname, '../../src')
  const schemaPath = path.join(srcRoot, 'db/schema.sql')
  const seedPath = path.join(srcRoot, 'db/seed.sql')

  try {
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    database.exec(schema)
    logger.info('Database schema initialized')

    // Run seed if users table is empty
    const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get() as any
    if (userCount.count === 0) {
      const seed = fs.readFileSync(seedPath, 'utf-8')
      database.exec(seed)
      logger.info('Database seeded with default data')
    }
  } catch (error) {
    logger.error('Database initialization failed:', error)
    throw error
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    logger.info('Database connection closed')
  }
}

import { getDatabase } from '../config/database'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export interface User {
  id: string
  username: string
  password_hash: string
  full_name: string
  role: string
  status: string
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export const UserModel = {
  findByUsername(username: string): User | undefined {
    return getDatabase().prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined
  },

  findById(id: string): User | undefined {
    return getDatabase().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined
  },

  findAll(): User[] {
    return getDatabase().prepare('SELECT id, username, full_name, role, status, created_at, last_login_at FROM users').all() as User[]
  },

  create(data: { username: string; password: string; full_name: string; role: string }): User {
    const id = uuidv4()
    const password_hash = bcrypt.hashSync(data.password, 10)
    getDatabase().prepare(
      'INSERT INTO users (id, username, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)'
    ).run(id, data.username, password_hash, data.full_name, data.role)
    return this.findById(id)!
  },

  updateLastLogin(id: string): void {
    getDatabase().prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(id)
  },

  async initialize(): Promise<void> {
    const admin = this.findByUsername('admin')
    if (admin && admin.password_hash.startsWith('$2a$10$8Kx')) {
      // Replace placeholder hash with real one
      const realHash = bcrypt.hashSync('admin123', 10)
      getDatabase().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(realHash, admin.id)
    }
  },
}

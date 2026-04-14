import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { UserModel } from '../models/user.model'
import { AuthRequest } from '../middleware/authenticate'

export const authController = {
  login(req: Request, res: Response): void {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ code: 400, message: '请输入用户名和密码' })
      return
    }

    const user = UserModel.findByUsername(username)
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ code: 401, message: '用户名或密码错误' })
      return
    }

    if (user.status !== 'active') {
      res.status(403).json({ code: 403, message: '账号已被禁用' })
      return
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as any
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn }
    )

    UserModel.updateLastLogin(user.id)

    res.json({
      code: 0,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
        },
      },
    })
  },

  me(req: AuthRequest, res: Response): void {
    const user = UserModel.findById(req.user!.userId)
    if (!user) {
      res.status(404).json({ code: 404, message: '用户不存在' })
      return
    }
    res.json({
      code: 0,
      message: 'success',
      data: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    })
  },
}

import { jwt, sign, verify } from 'hono/jwt'
import { Context, Next } from 'hono'
import { getCookie, setCookie } from 'hono/cookie'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
}

type JWTPayload = {
  userId: string
  email: string
  role: string
  exp: number
  iat: number
}

// JWT secret - in production this should come from environment variables
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production'

export class AuthManager {
  static async generateToken(userId: string, email: string, role: string): Promise<string> {
    const payload: JWTPayload = {
      userId,
      email,
      role,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
      iat: Math.floor(Date.now() / 1000)
    }
    
    return await sign(payload, JWT_SECRET)
  }

  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = await verify(token, JWT_SECRET) as JWTPayload
      
      // Check if token is expired
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null
      }
      
      return payload
    } catch (error) {
      console.error('Token verification failed:', error)
      return null
    }
  }

  static async hashPassword(password: string): Promise<string> {
    // In Cloudflare Workers, we'll use Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(password + 'salt-change-in-production')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password)
    return passwordHash === hash
  }
}

// Middleware to require authentication
export const requireAuth = () => {
  return async (c: Context, next: Next) => {
    try {
      // Try to get token from Authorization header
      let token = c.req.header('Authorization')?.replace('Bearer ', '')

      // If no header token, try cookie
      if (!token) {
        token = getCookie(c, 'auth_token')
      }

      if (!token) {
        // Check if this is a browser request (HTML accept header)
        const acceptHeader = c.req.header('Accept') || ''
        if (acceptHeader.includes('text/html')) {
          return c.redirect('/auth/login?error=Please login to access the admin area')
        }
        return c.json({ error: 'Authentication required' }, 401)
      }

      // Try to get cached token verification from KV
      const kv = c.env?.KV
      let payload: JWTPayload | null = null

      if (kv) {
        const cacheKey = `auth:${token.substring(0, 20)}` // Use token prefix as key
        const cached = await kv.get(cacheKey, 'json')
        if (cached) {
          payload = cached as JWTPayload
        }
      }

      // If not cached, verify token
      if (!payload) {
        payload = await AuthManager.verifyToken(token)

        // Cache the verified payload for 5 minutes
        if (payload && kv) {
          const cacheKey = `auth:${token.substring(0, 20)}`
          await kv.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 })
        }
      }

      if (!payload) {
        // Check if this is a browser request (HTML accept header)
        const acceptHeader = c.req.header('Accept') || ''
        if (acceptHeader.includes('text/html')) {
          return c.redirect('/auth/login?error=Your session has expired, please login again')
        }
        return c.json({ error: 'Invalid or expired token' }, 401)
      }

      // Add user info to context
      c.set('user', payload)

      return await next()
    } catch (error) {
      console.error('Auth middleware error:', error)
      // Check if this is a browser request (HTML accept header)
      const acceptHeader = c.req.header('Accept') || ''
      if (acceptHeader.includes('text/html')) {
        return c.redirect('/auth/login?error=Authentication failed, please login again')
      }
      return c.json({ error: 'Authentication failed' }, 401)
    }
  }
}

// Middleware to require specific role
export const requireRole = (requiredRole: string | string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as JWTPayload
    
    if (!user) {
      // Check if this is a browser request (HTML accept header)
      const acceptHeader = c.req.header('Accept') || ''
      if (acceptHeader.includes('text/html')) {
        return c.redirect('/auth/login?error=Please login to access the admin area')
      }
      return c.json({ error: 'Authentication required' }, 401)
    }
    
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    
    if (!roles.includes(user.role)) {
      // Check if this is a browser request (HTML accept header)
      const acceptHeader = c.req.header('Accept') || ''
      if (acceptHeader.includes('text/html')) {
        return c.redirect('/auth/login?error=You do not have permission to access this area')
      }
      return c.json({ error: 'Insufficient permissions' }, 403)
    }
    
    return await next()
  }
}

// Optional auth middleware (doesn't block if no token)
export const optionalAuth = () => {
  return async (c: Context, next: Next) => {
    try {
      let token = c.req.header('Authorization')?.replace('Bearer ', '')
      
      if (!token) {
        token = getCookie(c, 'auth_token')
      }
      
      if (token) {
        const payload = await AuthManager.verifyToken(token)
        if (payload) {
          c.set('user', payload)
        }
      }
      
      return await next()
    } catch (error) {
      // Don't block on auth errors in optional auth
      console.error('Optional auth error:', error)
      return await next()
    }
  }
}
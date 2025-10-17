import { Context, Next } from 'hono'

export interface Permission {
  id: string
  name: string
  description: string
  category: string
}

export interface UserPermissions {
  userId: string
  role: string
  permissions: string[]
  teamPermissions?: Record<string, string[]>
}

export class PermissionManager {
  private static permissionCache = new Map<string, UserPermissions>()
  private static cacheExpiry = new Map<string, number>()
  private static CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get user permissions from database with caching
   */
  static async getUserPermissions(db: D1Database, userId: string): Promise<UserPermissions> {
    const cacheKey = `permissions:${userId}`
    const now = Date.now()
    
    // Check cache
    if (this.permissionCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey) || 0
      if (now < expiry) {
        return this.permissionCache.get(cacheKey)!
      }
    }

    // Get user and role
    const userStmt = db.prepare('SELECT id, role FROM users WHERE id = ? AND is_active = 1')
    const user = await userStmt.bind(userId).first() as any

    if (!user) {
      throw new Error('User not found')
    }

    // Get role permissions
    const rolePermStmt = db.prepare(`
      SELECT p.name 
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role = ?
    `)
    const { results: rolePermissions } = await rolePermStmt.bind(user.role).all()
    
    // Get individual user permissions
    // For now, we only use role-based permissions
    // User-specific permissions table doesn't exist yet
    const rolePerms = (rolePermissions || []).map((row: any) => row.name)
    const permissions = [...rolePerms]

    // Get team permissions (if user is in teams)
    const teamPermStmt = db.prepare(`
      SELECT tm.team_id, tm.role, tm.permissions
      FROM team_memberships tm
      WHERE tm.user_id = ?
    `)
    const { results: teamMemberships } = await teamPermStmt.bind(userId).all()
    
    const teamPermissions: Record<string, string[]> = {}
    for (const membership of (teamMemberships || [])) {
      const teamRole = (membership as any).role
      const customPerms = (membership as any).permissions ? JSON.parse((membership as any).permissions) : []
      
      // Get team role permissions
      const teamRolePerms = await rolePermStmt.bind(teamRole).all()
      const teamRolePermissions = (teamRolePerms.results || []).map((row: any) => row.name)
      
      teamPermissions[(membership as any).team_id] = [...teamRolePermissions, ...customPerms]
    }

    const userPermissions: UserPermissions = {
      userId,
      role: user.role,
      permissions,
      teamPermissions
    }

    // Cache the result
    this.permissionCache.set(cacheKey, userPermissions)
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL)

    return userPermissions
  }

  /**
   * Check if user has a specific permission
   */
  static async hasPermission(db: D1Database, userId: string, permission: string, teamId?: string): Promise<boolean> {
    try {
      console.log('hasPermission called with:', { userId, permission, teamId })
      const userPerms = await this.getUserPermissions(db, userId)
      console.log('User permissions result:', userPerms)
      
      // Check global permissions
      if (userPerms.permissions.includes(permission)) {
        console.log('Permission found in global permissions')
        return true
      }

      // Check team-specific permissions
      if (teamId && userPerms.teamPermissions && userPerms.teamPermissions[teamId]) {
        const hasTeamPermission = userPerms.teamPermissions[teamId].includes(permission)
        console.log('Team permission check:', hasTeamPermission)
        return hasTeamPermission
      }

      console.log('Permission not found')
      return false
    } catch (error) {
      console.error('Permission check error:', error)
      // For user-specific errors (like "User not found"), return false
      // For database connection errors, we should re-throw to let middleware handle them
      if (error instanceof Error && error.message === 'User not found') {
        return false
      }
      // Re-throw other errors (like database connection issues)
      throw error
    }
  }

  /**
   * Clear permission cache for a user
   */
  static clearUserCache(userId: string) {
    const cacheKey = `permissions:${userId}`
    this.permissionCache.delete(cacheKey)
    this.cacheExpiry.delete(cacheKey)
  }

  /**
   * Clear all permission cache
   */
  static clearAllCache() {
    this.permissionCache.clear()
    this.cacheExpiry.clear()
  }

  /**
   * Clear all permission cache (alias for clearAllCache)
   */
  static clearCache() {
    this.clearAllCache()
  }

  /**
   * Check multiple permissions at once
   */
  static async checkMultiplePermissions(
    db: D1Database, 
    userId: string, 
    permissions: string[], 
    teamId?: string
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {}
    
    for (const permission of permissions) {
      result[permission] = await this.hasPermission(db, userId, permission, teamId)
    }
    
    return result
  }

  /**
   * Middleware factory to require specific permissions
   */
  static requirePermissions(permissions: string[], teamIdParam?: string) {
    return async (c: Context, next: Next) => {
      const user = c.get('user')
      if (!user) {
        return c.json({ error: 'Authentication required' }, 401)
      }

      const db = c.env.DB
      const teamId = teamIdParam ? c.req.param(teamIdParam) : undefined

      try {
        for (const permission of permissions) {
          const hasPermission = await PermissionManager.hasPermission(db, user.userId, permission, teamId)
          if (!hasPermission) {
            return c.json({ error: `Permission denied: ${permission}` }, 403)
          }
        }

        return await next()
      } catch (error) {
        console.error('Permission check error:', error)
        return c.json({ error: 'Permission check failed' }, 500)
      }
    }
  }

  /**
   * Get all available permissions from database
   */
  static async getAllPermissions(db: D1Database): Promise<Permission[]> {
    const stmt = db.prepare('SELECT * FROM permissions ORDER BY category, name')
    const { results } = await stmt.all()
    
    return (results || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category
    }))
  }
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(permission: string, teamIdParam?: string) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const db = c.env.DB
    const teamId = teamIdParam ? c.req.param(teamIdParam) : undefined

    try {
      const hasPermission = await PermissionManager.hasPermission(db, user.userId, permission, teamId)
      
      if (!hasPermission) {
        return c.json({ error: `Permission denied: ${permission}` }, 403)
      }

      return await next()
    } catch (error) {
      console.error('Permission check error:', error)
      return c.json({ error: 'Permission check failed' }, 500)
    }
  }
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: string[], teamIdParam?: string) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401)
    }

    const db = c.env.DB
    const teamId = teamIdParam ? c.req.param(teamIdParam) : undefined

    try {
      for (const permission of permissions) {
        const hasPermission = await PermissionManager.hasPermission(db, user.userId, permission, teamId)
        if (hasPermission) {
          await next()
          return
        }
      }

      return c.json({ error: `Permission denied. Required one of: ${permissions.join(', ')}` }, 403)
    } catch (error) {
      console.error('Permission check error:', error)
      return c.json({ error: 'Permission check failed' }, 500)
    }
  }
}

/**
 * Helper to log user activity
 */
export async function logActivity(
  db: D1Database,
  userId: string,
  action: string,
  resourceType?: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const logStmt = db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    await logStmt.bind(
      crypto.randomUUID(),
      userId,
      action,
      resourceType || null,
      resourceId || null,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
      userAgent || null,
      Date.now()
    ).run()
  } catch (error) {
    console.error('Failed to log activity:', error)
    // Don't throw - activity logging failure shouldn't break the main operation
  }
}
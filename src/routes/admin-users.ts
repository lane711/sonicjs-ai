import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import { requirePermission, logActivity, PermissionManager } from '../middleware/permissions'
import { renderProfilePage, UserProfile, ProfilePageData } from '../templates/pages/admin-profile.template'
import { renderAlert } from '../templates/components/alert.template'
import { AuthManager } from '../middleware/auth'
import { renderActivityLogsPage, ActivityLogsPageData, ActivityLog } from '../templates/pages/admin-activity-logs.template'
import { renderUserEditPage, UserEditPageData, UserEditData } from '../templates/pages/admin-user-edit.template'
import { renderUserNewPage, UserNewPageData } from '../templates/pages/admin-user-new.template'

type Bindings = {
  DB: D1Database
  KV: KVNamespace
  MEDIA_BUCKET: R2Bucket
  EMAIL_QUEUE?: Queue
  SENDGRID_API_KEY?: string
  DEFAULT_FROM_EMAIL?: string
  IMAGES_ACCOUNT_ID?: string
  IMAGES_API_TOKEN?: string
}

type Variables = {
  user: {
    userId: string
    email: string
    role: string
    exp: number
    iat: number
  }
}

const userRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Apply authentication middleware to all routes
userRoutes.use('*', requireAuth())

// Timezone options for profile form
const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Australia/Sydney', label: 'Sydney' }
]

// Language options for profile form
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' }
]

// Role options for user form
const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'editor', label: 'Editor' },
  { value: 'author', label: 'Author' },
  { value: 'viewer', label: 'Viewer' }
]

/**
 * GET /admin/profile - Show user profile page
 */
userRoutes.get('/profile', async (c) => {
  const user = c.get('user')
  const db = c.env.DB

  try {
    // Get user profile data
    const userStmt = db.prepare(`
      SELECT id, email, username, first_name, last_name, phone, bio, avatar_url,
             timezone, language, theme, email_notifications, two_factor_enabled,
             role, created_at, last_login_at
      FROM users 
      WHERE id = ? AND is_active = 1
    `)
    
    const userProfile = await userStmt.bind(user.userId).first() as any

    if (!userProfile) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Convert to UserProfile interface
    const profile: UserProfile = {
      id: userProfile.id,
      email: userProfile.email,
      username: userProfile.username || '',
      first_name: userProfile.first_name || '',
      last_name: userProfile.last_name || '',
      phone: userProfile.phone,
      bio: userProfile.bio,
      avatar_url: userProfile.avatar_url,
      timezone: userProfile.timezone || 'UTC',
      language: userProfile.language || 'en',
      theme: userProfile.theme || 'dark',
      email_notifications: Boolean(userProfile.email_notifications),
      two_factor_enabled: Boolean(userProfile.two_factor_enabled),
      role: userProfile.role,
      created_at: userProfile.created_at,
      last_login_at: userProfile.last_login_at
    }

    const pageData: ProfilePageData = {
      profile,
      timezones: TIMEZONES,
      languages: LANGUAGES,
      user: {
        name: `${profile.first_name} ${profile.last_name}`.trim() || profile.username || user.email,
        email: user.email,
        role: user.role
      }
    }

    return c.html(renderProfilePage(pageData))
  } catch (error) {
    console.error('Profile page error:', error)
    
    const pageData: ProfilePageData = {
      profile: {} as UserProfile,
      timezones: TIMEZONES,
      languages: LANGUAGES,
      error: 'Failed to load profile. Please try again.',
      user: {
        name: user.email,
        email: user.email,
        role: user.role
      }
    }

    return c.html(renderProfilePage(pageData))
  }
})

/**
 * PUT /admin/profile - Update user profile
 */
userRoutes.put('/profile', async (c) => {
  const user = c.get('user')
  const db = c.env.DB

  try {
    const formData = await c.req.formData()
    
    const firstName = formData.get('first_name')?.toString()?.trim() || ''
    const lastName = formData.get('last_name')?.toString()?.trim() || ''
    const username = formData.get('username')?.toString()?.trim() || ''
    const email = formData.get('email')?.toString()?.trim() || ''
    const phone = formData.get('phone')?.toString()?.trim() || null
    const bio = formData.get('bio')?.toString()?.trim() || null
    const timezone = formData.get('timezone')?.toString() || 'UTC'
    const language = formData.get('language')?.toString() || 'en'
    const emailNotifications = formData.get('email_notifications') === '1'

    // Validate required fields
    if (!firstName || !lastName || !username || !email) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'First name, last name, username, and email are required.',
        dismissible: true 
      }))
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'Please enter a valid email address.',
        dismissible: true 
      }))
    }

    // Check if username/email are taken by another user
    const checkStmt = db.prepare(`
      SELECT id FROM users 
      WHERE (username = ? OR email = ?) AND id != ? AND is_active = 1
    `)
    const existingUser = await checkStmt.bind(username, email, user.userId).first()

    if (existingUser) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'Username or email is already taken by another user.',
        dismissible: true 
      }))
    }

    // Update user profile
    const updateStmt = db.prepare(`
      UPDATE users SET 
        first_name = ?, last_name = ?, username = ?, email = ?,
        phone = ?, bio = ?, timezone = ?, language = ?,
        email_notifications = ?, updated_at = ?
      WHERE id = ?
    `)

    await updateStmt.bind(
      firstName, lastName, username, email,
      phone, bio, timezone, language,
      emailNotifications ? 1 : 0, Date.now(),
      user.userId
    ).run()

    // Log the activity
    await logActivity(
      db, user.userId, 'profile.update', 'users', user.userId,
      { fields: ['first_name', 'last_name', 'username', 'email', 'phone', 'bio', 'timezone', 'language', 'email_notifications'] },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    return c.html(renderAlert({ 
      type: 'success', 
      message: 'Profile updated successfully!',
      dismissible: true 
    }))

  } catch (error) {
    console.error('Profile update error:', error)
    return c.html(renderAlert({ 
      type: 'error', 
      message: 'Failed to update profile. Please try again.',
      dismissible: true 
    }))
  }
})

/**
 * POST /admin/profile/avatar - Upload user avatar
 */
userRoutes.post('/profile/avatar', async (c) => {
  const user = c.get('user')
  const db = c.env.DB

  try {
    const formData = await c.req.formData()
    const avatarFile = formData.get('avatar') as File

    if (!avatarFile || !avatarFile.name) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'Please select an image file.',
        dismissible: true 
      }))
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(avatarFile.type)) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP).',
        dismissible: true 
      }))
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (avatarFile.size > maxSize) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'Image file must be smaller than 5MB.',
        dismissible: true 
      }))
    }

    // For now, we'll simulate storing the avatar
    // In a real implementation, you'd upload to cloud storage (R2, S3, etc.)
    const avatarUrl = `/uploads/avatars/${user.userId}-${Date.now()}.${avatarFile.type.split('/')[1]}`

    // Update user avatar URL in database
    const updateStmt = db.prepare(`
      UPDATE users SET avatar_url = ?, updated_at = ?
      WHERE id = ?
    `)

    await updateStmt.bind(avatarUrl, Date.now(), user.userId).run()

    // Log the activity
    await logActivity(
      db, user.userId, 'profile.avatar_update', 'users', user.userId,
      { avatar_url: avatarUrl },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    return c.html(renderAlert({ 
      type: 'success', 
      message: 'Profile picture updated successfully!',
      dismissible: true 
    }))

  } catch (error) {
    console.error('Avatar upload error:', error)
    return c.html(renderAlert({ 
      type: 'error', 
      message: 'Failed to upload profile picture. Please try again.',
      dismissible: true 
    }))
  }
})

/**
 * POST /admin/profile/password - Change user password
 */
userRoutes.post('/profile/password', async (c) => {
  const user = c.get('user')
  const db = c.env.DB

  try {
    const formData = await c.req.formData()
    
    const currentPassword = formData.get('current_password')?.toString() || ''
    const newPassword = formData.get('new_password')?.toString() || ''
    const confirmPassword = formData.get('confirm_password')?.toString() || ''

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'All password fields are required.',
        dismissible: true 
      }))
    }

    if (newPassword !== confirmPassword) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'New passwords do not match.',
        dismissible: true 
      }))
    }

    if (newPassword.length < 8) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'New password must be at least 8 characters long.',
        dismissible: true 
      }))
    }

    // Get current user data
    const userStmt = db.prepare(`
      SELECT password_hash FROM users WHERE id = ? AND is_active = 1
    `)
    const userData = await userStmt.bind(user.userId).first() as any

    if (!userData) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'User not found.',
        dismissible: true 
      }))
    }

    // Verify current password
    const validPassword = await AuthManager.verifyPassword(currentPassword, userData.password_hash)
    if (!validPassword) {
      return c.html(renderAlert({ 
        type: 'error', 
        message: 'Current password is incorrect.',
        dismissible: true 
      }))
    }

    // Hash new password
    const newPasswordHash = await AuthManager.hashPassword(newPassword)

    // Store old password in history
    const historyStmt = db.prepare(`
      INSERT INTO password_history (id, user_id, password_hash, created_at)
      VALUES (?, ?, ?, ?)
    `)
    await historyStmt.bind(
      globalThis.crypto.randomUUID(),
      user.userId,
      userData.password_hash,
      Date.now()
    ).run()

    // Update user password
    const updateStmt = db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `)
    await updateStmt.bind(newPasswordHash, Date.now(), user.userId).run()

    // Log the activity
    await logActivity(
      db, user.userId, 'profile.password_change', 'users', user.userId,
      null,
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    return c.html(renderAlert({ 
      type: 'success', 
      message: 'Password updated successfully!',
      dismissible: true 
    }))

  } catch (error) {
    console.error('Password change error:', error)
    return c.html(renderAlert({ 
      type: 'error', 
      message: 'Failed to update password. Please try again.',
      dismissible: true 
    }))
  }
})

/**
 * GET /admin/users - List all users (requires users.read permission)
 */
userRoutes.get('/users', requirePermission('users.read'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')

  try {
    // Get pagination parameters
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const search = c.req.query('search') || ''
    const offset = (page - 1) * limit

    // Build search query
    let whereClause = 'WHERE u.is_active = 1'
    let params: any[] = []

    if (search) {
      whereClause += ' AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.username LIKE ?)'
      const searchParam = `%${search}%`
      params.push(searchParam, searchParam, searchParam, searchParam)
    }

    // Get users
    const usersStmt = db.prepare(`
      SELECT u.id, u.email, u.username, u.first_name, u.last_name, 
             u.role, u.avatar_url, u.created_at, u.last_login_at,
             u.email_verified, u.two_factor_enabled
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `)

    const { results: users } = await usersStmt.bind(...params, limit, offset).all()

    // Get total count
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total FROM users u ${whereClause}
    `)
    const countResult = await countStmt.bind(...params).first() as any
    const totalUsers = countResult?.total || 0

    // Log the activity
    await logActivity(
      db, user.userId, 'users.list_view', 'users', undefined,
      { search, page, limit },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    return c.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      }
    })

  } catch (error) {
    console.error('Users list error:', error)
    return c.json({ error: 'Failed to load users' }, 500)
  }
})

/**
 * GET /admin/users/new - Show new user creation page (requires users.create permission)
 */
userRoutes.get('/users/new', requirePermission('users.create'), async (c) => {
  const user = c.get('user')

  try {
    const pageData: UserNewPageData = {
      roles: ROLES,
      user: {
        name: user.email.split('@')[0] || user.email,
        email: user.email,
        role: user.role
      }
    }

    return c.html(renderUserNewPage(pageData))
  } catch (error) {
    console.error('User new page error:', error)

    return c.html(renderAlert({
      type: 'error',
      message: 'Failed to load user creation page. Please try again.',
      dismissible: true
    }), 500)
  }
})

/**
 * POST /admin/users/new - Create new user (requires users.create permission)
 */
userRoutes.post('/users/new', requirePermission('users.create'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')

  try {
    const formData = await c.req.formData()

    const firstName = formData.get('first_name')?.toString()?.trim() || ''
    const lastName = formData.get('last_name')?.toString()?.trim() || ''
    const username = formData.get('username')?.toString()?.trim() || ''
    const email = formData.get('email')?.toString()?.trim() || ''
    const phone = formData.get('phone')?.toString()?.trim() || null
    const bio = formData.get('bio')?.toString()?.trim() || null
    const role = formData.get('role')?.toString() || 'viewer'
    const password = formData.get('password')?.toString() || ''
    const confirmPassword = formData.get('confirm_password')?.toString() || ''
    const isActive = formData.get('is_active') === '1'
    const emailVerified = formData.get('email_verified') === '1'

    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password) {
      return c.html(renderAlert({
        type: 'error',
        message: 'First name, last name, username, email, and password are required.',
        dismissible: true
      }))
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.html(renderAlert({
        type: 'error',
        message: 'Please enter a valid email address.',
        dismissible: true
      }))
    }

    // Validate password
    if (password.length < 8) {
      return c.html(renderAlert({
        type: 'error',
        message: 'Password must be at least 8 characters long.',
        dismissible: true
      }))
    }

    if (password !== confirmPassword) {
      return c.html(renderAlert({
        type: 'error',
        message: 'Passwords do not match.',
        dismissible: true
      }))
    }

    // Check if username/email are already taken
    const checkStmt = db.prepare(`
      SELECT id FROM users
      WHERE username = ? OR email = ?
    `)
    const existingUser = await checkStmt.bind(username, email).first()

    if (existingUser) {
      return c.html(renderAlert({
        type: 'error',
        message: 'Username or email is already taken.',
        dismissible: true
      }))
    }

    // Hash password
    const passwordHash = await AuthManager.hashPassword(password)

    // Create user
    const userId = globalThis.crypto.randomUUID()
    const createStmt = db.prepare(`
      INSERT INTO users (
        id, email, username, first_name, last_name, phone, bio,
        password_hash, role, is_active, email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    await createStmt.bind(
      userId, email, username, firstName, lastName, phone, bio,
      passwordHash, role, isActive ? 1 : 0, emailVerified ? 1 : 0,
      Date.now(), Date.now()
    ).run()

    // Log the activity
    await logActivity(
      db, user.userId, 'user.create', 'users', userId,
      { email, username, role },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    // Redirect to user edit page
    return c.redirect(`/admin/users/${userId}/edit?success=User created successfully`)

  } catch (error) {
    console.error('User creation error:', error)
    return c.html(renderAlert({
      type: 'error',
      message: 'Failed to create user. Please try again.',
      dismissible: true
    }))
  }
})

/**
 * GET /admin/users/:id/edit - Show user edit page (requires users.update permission)
 */
userRoutes.get('/users/:id/edit', requirePermission('users.update'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const userId = c.req.param('id')

  try {
    // Get user data
    const userStmt = db.prepare(`
      SELECT id, email, username, first_name, last_name, phone, bio, avatar_url,
             role, is_active, email_verified, two_factor_enabled, created_at, last_login_at
      FROM users
      WHERE id = ?
    `)

    const userToEdit = await userStmt.bind(userId).first() as any

    if (!userToEdit) {
      return c.html(renderAlert({
        type: 'error',
        message: 'User not found',
        dismissible: true
      }), 404)
    }

    // Convert to UserEditData interface
    const editData: UserEditData = {
      id: userToEdit.id,
      email: userToEdit.email,
      username: userToEdit.username || '',
      firstName: userToEdit.first_name || '',
      lastName: userToEdit.last_name || '',
      phone: userToEdit.phone,
      bio: userToEdit.bio,
      avatarUrl: userToEdit.avatar_url,
      role: userToEdit.role,
      isActive: Boolean(userToEdit.is_active),
      emailVerified: Boolean(userToEdit.email_verified),
      twoFactorEnabled: Boolean(userToEdit.two_factor_enabled),
      createdAt: userToEdit.created_at,
      lastLoginAt: userToEdit.last_login_at
    }

    const pageData: UserEditPageData = {
      userToEdit: editData,
      roles: ROLES,
      user: {
        name: user.email.split('@')[0] || user.email,
        email: user.email,
        role: user.role
      }
    }

    return c.html(renderUserEditPage(pageData))
  } catch (error) {
    console.error('User edit page error:', error)

    return c.html(renderAlert({
      type: 'error',
      message: 'Failed to load user. Please try again.',
      dismissible: true
    }), 500)
  }
})

/**
 * PUT /admin/users/:id - Update user (requires users.update permission)
 */
userRoutes.put('/users/:id', requirePermission('users.update'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const userId = c.req.param('id')

  try {
    const formData = await c.req.formData()

    const firstName = formData.get('first_name')?.toString()?.trim() || ''
    const lastName = formData.get('last_name')?.toString()?.trim() || ''
    const username = formData.get('username')?.toString()?.trim() || ''
    const email = formData.get('email')?.toString()?.trim() || ''
    const phone = formData.get('phone')?.toString()?.trim() || null
    const bio = formData.get('bio')?.toString()?.trim() || null
    const role = formData.get('role')?.toString() || 'viewer'
    const isActive = formData.get('is_active') === '1'
    const emailVerified = formData.get('email_verified') === '1'

    // Validate required fields
    if (!firstName || !lastName || !username || !email) {
      return c.html(renderAlert({
        type: 'error',
        message: 'First name, last name, username, and email are required.',
        dismissible: true
      }))
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.html(renderAlert({
        type: 'error',
        message: 'Please enter a valid email address.',
        dismissible: true
      }))
    }

    // Check if username/email are taken by another user
    const checkStmt = db.prepare(`
      SELECT id FROM users
      WHERE (username = ? OR email = ?) AND id != ?
    `)
    const existingUser = await checkStmt.bind(username, email, userId).first()

    if (existingUser) {
      return c.html(renderAlert({
        type: 'error',
        message: 'Username or email is already taken by another user.',
        dismissible: true
      }))
    }

    // Update user
    const updateStmt = db.prepare(`
      UPDATE users SET
        first_name = ?, last_name = ?, username = ?, email = ?,
        phone = ?, bio = ?, role = ?, is_active = ?, email_verified = ?,
        updated_at = ?
      WHERE id = ?
    `)

    await updateStmt.bind(
      firstName, lastName, username, email,
      phone, bio, role, isActive ? 1 : 0, emailVerified ? 1 : 0,
      Date.now(), userId
    ).run()

    // Log the activity
    await logActivity(
      db, user.userId, 'user.update', 'users', userId,
      { fields: ['first_name', 'last_name', 'username', 'email', 'phone', 'bio', 'role', 'is_active', 'email_verified'] },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    return c.html(renderAlert({
      type: 'success',
      message: 'User updated successfully!',
      dismissible: true
    }))

  } catch (error) {
    console.error('User update error:', error)
    return c.html(renderAlert({
      type: 'error',
      message: 'Failed to update user. Please try again.',
      dismissible: true
    }))
  }
})

/**
 * DELETE /admin/users/:id - Delete user (requires users.delete permission)
 */
userRoutes.delete('/users/:id', requirePermission('users.delete'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const userId = c.req.param('id')

  try {
    // Get request body to check for hard delete option
    const body = await c.req.json().catch(() => ({ hardDelete: false }))
    const hardDelete = body.hardDelete === true

    // Prevent self-deletion
    if (userId === user.userId) {
      return c.json({ error: 'You cannot delete your own account' }, 400)
    }

    // Check if user exists
    const userStmt = db.prepare(`
      SELECT id, email FROM users WHERE id = ?
    `)
    const userToDelete = await userStmt.bind(userId).first() as any

    if (!userToDelete) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (hardDelete) {
      // Hard delete - permanently remove from database
      const deleteStmt = db.prepare(`
        DELETE FROM users WHERE id = ?
      `)
      await deleteStmt.bind(userId).run()

      // Log the activity
      await logActivity(
        db, user.userId, 'user.hard_delete', 'users', userId,
        { email: userToDelete.email, permanent: true },
        c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
        c.req.header('user-agent')
      )

      return c.json({
        success: true,
        message: 'User permanently deleted'
      })
    } else {
      // Soft delete - deactivate by setting is_active = 0
      const deleteStmt = db.prepare(`
        UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?
      `)
      await deleteStmt.bind(Date.now(), userId).run()

      // Log the activity
      await logActivity(
        db, user.userId, 'user.soft_delete', 'users', userId,
        { email: userToDelete.email },
        c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
        c.req.header('user-agent')
      )

      return c.json({
        success: true,
        message: 'User deactivated successfully'
      })
    }

  } catch (error) {
    console.error('User deletion error:', error)
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

/**
 * POST /admin/invite-user - Invite a new user (requires users.create permission)
 */
userRoutes.post('/invite-user', requirePermission('users.create'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')

  try {
    const formData = await c.req.formData()
    
    const email = formData.get('email')?.toString()?.trim() || ''
    const role = formData.get('role')?.toString()?.trim() || 'viewer'
    const firstName = formData.get('first_name')?.toString()?.trim() || ''
    const lastName = formData.get('last_name')?.toString()?.trim() || ''

    // Validate input
    if (!email || !firstName || !lastName) {
      return c.json({ error: 'Email, first name, and last name are required' }, 400)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Please enter a valid email address' }, 400)
    }

    // Check if user already exists
    const existingUserStmt = db.prepare(`
      SELECT id FROM users WHERE email = ?
    `)
    const existingUser = await existingUserStmt.bind(email).first()

    if (existingUser) {
      return c.json({ error: 'A user with this email already exists' }, 400)
    }

    // Generate invitation token
    const invitationToken = globalThis.crypto.randomUUID()
    const invitationExpires = Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days

    // Create user record with invitation
    const userId = globalThis.crypto.randomUUID()
    const createUserStmt = db.prepare(`
      INSERT INTO users (
        id, email, first_name, last_name, role, 
        invitation_token, invited_by, invited_at,
        is_active, email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    await createUserStmt.bind(
      userId, email, firstName, lastName, role,
      invitationToken, user.userId, Date.now(),
      0, 0, Date.now(), Date.now()
    ).run()

    // Log the activity
    await logActivity(
      db, user.userId, 'user.invite_sent', 'users', userId,
      { email, role, invited_user_id: userId },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    // In a real implementation, you would send an email here
    // For now, we'll return the invitation link
    const invitationLink = `${c.req.header('origin') || 'http://localhost:8787'}/auth/accept-invitation?token=${invitationToken}`

    return c.json({
      success: true,
      message: 'User invitation sent successfully',
      user: {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        role
      },
      invitation_link: invitationLink // In production, this would be sent via email
    })

  } catch (error) {
    console.error('User invitation error:', error)
    return c.json({ error: 'Failed to send user invitation' }, 500)
  }
})

/**
 * POST /admin/resend-invitation/:id - Resend invitation (requires users.create permission)
 */
userRoutes.post('/resend-invitation/:id', requirePermission('users.create'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const userId = c.req.param('id')

  try {
    // Check if user exists and is invited but not active
    const userStmt = db.prepare(`
      SELECT id, email, first_name, last_name, role, invitation_token
      FROM users 
      WHERE id = ? AND is_active = 0 AND invitation_token IS NOT NULL
    `)
    const invitedUser = await userStmt.bind(userId).first() as any

    if (!invitedUser) {
      return c.json({ error: 'User not found or invitation not valid' }, 404)
    }

    // Generate new invitation token
    const newInvitationToken = globalThis.crypto.randomUUID()

    // Update invitation token and date
    const updateStmt = db.prepare(`
      UPDATE users SET 
        invitation_token = ?, 
        invited_at = ?, 
        updated_at = ?
      WHERE id = ?
    `)

    await updateStmt.bind(
      newInvitationToken,
      Date.now(),
      Date.now(),
      userId
    ).run()

    // Log the activity
    await logActivity(
      db, user.userId, 'user.invitation_resent', 'users', userId,
      { email: invitedUser.email },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    // Generate new invitation link
    const invitationLink = `${c.req.header('origin') || 'http://localhost:8787'}/auth/accept-invitation?token=${newInvitationToken}`

    return c.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation_link: invitationLink
    })

  } catch (error) {
    console.error('Resend invitation error:', error)
    return c.json({ error: 'Failed to resend invitation' }, 500)
  }
})

/**
 * DELETE /admin/cancel-invitation/:id - Cancel invitation (requires users.delete permission)
 */
userRoutes.delete('/cancel-invitation/:id', requirePermission('users.delete'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const userId = c.req.param('id')

  try {
    // Check if user exists and is invited but not active
    const userStmt = db.prepare(`
      SELECT id, email FROM users 
      WHERE id = ? AND is_active = 0 AND invitation_token IS NOT NULL
    `)
    const invitedUser = await userStmt.bind(userId).first() as any

    if (!invitedUser) {
      return c.json({ error: 'User not found or invitation not valid' }, 404)
    }

    // Delete the user record (since they haven't activated yet)
    const deleteStmt = db.prepare(`DELETE FROM users WHERE id = ?`)
    await deleteStmt.bind(userId).run()

    // Log the activity
    await logActivity(
      db, user.userId, 'user.invitation_cancelled', 'users', userId,
      { email: invitedUser.email },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    return c.json({
      success: true,
      message: 'Invitation cancelled successfully'
    })

  } catch (error) {
    console.error('Cancel invitation error:', error)
    return c.json({ error: 'Failed to cancel invitation' }, 500)
  }
})

/**
 * GET /admin/activity-logs - View activity logs (requires activity.read permission)
 */
userRoutes.get('/activity-logs', requirePermission('activity.read'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')

  try {
    // Get pagination and filter parameters
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = (page - 1) * limit

    const filters = {
      action: c.req.query('action') || '',
      resource_type: c.req.query('resource_type') || '',
      date_from: c.req.query('date_from') || '',
      date_to: c.req.query('date_to') || '',
      user_id: c.req.query('user_id') || ''
    }

    // Build where clause
    let whereConditions: string[] = []
    let params: any[] = []

    if (filters.action) {
      whereConditions.push('al.action = ?')
      params.push(filters.action)
    }

    if (filters.resource_type) {
      whereConditions.push('al.resource_type = ?')
      params.push(filters.resource_type)
    }

    if (filters.user_id) {
      whereConditions.push('al.user_id = ?')
      params.push(filters.user_id)
    }

    if (filters.date_from) {
      const fromTimestamp = new Date(filters.date_from).getTime()
      whereConditions.push('al.created_at >= ?')
      params.push(fromTimestamp)
    }

    if (filters.date_to) {
      const toTimestamp = new Date(filters.date_to + ' 23:59:59').getTime()
      whereConditions.push('al.created_at <= ?')
      params.push(toTimestamp)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get activity logs with user information
    const logsStmt = db.prepare(`
      SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id,
        al.details, al.ip_address, al.user_agent, al.created_at,
        u.email as user_email,
        COALESCE(u.first_name || ' ' || u.last_name, u.username, u.email) as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `)

    const { results: logs } = await logsStmt.bind(...params, limit, offset).all()

    // Get total count for pagination
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total 
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
    `)
    const countResult = await countStmt.bind(...params).first() as any
    const totalLogs = countResult?.total || 0

    // Parse details JSON for each log
    const formattedLogs: ActivityLog[] = (logs || []).map((log: any) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null
    }))

    // Log the activity
    await logActivity(
      db, user.userId, 'activity.logs_viewed', undefined, undefined,
      { filters, page, limit },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    const pageData: ActivityLogsPageData = {
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total: totalLogs,
        pages: Math.ceil(totalLogs / limit)
      },
      filters,
      user: {
        name: user.email.split('@')[0] || user.email, // Use email username as fallback
        email: user.email,
        role: user.role
      }
    }

    return c.html(renderActivityLogsPage(pageData))

  } catch (error) {
    console.error('Activity logs error:', error)
    
    const pageData: ActivityLogsPageData = {
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
      filters: {},
      user: {
        name: user.email,
        email: user.email,
        role: user.role
      }
    }

    return c.html(renderActivityLogsPage(pageData))
  }
})

/**
 * GET /admin/activity-logs/export - Export activity logs to CSV (requires activity.read permission)
 */
userRoutes.get('/activity-logs/export', requirePermission('activity.read'), async (c) => {
  const db = c.env.DB
  const user = c.get('user')

  try {
    // Get filter parameters (same as list view)
    const filters = {
      action: c.req.query('action') || '',
      resource_type: c.req.query('resource_type') || '',
      date_from: c.req.query('date_from') || '',
      date_to: c.req.query('date_to') || '',
      user_id: c.req.query('user_id') || ''
    }

    // Build where clause
    let whereConditions: string[] = []
    let params: any[] = []

    if (filters.action) {
      whereConditions.push('al.action = ?')
      params.push(filters.action)
    }

    if (filters.resource_type) {
      whereConditions.push('al.resource_type = ?')
      params.push(filters.resource_type)
    }

    if (filters.user_id) {
      whereConditions.push('al.user_id = ?')
      params.push(filters.user_id)
    }

    if (filters.date_from) {
      const fromTimestamp = new Date(filters.date_from).getTime()
      whereConditions.push('al.created_at >= ?')
      params.push(fromTimestamp)
    }

    if (filters.date_to) {
      const toTimestamp = new Date(filters.date_to + ' 23:59:59').getTime()
      whereConditions.push('al.created_at <= ?')
      params.push(toTimestamp)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get all matching activity logs (limit to 10,000 for performance)
    const logsStmt = db.prepare(`
      SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id,
        al.details, al.ip_address, al.user_agent, al.created_at,
        u.email as user_email,
        COALESCE(u.first_name || ' ' || u.last_name, u.username, u.email) as user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT 10000
    `)

    const { results: logs } = await logsStmt.bind(...params).all()

    // Generate CSV content
    const csvHeaders = ['Timestamp', 'User', 'Email', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Details']
    const csvRows = [csvHeaders.join(',')]

    for (const log of (logs || [])) {
      const row = [
        `"${new Date((log as any).created_at).toISOString()}"`,
        `"${(log as any).user_name || 'Unknown'}"`,
        `"${(log as any).user_email || 'N/A'}"`,
        `"${(log as any).action}"`,
        `"${(log as any).resource_type || 'N/A'}"`,
        `"${(log as any).resource_id || 'N/A'}"`,
        `"${(log as any).ip_address || 'N/A'}"`,
        `"${(log as any).details ? JSON.stringify(JSON.parse((log as any).details)) : 'N/A'}"`
      ]
      csvRows.push(row.join(','))
    }

    const csvContent = csvRows.join('\n')

    // Log the export activity
    await logActivity(
      db, user.userId, 'activity.logs_exported', undefined, undefined,
      { filters, count: logs?.length || 0 },
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip'),
      c.req.header('user-agent')
    )

    // Return CSV file
    const filename = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`
    
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error) {
    console.error('Activity logs export error:', error)
    return c.json({ error: 'Failed to export activity logs' }, 500)
  }
})

export { userRoutes }
/**
 * Users Management Page
 *
 * Displays and manages system users
 */

import React, { useState } from 'react'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor' | 'author' | 'viewer'
  status: 'active' | 'inactive'
  lastLogin: string
}

// Mock data for now
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@sonicjs.com',
    role: 'admin',
    status: 'active',
    lastLogin: '2024-03-16',
  },
  {
    id: '2',
    name: 'John Editor',
    email: 'editor@sonicjs.com',
    role: 'editor',
    status: 'active',
    lastLogin: '2024-03-15',
  },
  {
    id: '3',
    name: 'Jane Author',
    email: 'author@sonicjs.com',
    role: 'author',
    status: 'active',
    lastLogin: '2024-03-14',
  },
]

function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error'
      case 'editor':
        return 'warning'
      case 'author':
        return 'info'
      case 'viewer':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Users</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage system users and permissions
          </p>
        </div>
        <Button variant="primary" size="md">
          <PlusIcon className="w-5 h-5 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="author">Author</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Email
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Role
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Last Login
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {user.name}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                    {user.email}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={getRoleColor(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                    {user.lastLogin}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              No users found
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default UsersPage

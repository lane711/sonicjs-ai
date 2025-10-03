/**
 * Activity Logs Page
 *
 * Displays system activity logs and audit trail
 */

import React, { useState } from 'react'
import { ClockIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ActivityLog {
  id: string
  action: string
  user: string
  timestamp: string
  type: 'create' | 'update' | 'delete' | 'login' | 'error'
  details: string
  ipAddress: string
}

// Mock data for now
const mockLogs: ActivityLog[] = [
  {
    id: '1',
    action: 'Content Created',
    user: 'Admin User',
    timestamp: '2024-03-16 10:30:00',
    type: 'create',
    details: 'Created new page: "Welcome to SonicJS"',
    ipAddress: '192.168.1.1',
  },
  {
    id: '2',
    action: 'User Login',
    user: 'John Editor',
    timestamp: '2024-03-16 10:15:00',
    type: 'login',
    details: 'Successful login',
    ipAddress: '192.168.1.2',
  },
  {
    id: '3',
    action: 'Media Uploaded',
    user: 'Admin User',
    timestamp: '2024-03-16 09:45:00',
    type: 'create',
    details: 'Uploaded image: hero-image.jpg',
    ipAddress: '192.168.1.1',
  },
  {
    id: '4',
    action: 'Settings Updated',
    user: 'Admin User',
    timestamp: '2024-03-16 09:30:00',
    type: 'update',
    details: 'Updated site settings',
    ipAddress: '192.168.1.1',
  },
  {
    id: '5',
    action: 'Login Failed',
    user: 'unknown',
    timestamp: '2024-03-16 08:00:00',
    type: 'error',
    details: 'Failed login attempt for user@example.com',
    ipAddress: '10.0.0.1',
  },
]

function ActivityLogsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filteredLogs = mockLogs.filter(log => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || log.type === typeFilter
    return matchesSearch && matchesType
  })

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'create':
        return 'success'
      case 'update':
        return 'info'
      case 'delete':
        return 'error'
      case 'login':
        return 'secondary'
      case 'error':
        return 'error'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Activity Logs</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Monitor system activity and audit trail
        </p>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search activity logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="error">Error</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Activity Logs List */}
      <Card>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                  <ClockIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                      {log.action}
                    </h3>
                    <Badge variant={getTypeBadgeVariant(log.type)}>
                      {log.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    {log.details}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-500">
                    <span>User: {log.user}</span>
                    <span>•</span>
                    <span>{log.timestamp}</span>
                    <span>•</span>
                    <span>IP: {log.ipAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            No activity logs found
          </div>
        )}
      </Card>
    </div>
  )
}

export default ActivityLogsPage

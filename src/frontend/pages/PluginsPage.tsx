/**
 * Plugins Management Page
 *
 * Displays and manages installed plugins
 */

import React, { useState } from 'react'
import { PuzzlePieceIcon, MagnifyingGlassIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface Plugin {
  id: string
  name: string
  description: string
  version: string
  author: string
  status: 'active' | 'inactive'
  hasSettings: boolean
}

// Mock data for now
const mockPlugins: Plugin[] = [
  {
    id: '1',
    name: 'Authentication',
    description: 'User authentication and authorization',
    version: '1.0.0',
    author: 'SonicJS',
    status: 'active',
    hasSettings: true,
  },
  {
    id: '2',
    name: 'Media Manager',
    description: 'Image and file upload management',
    version: '2.1.0',
    author: 'SonicJS',
    status: 'active',
    hasSettings: true,
  },
  {
    id: '3',
    name: 'Email Templates',
    description: 'Create and manage email templates',
    version: '1.5.0',
    author: 'Community',
    status: 'inactive',
    hasSettings: true,
  },
  {
    id: '4',
    name: 'Analytics',
    description: 'Track user behavior and site statistics',
    version: '3.0.0',
    author: 'SonicJS',
    status: 'active',
    hasSettings: false,
  },
]

function PluginsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredPlugins = mockPlugins.filter(plugin => {
    const matchesSearch =
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || plugin.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Plugins</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage and configure plugins
          </p>
        </div>
        <Button variant="primary" size="md">
          <PuzzlePieceIcon className="w-5 h-5 mr-2" />
          Install Plugin
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
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Plugins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlugins.map((plugin) => (
          <Card key={plugin.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/20">
                  <PuzzlePieceIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {plugin.name}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    v{plugin.version}
                  </p>
                </div>
              </div>
              <Badge variant={plugin.status === 'active' ? 'success' : 'secondary'}>
                {plugin.status}
              </Badge>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              {plugin.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                by {plugin.author}
              </p>
              <div className="flex gap-2">
                {plugin.hasSettings && (
                  <Button variant="secondary" size="sm">
                    <Cog6ToothIcon className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant={plugin.status === 'active' ? 'outline' : 'primary'}
                  size="sm"
                >
                  {plugin.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <Card>
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            No plugins found
          </div>
        </Card>
      )}
    </div>
  )
}

export default PluginsPage

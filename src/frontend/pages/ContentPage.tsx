/**
 * Content Management Page
 *
 * Displays and manages content items
 */

import React, { useState } from 'react'
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface ContentItem {
  id: string
  title: string
  contentType: string
  status: 'draft' | 'published' | 'archived'
  author: string
  updatedAt: string
}

// Mock data for now
const mockContent: ContentItem[] = [
  {
    id: '1',
    title: 'Welcome to SonicJS',
    contentType: 'Page',
    status: 'published',
    author: 'Admin User',
    updatedAt: '2024-03-15',
  },
  {
    id: '2',
    title: 'About Us',
    contentType: 'Page',
    status: 'published',
    author: 'Admin User',
    updatedAt: '2024-03-14',
  },
  {
    id: '3',
    title: 'Blog Post Draft',
    contentType: 'Blog Post',
    status: 'draft',
    author: 'Admin User',
    updatedAt: '2024-03-16',
  },
]

function ContentPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredContent = mockContent.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'success'
      case 'draft':
        return 'warning'
      case 'archived':
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Content</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage your content items
          </p>
        </div>
        <Button variant="primary" size="md">
          <PlusIcon className="w-5 h-5 mr-2" />
          New Content
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
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <Button variant="secondary" size="md">
              <FunnelIcon className="w-5 h-5 mr-2" />
              Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Content List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Title
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Author
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Updated
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredContent.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                    {item.contentType}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                    {item.author}
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                    {item.updatedAt}
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

          {filteredContent.length === 0 && (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              No content items found
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default ContentPage

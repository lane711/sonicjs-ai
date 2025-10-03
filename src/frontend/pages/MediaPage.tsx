/**
 * Media Library Page
 *
 * Displays and manages media files
 */

import React, { useState } from 'react'
import { ArrowUpTrayIcon, MagnifyingGlassIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

interface MediaFile {
  id: string
  filename: string
  type: 'image' | 'video' | 'document'
  size: string
  uploadedAt: string
  url: string
}

// Mock data for now
const mockMedia: MediaFile[] = [
  {
    id: '1',
    filename: 'hero-image.jpg',
    type: 'image',
    size: '2.4 MB',
    uploadedAt: '2024-03-15',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926',
  },
  {
    id: '2',
    filename: 'logo.png',
    type: 'image',
    size: '156 KB',
    uploadedAt: '2024-03-14',
    url: 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41',
  },
  {
    id: '3',
    filename: 'documentation.pdf',
    type: 'document',
    size: '1.8 MB',
    uploadedAt: '2024-03-13',
    url: '#',
  },
]

function MediaPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filteredMedia = mockMedia.filter(item => {
    const matchesSearch = item.filename.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || item.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Media Library</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage your media files
          </p>
        </div>
        <Button variant="primary" size="md">
          <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
          Upload Files
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
                placeholder="Search media..."
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
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="document">Documents</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMedia.map((item) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={item.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <PhotoIcon className="w-16 h-16 text-zinc-400" />
              )}
            </div>
            <div className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {item.filename}
              </h3>
              <div className="mt-2 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
                <span>{item.size}</span>
                <span>{item.uploadedAt}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1">
                  View
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredMedia.length === 0 && (
        <Card>
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
            No media files found
          </div>
        </Card>
      )}
    </div>
  )
}

export default MediaPage

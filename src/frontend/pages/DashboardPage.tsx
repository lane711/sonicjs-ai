/**
 * Dashboard Page
 *
 * Main admin dashboard showcasing Catalyst design system components
 */

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Tag,
  Modal,
  ModalFooter,
} from '@/components/ui'

export default function DashboardPage() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Welcome back, {user?.firstName}! Here's what's happening today.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Content Items</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">0</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Total content in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Collections</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">0</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Content collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Media Files</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">0</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Files in library</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Active Users</p>
                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">0</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Users in system</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Phase 2 completion card */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Phase 2 Complete: Catalyst Design System</CardTitle>
              <CardDescription>All UI components have been implemented and are ready to use</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Components Created:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="primary">Button</Badge>
                  <Badge variant="primary">Input</Badge>
                  <Badge variant="primary">Textarea</Badge>
                  <Badge variant="primary">Select</Badge>
                  <Badge variant="primary">Card</Badge>
                  <Badge variant="primary">Badge</Badge>
                  <Badge variant="primary">Tag</Badge>
                  <Badge variant="primary">Modal</Badge>
                  <Badge variant="primary">Checkbox</Badge>
                  <Badge variant="primary">Radio</Badge>
                  <Badge variant="primary">Switch</Badge>
                  <Badge variant="primary">AdminLayout</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Features:</p>
                <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                  <li>✅ Fully typed TypeScript components</li>
                  <li>✅ Dark mode support throughout</li>
                  <li>✅ Accessible components (ARIA labels, keyboard navigation)</li>
                  <li>✅ Responsive design for all screen sizes</li>
                  <li>✅ Consistent Catalyst color palette</li>
                  <li>✅ Component variants and sizes</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => setIsModalOpen(true)}>Test Modal</Button>
                <Button variant="secondary">Secondary Button</Button>
                <Button variant="outline">Outline Button</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Quick actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button fullWidth variant="outline" size="sm">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Content
              </Button>
              <Button fullWidth variant="outline" size="sm">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Media
              </Button>
              <Button fullWidth variant="outline" size="sm">
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add User
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">API Status</span>
                <Badge variant="success" size="sm">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Database</span>
                <Badge variant="success" size="sm">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Cache</span>
                <Badge variant="success" size="sm">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Example Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        description="This is a demonstration of the Modal component from the Catalyst design system."
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            The modal component supports various sizes, custom headers, and flexible content. It uses Headless UI
            for accessibility and smooth transitions.
          </p>

          <div className="flex flex-wrap gap-2">
            <Tag variant="primary" removable onRemove={() => console.log('Removed')}>
              Primary Tag
            </Tag>
            <Tag variant="success">Success Tag</Tag>
            <Tag variant="warning">Warning Tag</Tag>
            <Tag variant="danger">Danger Tag</Tag>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsModalOpen(false)}>Got it</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

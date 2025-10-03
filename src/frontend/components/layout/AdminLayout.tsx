import React, { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/Logo'

interface MenuItem {
  label: string
  href: string
  icon: React.ReactNode
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
      </svg>
    ),
  },
  {
    label: 'Collections',
    href: '/admin/collections',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
      </svg>
    ),
  },
  {
    label: 'Content',
    href: '/admin/content',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    label: 'Media',
    href: '/admin/media',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
      </svg>
    ),
  },
  {
    label: 'Users',
    href: '/admin/users',
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
      </svg>
    ),
  },
  {
    label: 'Plugins',
    href: '/admin/plugins',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
      </svg>
    ),
  },
  {
    label: 'Design',
    href: '/admin/design',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"/>
      </svg>
    ),
  },
  {
    label: 'Logs',
    href: '/admin/logs',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    ),
  },
  {
    label: 'API Reference',
    href: '/admin/api-reference',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
      </svg>
    ),
  },
  {
    label: 'Field Types',
    href: '/admin/field-types',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
      </svg>
    ),
  },
]

const settingsMenuItem = {
  label: 'Settings',
  href: '/admin/settings',
  icon: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
    </svg>
  ),
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="relative isolate flex min-h-svh w-full max-lg:flex-col lg:bg-zinc-100 dark:lg:bg-zinc-950">
      {/* Desktop Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 max-lg:hidden">
        <nav className="flex h-full min-h-0 flex-col bg-white shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
          {/* Logo */}
          <div className="flex flex-col border-b border-zinc-950/5 p-4 dark:border-white/5">
            <Logo size="md" variant="white" showText />
          </div>

          {/* Navigation */}
          <div className="flex flex-1 flex-col overflow-y-auto p-4">
            <div className="flex flex-col gap-0.5">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href))
                return (
                  <span key={item.href} className="relative">
                    {isActive && (
                      <span className="absolute inset-y-2 -left-4 w-0.5 rounded-full bg-cyan-500 dark:bg-cyan-400"></span>
                    )}
                    <NavLink
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-base/6 font-medium transition-colors sm:text-sm/5',
                        isActive
                          ? 'bg-zinc-950/5 text-zinc-950 dark:bg-white/5 dark:text-white'
                          : 'text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white'
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </NavLink>
                  </span>
                )
              })}
            </div>
          </div>

          {/* Settings */}
          <div className="flex flex-col border-t border-zinc-950/5 p-4 dark:border-white/5">
            <NavLink
              to={settingsMenuItem.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-base/6 font-medium transition-colors sm:text-sm/5',
                location.pathname === settingsMenuItem.href
                  ? 'bg-zinc-950/5 text-zinc-950 dark:bg-white/5 dark:text-white'
                  : 'text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white'
              )}
            >
              {settingsMenuItem.icon}
              {settingsMenuItem.label}
            </NavLink>
          </div>

          {/* User */}
          <div className="relative flex flex-col border-t border-zinc-950/5 p-4 dark:border-white/5">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-zinc-950/5 dark:hover:bg-white/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-white dark:text-zinc-900">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-zinc-950 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</p>
              </div>
            </button>

            {userDropdownOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-2 rounded-lg bg-white p-1 shadow-lg ring-1 ring-zinc-950/5 dark:bg-zinc-800 dark:ring-white/10">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          'fixed inset-y-0 left-0 w-80 transform transition-transform duration-300 ease-in-out lg:hidden z-50',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex h-full min-h-0 flex-col bg-white shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10 rounded-lg p-2 m-2">
          {/* Close Button */}
          <div className="-mb-3 px-4 pt-3">
            <button
              onClick={() => setSidebarOpen(false)}
              className="relative flex w-full items-center gap-3 rounded-lg p-2 text-left text-base/6 font-medium text-zinc-950 hover:bg-zinc-950/5 dark:text-white dark:hover:bg-white/5 sm:text-sm/5"
            >
              <svg className="h-5 w-5 shrink-0 fill-zinc-500 dark:fill-zinc-400" viewBox="0 0 20 20">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
              <span>Close menu</span>
            </button>
          </div>

          {/* Logo */}
          <div className="flex flex-col border-b border-zinc-950/5 p-4 dark:border-white/5">
            <Logo size="md" variant="white" showText />
          </div>

          {/* Same navigation as desktop */}
          <div className="flex flex-1 flex-col overflow-y-auto p-4">
            <div className="flex flex-col gap-0.5">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href))
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-base/6 font-medium transition-colors sm:text-sm/5',
                      isActive
                        ? 'bg-zinc-950/5 text-zinc-950 dark:bg-white/5 dark:text-white'
                        : 'text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white'
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pr-2 lg:pl-64">
        {/* Mobile Header */}
        <header className="flex items-center px-4 py-2.5 lg:hidden border-b border-zinc-950/5 dark:border-white/5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="relative flex items-center justify-center rounded-lg p-2 text-zinc-950 hover:bg-zinc-950/5 dark:text-white dark:hover:bg-white/5"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6.75C2 6.33579 2.33579 6 2.75 6H17.25C17.6642 6 18 6.33579 18 6.75C18 7.16421 17.6642 7.5 17.25 7.5H2.75C2.33579 7.5 2 7.16421 2 6.75ZM2 13.25C2 12.8358 2.33579 12.5 2.75 12.5H17.25C17.6642 12.5 18 12.8358 18 13.25C18 13.6642 17.6642 14 17.25 14H2.75C2.33579 14 2 13.6642 2 13.25Z" />
            </svg>
          </button>
          <div className="ml-4 flex-1">
            <Logo size="sm" variant="white" showText />
          </div>
        </header>

        {/* Content */}
        <div className="grow p-6 lg:rounded-lg lg:bg-white lg:p-10 lg:shadow-sm lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

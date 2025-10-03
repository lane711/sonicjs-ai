import React from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Logo } from '@/components/Logo'
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from '@/components/catalyst/sidebar'
import { SidebarLayout } from '@/components/catalyst/sidebar-layout'

function HomeIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
    </svg>
  )
}

function CollectionsIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor">
      <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
    </svg>
  )
}

function ContentIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
    </svg>
  )
}

function MediaIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor">
      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
    </svg>
  )
}

function PluginsIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
    </svg>
  )
}

function DesignIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"/>
    </svg>
  )
}

function LogsIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  )
}

function APIIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
    </svg>
  )
}

function FieldTypesIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd"/>
    </svg>
  )
}

export function AdminLayoutCatalyst() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/auth/login')
  }

  return (
    <SidebarLayout
      navbar={<Logo size="sm" variant="white" showText />}
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <Logo size="md" variant="white" showText />
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              <SidebarItem href="/admin" current={location.pathname === '/admin'}>
                <HomeIcon />
                <SidebarLabel>Dashboard</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/admin/collections" current={location.pathname.startsWith('/admin/collections')}>
                <CollectionsIcon />
                <SidebarLabel>Collections</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/admin/content" current={location.pathname.startsWith('/admin/content')}>
                <ContentIcon />
                <SidebarLabel>Content</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/admin/media" current={location.pathname.startsWith('/admin/media')}>
                <MediaIcon />
                <SidebarLabel>Media</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/admin/users" current={location.pathname.startsWith('/admin/users')}>
                <UsersIcon />
                <SidebarLabel>Users</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/admin/plugins" current={location.pathname.startsWith('/admin/plugins')}>
                <PluginsIcon />
                <SidebarLabel>Plugins</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/admin/design" current={location.pathname.startsWith('/admin/design')}>
                <DesignIcon />
                <SidebarLabel>Design</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/admin/logs" current={location.pathname.startsWith('/admin/logs')}>
                <LogsIcon />
                <SidebarLabel>Logs</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/admin/api-reference" current={location.pathname.startsWith('/admin/api-reference')}>
                <APIIcon />
                <SidebarLabel>API Reference</SidebarLabel>
              </SidebarItem>
              <SidebarItem href="/admin/field-types" current={location.pathname.startsWith('/admin/field-types')}>
                <FieldTypesIcon />
                <SidebarLabel>Field Types</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
          </SidebarBody>
          <SidebarFooter>
            <SidebarSection>
              <SidebarItem href="/admin/settings" current={location.pathname.startsWith('/admin/settings')}>
                <SettingsIcon />
                <SidebarLabel>Settings</SidebarLabel>
              </SidebarItem>
            </SidebarSection>
            <SidebarSection>
              <SidebarItem onClick={handleLogout}>
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-white dark:text-zinc-900">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <SidebarLabel>
                  <span className="truncate">{user?.firstName} {user?.lastName}</span>
                </SidebarLabel>
                <ChevronDownIcon />
              </SidebarItem>
            </SidebarSection>
          </SidebarFooter>
        </Sidebar>
      }
    >
      <Outlet />
    </SidebarLayout>
  )
}

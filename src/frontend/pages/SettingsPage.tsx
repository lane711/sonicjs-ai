/**
 * Settings Page
 *
 * Displays and manages system settings
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Switch } from '@/components/ui/Switch'

function SettingsPage() {
  const [siteName, setSiteName] = useState('SonicJS')
  const [siteDescription, setSiteDescription] = useState('A fast, modern CMS built with React')
  const [allowRegistration, setAllowRegistration] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [enableComments, setEnableComments] = useState(true)

  const handleSave = () => {
    alert('Settings saved successfully!')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Configure your system settings
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            General Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="siteName" className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Site Name
              </label>
              <Input
                id="siteName"
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Enter site name"
              />
            </div>
            <div>
              <label htmlFor="siteDescription" className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                Site Description
              </label>
              <Input
                id="siteDescription"
                type="text"
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                placeholder="Enter site description"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Security Settings */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Security Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Allow User Registration
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Allow new users to register accounts
                </p>
              </div>
              <Switch
                checked={allowRegistration}
                onChange={setAllowRegistration}
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Maintenance Mode
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Put the site in maintenance mode
                </p>
              </div>
              <Switch
                checked={maintenanceMode}
                onChange={setMaintenanceMode}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Content Settings */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Content Settings
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Enable Comments
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Allow comments on content
                </p>
              </div>
              <Switch
                checked={enableComments}
                onChange={setEnableComments}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* API Settings */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            API Settings
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                API Key
              </label>
              <div className="flex gap-2">
                <Input
                  id="apiKey"
                  type="text"
                  value="••••••••••••••••"
                  readOnly
                  className="flex-1"
                />
                <Button variant="secondary" size="md">
                  Regenerate
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" size="md">
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}

export default SettingsPage

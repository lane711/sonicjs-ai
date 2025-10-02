import React from 'react'
import { Switch as HeadlessSwitch } from '@headlessui/react'
import { cn } from '@/lib/utils'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
  sm: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translate: 'translate-x-4',
  },
  md: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5',
  },
  lg: {
    track: 'h-7 w-14',
    thumb: 'h-6 w-6',
    translate: 'translate-x-7',
  },
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  size = 'md',
}: SwitchProps) {
  const styles = sizeStyles[size]

  return (
    <HeadlessSwitch.Group>
      <div className="flex items-start gap-3">
        <HeadlessSwitch
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            styles.track,
            'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            checked
              ? 'bg-indigo-600'
              : 'bg-zinc-200 dark:bg-zinc-700'
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              styles.thumb,
              checked ? styles.translate : 'translate-x-0',
              'pointer-events-none inline-block transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out'
            )}
          />
        </HeadlessSwitch>

        {(label || description) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <HeadlessSwitch.Label
                className="cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >
                {label}
              </HeadlessSwitch.Label>
            )}
            {description && (
              <HeadlessSwitch.Description className="text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </HeadlessSwitch.Description>
            )}
          </div>
        )}
      </div>
    </HeadlessSwitch.Group>
  )
}

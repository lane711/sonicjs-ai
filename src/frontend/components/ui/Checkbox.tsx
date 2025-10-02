import React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helperText?: string
  error?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, helperText, error, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start gap-3">
          <div className="flex h-5 items-center">
            <input
              ref={ref}
              type="checkbox"
              id={checkboxId}
              className={cn(
                'h-4 w-4 rounded border transition-colors',
                'border-zinc-300 dark:border-zinc-700',
                'bg-white dark:bg-zinc-900',
                'text-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-0',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'cursor-pointer',
                error && 'border-red-500 focus:ring-red-500',
                className
              )}
              {...props}
            />
          </div>

          {label && (
            <label
              htmlFor={checkboxId}
              className="flex-1 cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100"
            >
              {label}
            </label>
          )}
        </div>

        {error && <p className="ml-7 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {helperText && !error && (
          <p className="ml-7 text-sm text-zinc-500 dark:text-zinc-400">{helperText}</p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

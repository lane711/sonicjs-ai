import React from 'react'
import { cn } from '@/lib/utils'

export interface RadioOption {
  value: string
  label: string
  helperText?: string
  disabled?: boolean
}

export interface RadioGroupProps {
  name: string
  label?: string
  options: RadioOption[]
  value?: string
  onChange?: (value: string) => void
  error?: string
  orientation?: 'vertical' | 'horizontal'
}

export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  error,
  orientation = 'vertical',
}: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {label}
        </label>
      )}

      <div
        className={cn(
          'flex gap-4',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            helperText={option.helperText}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            disabled={option.disabled}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  helperText?: string
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, helperText, id, value, ...props }, ref) => {
    const radioId = id || `radio-${value}`

    return (
      <div className="flex items-start gap-3">
        <div className="flex h-5 items-center">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            value={value}
            className={cn(
              'h-4 w-4 rounded-full border transition-colors',
              'border-zinc-300 dark:border-zinc-700',
              'bg-white dark:bg-zinc-900',
              'text-indigo-600 focus:ring-2 focus:ring-indigo-600 focus:ring-offset-0',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'cursor-pointer',
              className
            )}
            {...props}
          />
        </div>

        {(label || helperText) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={radioId}
                className="cursor-pointer text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >
                {label}
              </label>
            )}
            {helperText && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{helperText}</p>
            )}
          </div>
        )}
      </div>
    )
  }
)

Radio.displayName = 'Radio'

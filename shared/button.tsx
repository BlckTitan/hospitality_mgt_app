'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../lib/utils'

export type ButtonVariant =
  | 'dark'
  | 'secondary'
  | 'outline-dark'
  | 'outline-secondary'
  | 'outline-danger'
  | 'outline-primary'
  | 'outline-success'
  | 'outline'
  | 'light'
  | 'white'
  | 'danger'
  | 'primary'
  | 'success'
  | 'warning'
  | 'link'

export type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  dark: 'bg-neutral-900 text-white border-neutral-900 hover:bg-neutral-800',
  primary: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
  secondary: 'bg-neutral-200 text-neutral-900 border-neutral-200 hover:bg-neutral-300',
  light: 'bg-neutral-100 text-neutral-900 border-neutral-200 hover:bg-neutral-200',
  white: 'bg-white text-neutral-900 border-neutral-200 hover:bg-neutral-50',
  danger: 'bg-red-600 text-white border-red-600 hover:bg-red-700',
  success: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
  warning: 'bg-amber-500 text-neutral-900 border-amber-500 hover:bg-amber-400',
  'outline-dark': 'bg-transparent text-neutral-900 border-neutral-900 hover:bg-neutral-900 hover:text-white',
  'outline-secondary': 'bg-transparent text-neutral-600 border-neutral-400 hover:bg-neutral-100',
  'outline-danger': 'bg-transparent text-red-600 border-red-600 hover:bg-red-50',
  'outline-primary': 'bg-transparent text-blue-600 border-blue-600 hover:bg-blue-50',
  'outline-success': 'bg-transparent text-emerald-600 border-emerald-600 hover:bg-emerald-50',
  outline: 'bg-transparent text-neutral-800 border-neutral-400 hover:bg-neutral-100',
  link: 'bg-transparent text-blue-600 border-transparent underline-offset-2 hover:underline px-0',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Square control with a fully round border, for icon-only actions such as +. */
  circle?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = 'dark', size = 'md', type = 'button', disabled, circle = false, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 border font-medium transition-colors',
          'disabled:pointer-events-none disabled:opacity-50',
          circle ? 'size-10 shrink-0 rounded-full p-0' : 'rounded-md',
          variantClasses[variant] ?? variantClasses.dark,
          circle ? null : (sizeClasses[size] ?? sizeClasses.md),
          className,
        )}
        {...props}
      />
    )
  },
)

export default Button

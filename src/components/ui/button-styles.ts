import { cn } from '@/lib/utils'

const variants = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:bg-brand-600/60',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 shadow-xs hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
}

const sizes = {
  sm: 'h-8 gap-1.5 px-3 text-sm',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-11 gap-2 px-5 text-base',
  icon: 'size-9',
}

export interface ButtonStyleProps {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export function buttonClass({ variant = 'primary', size = 'md' }: ButtonStyleProps = {}, className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:size-4',
    variants[variant],
    sizes[size],
    className,
  )
}

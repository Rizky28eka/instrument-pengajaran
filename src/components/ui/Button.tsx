import type { ComponentProps } from 'react'
import { LoaderCircle } from 'lucide-react'
import { buttonClass, type ButtonStyleProps } from './button-styles'

export function Button({
  variant,
  size,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ComponentProps<'button'> & ButtonStyleProps & { loading?: boolean }) {
  return (
    <button type={type} className={buttonClass({ variant, size }, className)} disabled={disabled || loading} {...props}>
      {loading && <LoaderCircle className="animate-spin" />}
      {children}
    </button>
  )
}

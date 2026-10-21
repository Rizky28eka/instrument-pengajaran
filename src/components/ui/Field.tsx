import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const control =
  'block w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 transition focus:ring-2 focus:ring-brand-500 focus:outline-none aria-invalid:ring-rose-400'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(control, 'pr-9', className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 resize-y', className)} {...props} />
}

/** Label + kontrol + pesan error. `children` menerima id untuk dipasang ke kontrol. */
export function Field({
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: ReactNode
  error?: string
  hint?: ReactNode
  required?: boolean
  className?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}) {
  const id = useId()
  const msgId = `${id}-msg`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': error || hint ? msgId : undefined })}
      {error ? (
        <p id={msgId} className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={msgId} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

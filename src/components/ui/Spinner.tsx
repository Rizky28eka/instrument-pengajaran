import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-6 animate-spin text-brand-600', className)} aria-label="Memuat" />
}

export function FullPageLoader() {
  return (
    <div className="grid min-h-svh place-items-center">
      <Spinner className="size-8" />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="grid min-h-64 place-items-center">
      <Spinner />
    </div>
  )
}

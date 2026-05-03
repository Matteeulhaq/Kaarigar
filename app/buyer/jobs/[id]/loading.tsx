import { Skeleton } from '@/components/ui/skeleton'

export default function JobDetailLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="rounded-xl border p-4 space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  )
}

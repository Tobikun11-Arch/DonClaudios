function ProductDetailSkeleton() {
  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
      <div className="w-full">
        <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-200 border border-gray-100 animate-pulse" />
      </div>

      <div className="w-full">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="h-6 w-2/3 rounded-full bg-gray-200 animate-pulse" />
            <div className="mt-2 h-4 w-1/3 rounded-full bg-gray-200 animate-pulse" />
          </div>
          <div className="shrink-0">
            <div className="h-5 w-20 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </div>

        <div className="mt-4 h-6 w-14 rounded-full bg-gray-200 animate-pulse" />

        <div className="mt-4 space-y-2">
          <div className="h-3 w-full rounded-full bg-gray-200 animate-pulse" />
          <div className="h-3 w-4/5 rounded-full bg-gray-200 animate-pulse" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="h-6 w-20 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-6 w-16 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-6 w-24 rounded-full bg-gray-200 animate-pulse" />
        </div>

        <div className="mt-8">
          <div className="h-4 w-1/2 rounded-full bg-gray-200 animate-pulse" />
          <div className="mt-2 h-3 w-2/3 rounded-full bg-gray-200 animate-pulse" />
          <div className="mt-3 h-28 rounded-xl bg-gray-200 animate-pulse" />
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center justify-start gap-3">
            <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-6 w-6 rounded bg-gray-200 animate-pulse" />
            <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse" />
          </div>
          <div className="h-12 w-full sm:flex-1 min-w-0 rounded-full bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default ProductDetailSkeleton;
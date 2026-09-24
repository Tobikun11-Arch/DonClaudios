function MenuCardSkeleton() {
  return (
    <div className="relative min-h-[240px] rounded-[20px] bg-white border border-gray-200 shadow-sm px-4 pt-28 pb-6">
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-1/4 h-[112px] w-[112px] rounded-full ring-4 ring-white bg-gray-200 animate-pulse" />
      <div className="pointer-events-none text-center">
        <div className="mx-auto h-[18px] w-3/4 rounded-full bg-gray-200 animate-pulse" />
        <div className="mx-auto mt-2 h-[12px] w-1/2 rounded-full bg-gray-200 animate-pulse" />
        <div className="mx-auto mt-5 flex items-start justify-start pr-12">
          <div className="h-[17px] w-16 rounded-full bg-gray-200 animate-pulse" />
        </div>
      </div>
      <div className="absolute bottom-6 right-4 w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
    </div>
  );
}

export default MenuCardSkeleton;
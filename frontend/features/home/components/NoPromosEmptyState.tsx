'use client';

export default function NoPromosEmptyState() {
  return (
    <div className="relative mx-auto flex min-h-[360px] w-full max-w-xl items-center justify-center overflow-hidden rounded-3xl px-4 py-8 sm:min-h-[420px] sm:px-8">
      <div className="absolute top-5 left-5 grid grid-cols-3 gap-[6px] opacity-10 pointer-events-none">
        {Array.from({length: 6}).map((_, i) => (
          <div key={i} className="w-[6px] h-[6px] rounded-full bg-[#3c5e45]" />
        ))}
      </div>
      <div className="absolute bottom-5 right-5 grid grid-cols-3 gap-[6px] opacity-10 pointer-events-none">
        {Array.from({length: 6}).map((_, i) => (
          <div key={i} className="w-[6px] h-[6px] rounded-full bg-[#3c5e45]" />
        ))}
      </div>

      <div className="relative z-10 flex w-full flex-col items-center text-center">
        <div className="relative mb-6 inline-block sm:mb-7">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-[6px]">
            {[0, 0.4, 0.8].map((delay, i) => (
              <span
                key={i}
                className="block w-[6px] rounded-full bg-[#3c5e45]/20 animate-bounce"
                style={{
                  height: i === 1 ? '26px' : '20px',
                  animationDelay: `${delay}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
          <svg
            className="h-24 w-24 sm:h-28 sm:w-28"
            style={{animation: 'pigFloat 3s ease-in-out infinite'}}
            viewBox="0 0 120 120"
            xmlns="http://www.w3.org/2000/svg"
          >
            <style>{`
              @keyframes pigFloat {
                0%, 100% { transform: translateY(0px) rotate(-2deg); }
                50% { transform: translateY(-10px) rotate(2deg); }
              }
            `}</style>
            <ellipse cx="60" cy="72" rx="42" ry="30" fill="#e8734a" />
            <ellipse cx="60" cy="62" rx="36" ry="32" fill="#f08060" />
            <circle cx="42" cy="52" r="10" fill="#f9a87a" />
            <circle cx="78" cy="52" r="10" fill="#f9a87a" />
            <circle cx="40" cy="50" r="6" fill="#fff" />
            <circle cx="80" cy="50" r="6" fill="#fff" />
            <circle cx="41" cy="51" r="3" fill="#2a1a0e" />
            <circle cx="81" cy="51" r="3" fill="#2a1a0e" />
            <ellipse cx="60" cy="72" rx="18" ry="12" fill="#e8734a" />
            <ellipse cx="60" cy="71" rx="10" ry="7" fill="#d45a35" />
            <circle cx="56" cy="70" r="2.5" fill="#2a1a0e" />
            <circle cx="64" cy="70" r="2.5" fill="#2a1a0e" />
            <path
              d="M50 82 Q60 90 70 82"
              stroke="#d45a35"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <ellipse
              cx="26"
              cy="66"
              rx="8"
              ry="5"
              fill="#e8734a"
              transform="rotate(-20 26 66)"
            />
            <ellipse
              cx="94"
              cy="66"
              rx="8"
              ry="5"
              fill="#e8734a"
              transform="rotate(20 94 66)"
            />
            <path d="M55 38 Q52 26 46 24 Q50 30 48 36" fill="#f08060" />
            <path d="M65 38 Q68 26 74 24 Q70 30 72 36" fill="#f08060" />
            <path d="M80 88 Q78 98 72 100 Q76 96 75 90" fill="#e8734a" />
            <path d="M40 88 Q42 98 48 100 Q44 96 45 90" fill="#e8734a" />
          </svg>
        </div>

        <span className="mb-4 inline-block rounded-full bg-[#3c5e45]/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-[#3c5e45]">
          Check back soon
        </span>

        <h3 className="mb-3 text-2xl font-bold leading-tight text-[#3c5e45] sm:text-3xl">
          The lechon is resting 🍖
        </h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[#3c5e45]/75 sm:text-base">
          No active promos right now, but our best deals are always just around
          the corner. Be the first to know!
        </p>
      </div>
    </div>
  );
}

import Link from 'next/link'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-md text-muted-foreground">
        It looks like you&apos;ve lost your connection. Some pages you&apos;ve visited recently may
        still be available. Reconnect to place orders and see the latest menu.
      </p>
      <Link
        href="/"
        className="rounded-md bg-[#b91c1c] px-4 py-2 text-white hover:opacity-90"
      >
        Try again
      </Link>
    </main>
  )
}

import Link from "next/link"

export default function Home() {
 return (
  <main>
    <h1>Welcome to main route</h1>
    <Link href="/sign-up">Sign Up</Link>
    <Link href="/sign-in">Sign In</Link>
  </main>
 )
}

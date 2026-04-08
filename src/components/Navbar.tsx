'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Interactions', href: '/interactions' },
  { label: 'Follow-Ups', href: '/follow-ups' },
]

export default function Navbar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="Baseline Analytics"
              width={180}
              height={36}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-4 py-2 text-[13px] font-medium tracking-wide uppercase transition-colors ${
                  isActive(item.href)
                    ? 'text-gold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.label}
                {isActive(item.href) && (
                  <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-gold rounded-full" />
                )}
              </Link>
            ))}
          </div>
          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2 py-1.5 text-[11px] font-medium tracking-wide uppercase transition-colors ${
                  isActive(item.href)
                    ? 'text-gold'
                    : 'text-text-secondary'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {/* Gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </nav>
  )
}

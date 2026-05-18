'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Copilot', href: '/copilot' },
  { label: 'Dashboard', href: '/' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Interactions', href: '/interactions' },
  { label: 'Follow-Ups', href: '/follow-ups' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Present', href: '/present' },
  { label: 'Print', href: '/print' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="bg-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="Baseline Analytics"
              width={180}
              height={36}
              className="h-6 sm:h-7 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav */}
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

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-lg hover:bg-dark-elevated transition-colors"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-text-secondary transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-[3px]' : ''}`} />
            <span className={`block w-5 h-0.5 bg-text-secondary mt-1 transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-[3px]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-6 py-3.5 text-sm font-medium tracking-wide uppercase transition-colors ${
                isActive(item.href)
                  ? 'text-gold bg-dark-elevated'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Gold accent line */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </nav>
  )
}

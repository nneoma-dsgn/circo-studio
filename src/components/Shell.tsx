'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/* The dashboard frame: a sidebar of sections on desktop, a top bar on phones. Add each new
   section to NAV. */
const NAV: { href: string; label: string; icon: IconName }[] = [{ href: '/account', label: 'Account', icon: 'user' }]

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname()
  return (
    <div className="studio">
      <aside className="studio__side">
        <Link href="/" className="studio__brand" aria-label="Circo Studio home">
          <img src="/assets/logo-circo.png" alt="Circo" width={74} height={28} />
          <span>Studio</span>
        </Link>
        <nav className="studio__nav" aria-label="Sections">
          {NAV.map((n) => {
            const on = path.startsWith(n.href)
            return (
              <Link key={n.href} href={n.href} className={`studio__link${on ? ' is-on' : ''}`} aria-current={on ? 'page' : undefined}>
                <Icon name={n.icon} size={20} />
                {n.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="studio__main">{children}</main>
    </div>
  )
}

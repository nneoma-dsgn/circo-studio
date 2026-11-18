'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getSession, signOut, updateSession, type Org, type Session } from '../auth'
import { Icon, type IconName } from './Icon'
import { useMenu } from './Menu'

/* The dashboard frame, laid out like a workspace app: on desktop a sidebar with the logo, the
   sections, and at the foot the organization being worked in. That row opens the menu: every
   studio the person is a member of (to switch), Settings, Log Out. On phones a top bar with
   the logo and that menu, and the sections as a tab bar along the bottom. */
const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/studio', label: 'Studio', icon: 'film' },
  { href: '/reach', label: 'Reach', icon: 'megaphone' },
  { href: '/payments', label: 'Payments', icon: 'wallet' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
]

const initial = (s?: string) => (s?.trim()[0] ?? '?').toUpperCase()

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const { toast } = useMenu()
  const [me, setMe] = useState<Session | null>(null)
  useEffect(() => setMe(getSession()), [])

  const who = me?.name || me?.email || 'Your account'
  const org = me?.business || me?.studio
  const orgs: Org[] = me?.orgs?.length ? me.orgs : me?.studio ? [{ business: me.business || me.studio, studio: me.studio }] : []

  const switchTo = (o: Org) => {
    updateSession({ business: o.business, studio: o.studio })
    setMe(getSession())
    toast(`Switched to ${o.business}`)
    router.push('/')
  }

  // The studio menu opens inside the sidebar, above the row (below it on phones), and closes on
  // a click outside, Escape, or moving to another page.
  const [menu, setMenu] = useState(false)
  const foot = useRef<HTMLDivElement>(null)
  useEffect(() => setMenu(false), [path])
  useEffect(() => {
    if (!menu) return
    const away = (e: PointerEvent) => !foot.current?.contains(e.target as Node) && setMenu(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])

  const pick = (fn: () => void) => () => {
    setMenu(false)
    fn()
  }

  return (
    <div className="studio">
      <aside className="studio__side">
        <Link href="/" className="studio__brand" aria-label="Circo Studio home">
          <img src="/assets/logo-circo.png" alt="Circo" width={74} height={28} />
          <span>Studio</span>
        </Link>

        <nav className="studio__nav" aria-label="Sections">
          {NAV.map((n) => {
            // Dashboard is the home page, so it only matches itself.
            const on = n.href === '/' ? path === '/' : path.startsWith(n.href)
            return (
              <Link key={n.href} href={n.href} className={`studio__link${on ? ' is-on' : ''}`} aria-current={on ? 'page' : undefined}>
                <Icon name={n.icon} size={18} />
                <span>{n.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="studio__foot" ref={foot}>
          {menu && (
            <div className="studio__pop" role="menu" aria-label="Your studios">
              {orgs.map((o) => {
                const on = o.business === org
                return (
                  <button key={o.business} type="button" role="menuitemradio" aria-checked={on} className="studio__pop-item" onClick={pick(() => !on && switchTo(o))}>
                    <span className="studio__avatar studio__avatar--sm" aria-hidden>
                      {initial(o.business)}
                    </span>
                    <span className="studio__pop-label">{o.business}</span>
                    {on && <Icon name="check" size={16} />}
                  </button>
                )
              })}
              <div className="studio__pop-sep" role="separator" />
              <button type="button" role="menuitem" className="studio__pop-item" onClick={pick(() => router.push('/settings'))}>
                <Icon name="settings" size={16} />
                <span className="studio__pop-label">Settings</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="studio__pop-item studio__pop-item--danger"
                onClick={pick(() => {
                  signOut()
                  router.replace('/login')
                })}
              >
                <Icon name="logout" size={16} />
                <span className="studio__pop-label">Log Out</span>
              </button>
            </div>
          )}
          <button type="button" className="studio__me" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label={`Switch studio${org ? `, now ${org}` : ''}`}>
            <span className="studio__avatar" aria-hidden>
              {initial(org || who)}
            </span>
            <span className="studio__me-text">
              <strong>{org || who}</strong>
            </span>
            <Icon name="chevrons-up-down" size={16} />
          </button>
        </div>
      </aside>
      <main className="studio__main">{children}</main>
    </div>
  )
}

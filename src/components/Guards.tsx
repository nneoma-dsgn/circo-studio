'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getSession, type Session } from '@/auth'

/* Prototype auth lives in localStorage, so routing decisions happen on the client after mount.
   Swap for real auth (cookie session + middleware) to make these server-side. */
function useSession() {
  const [state, setState] = useState<{ ready: boolean; session: Session | null }>({ ready: false, session: null })
  const pathname = usePathname()
  useEffect(() => {
    setState({ ready: true, session: getSession() })
  }, [pathname])
  return state
}

// Where a session belongs: no studio yet means setup isn't finished.
const home = (s: Session) => (s.studio ? '/' : '/setup')

function useRedirect(target: string | null) {
  const router = useRouter()
  useEffect(() => {
    if (target) router.replace(target)
  }, [target, router])
}

/* The dashboard: signed-out visitors go to Log In; new creators finish setting up their studio first. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, session } = useSession()
  const target = !ready ? null : !session ? '/login' : !session.studio ? '/setup' : null
  useRedirect(target)
  return ready && !target ? <>{children}</> : null
}

/* Log In and Sign Up bounce anyone already signed in. */
export function SignedOut({ children }: { children: ReactNode }) {
  const { ready, session } = useSession()
  const target = !ready ? null : session ? home(session) : null
  useRedirect(target)
  return ready && !target ? <>{children}</> : null
}

/* Studio setup only makes sense right after signing up. */
export function RequireSetup({ children }: { children: ReactNode }) {
  const { ready, session } = useSession()
  const target = !ready ? null : !session ? '/signup' : session.studio ? '/' : null
  useRedirect(target)
  return ready && !target ? <>{children}</> : null
}

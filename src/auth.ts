/* Prototype auth: the session and profile kept in browser storage. The real dashboard shares
   the Circo account (one login for viewers and creators) and checks for the creator role. */
const KEY = 'circo-studio-session'

export type Provider = 'google' | 'apple'
export type Session = { provider: Provider; name?: string; email?: string; gender?: string }

// Until sign-in exists, everyone is this sample creator.
const DEMO: Session = { provider: 'google', email: 'studio@circo.live' }

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : DEMO
  } catch {
    return DEMO
  }
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage blocked: changes last for this page load only */
  }
}

export function updateSession(patch: Partial<Session>) {
  const s = getSession()
  if (s) saveSession({ ...s, ...patch })
}

export function signOut() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/* Prototype auth: the session and profile kept in browser storage. The real dashboard shares
   the Circo account (one login for viewers and creators) and checks for the creator role. */
const KEY = 'circo-studio-session'

export type Provider = 'google' | 'apple'
/* `studio` is the studio this account runs; a new creator names it once, right after signing up. */
export type Session = { provider: Provider; name?: string; email?: string; gender?: string; studio?: string }

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage blocked: the session lasts for this page load only */
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

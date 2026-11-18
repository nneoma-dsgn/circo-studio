/* Prototype auth: the session and profile kept in browser storage. The real dashboard shares
   the Circo account (one login for viewers and creators) and checks for the creator role. */
const KEY = 'circo-studio-session'

/* 'email': signed up with an email address and password. */
export type Provider = 'google' | 'apple' | 'email'
/* Set up right after signing up: the business behind the studio, whether it's registered, the
   studio's name, type and categories, anyone invited to help run it, and how they heard about Circo. */
export type Role = 'owner' | 'editor' | 'viewer'
/* Public studios sell a pass per title (pay-per-view); private studios sell a subscription. */
export type StudioType = 'public' | 'private'
export type Invite = { email: string; role: Role }
/* An organization the person belongs to: the business and its studio. `business`/`studio` on
   the session are the one they're working in now; the account menu switches between `orgs`. */
export type Org = { business: string; studio: string }
export type Session = {
  provider: Provider
  name?: string
  email?: string
  gender?: string
  business?: string
  registered?: boolean
  studio?: string
  studioType?: StudioType
  categories?: string[]
  team?: Invite[]
  heardFrom?: string
  orgs?: Org[]
}

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

'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSession, saveSession, updateSession, type Provider } from '../auth'
import { Icon } from '../components/Icon'

/* Sign-in for creators, in the business look of Circo's creator site: the step on the left, a
   quiet panel on the right saying what Studio is for. One screen serves Log In and Sign Up:
   new accounts go on to name their studio, returning ones go straight to the dashboard. It's
   the same Circo account viewers use; Studio checks for the creator role. */
export default function Auth({ mode }: { mode: 'signup' | 'login' }) {
  const router = useRouter()
  const [busy, setBusy] = useState<Provider | null>(null)
  const [chooser, setChooser] = useState(false)
  const signup = mode === 'signup'

  const go = (provider: Provider, name?: string, email?: string) => {
    // Google opens its account chooser first (mocked); Apple goes straight through.
    if (provider === 'google' && !chooser) return setChooser(true)
    setChooser(false)
    setBusy(provider)
    window.setTimeout(
      () => {
        if (signup) {
          saveSession({ provider, name, email })
          router.replace('/setup')
        } else {
          // Prototype: a returning creator whose studio is already set up.
          saveSession({ provider, name, email, studio: 'Harmattan House' })
          router.replace('/')
        }
      },
      provider === 'google' ? 500 : 1200,
    )
  }

  return (
    <AuthFrame step={signup ? 1 : undefined}>
      {chooser && <GoogleChooser onPick={(name, email) => go('google', name, email)} onClose={() => setChooser(false)} />}
      {busy ? (
        <div className="busy" role="status">
          <span className="spinner" aria-hidden />
          <span className="mono">Signing in with {busy === 'google' ? 'Google' : 'Apple'}…</span>
        </div>
      ) : (
        <div className="auth">
          <h1 className="auth__title">{signup ? 'Bring your work to Circo.' : 'Welcome back.'}</h1>
          <p className="auth__sub">{signup ? 'Create your studio account. It takes a minute.' : 'Log in to manage your studio, titles and earnings.'}</p>
          <div className="auth__stack">
            <button className="btn-sso" onClick={() => go('google')}>
              <img src="/assets/icon-google.svg" alt="" width={18} height={18} />
              Continue with Google
            </button>
            <button className="btn-sso" onClick={() => go('apple')}>
              <img src="/assets/icon-apple.svg" alt="" width={18} height={18} />
              Continue with Apple
            </button>
          </div>
          <p className="auth__switch">
            {signup ? (
              <>
                Already have a studio? <Link href="/login">Log in</Link>
              </>
            ) : (
              <>
                New to Circo Studio? <Link href="/signup">Create a studio</Link>
              </>
            )}
          </p>
          <p className="auth__legal">
            By continuing, you agree to Circo’s <a href="#terms">Creator Terms</a> and confirm you have read the <a href="#privacy">Privacy Policy</a>.
          </p>
        </div>
      )}
    </AuthFrame>
  )
}

/* After signing up: the one thing Studio needs before the dashboard, the studio's name. */
export function Setup() {
  const router = useRouter()
  const [name, setName] = useState('')
  const ok = name.trim().length >= 2
  const first = getSession()?.name?.split(' ')[0]
  return (
    <AuthFrame step={2}>
      <form
        className="auth"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ok) return
          updateSession({ studio: name.trim() })
          router.replace('/')
        }}
      >
        <h1 className="auth__title">Name your studio.</h1>
        <p className="auth__sub">{first ? `Welcome, ${first}. ` : ''}This is the name viewers see on your titles and your studio page. You can change it later.</p>
        <label className="auth__field">
          <span>Studio name</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Harmattan House" maxLength={40} />
        </label>
        <div className="auth__actions">
          <button type="submit" className="btn-white" disabled={!ok}>
            Create Studio
          </button>
        </div>
      </form>
    </AuthFrame>
  )
}

const STEPS = 2

/* The page around every sign-in step: back and logo on top, the step, and the Studio panel on
   wide screens. `step` shows the sign-up progress (Sign Up is 1, naming the studio is 2). */
function AuthFrame({ step, children }: { step?: number; children: ReactNode }) {
  return (
    <div className="login">
      <div className="login__main">
        <header className="login__head">
          <a href="https://circo.live" className="login__back">
            <Icon name="chevron-left" size={18} />
            Circo
          </a>
          <Link href="/login" className="login__brand" aria-label="Circo Studio">
            <img src="/assets/logo-circo.png" alt="Circo" width={86} height={33} />
          </Link>
          <span aria-hidden />
        </header>
        <div className="login__body">
          <div className="login__col">
            {step && (
              <div className="steps" aria-label={`Step ${step} of ${STEPS}`}>
                {Array.from({ length: STEPS }, (_, i) => (
                  <span key={i} className={`steps__bar${i + 1 < step ? ' is-done' : i + 1 === step ? ' is-on' : ''}`} />
                ))}
                <span className="mono">
                  Step {step} of {STEPS}
                </span>
              </div>
            )}
            {children}
          </div>
        </div>
        <footer className="login__legal">
          <a href="#help">Help</a>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
        </footer>
      </div>
      <aside className="login__side" aria-label="About Circo Studio">
        <div className="pitch">
          <p className="pitch__eyebrow mono">
            <span className="pitch__mark" aria-hidden />
            Circo Studio
          </p>
          <h2 className="pitch__title">Your work, priced and protected your way.</h2>
          <ul className="pitch__list">
            <li>
              <Icon name="ticket" size={20} />
              Pay-per-view passes or subscription studios
            </li>
            <li>
              <Icon name="trend" size={20} />
              Earnings and payouts, title by title
            </li>
            <li>
              <Icon name="lock" size={20} />
              Your films protected on every play
            </li>
          </ul>
        </div>
      </aside>
    </div>
  )
}

/* Prototype stand-in for Google's account chooser popup, so the flow can be clicked through.
   Accounts are placeholders; the real flow opens Google's own window. */
const ACCOUNTS = [
  { name: 'Kemi Adeyemi', email: 'kemi@harmattanhouse.ng', initial: 'K', color: '#1a73e8' },
  { name: 'Tunde Bakare', email: 'tunde.bakare@gmail.com', initial: 'T', color: '#188038' },
]

function GoogleChooser({ onPick, onClose }: { onPick: (name: string, email?: string) => void; onClose: () => void }) {
  return (
    <div className="gpop" role="dialog" aria-label="Sign in with Google" onClick={onClose}>
      <div className="gpop__window" onClick={(e) => e.stopPropagation()}>
        <div className="gpop__chrome">
          <span className="gpop__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="gpop__url">accounts.google.com</span>
        </div>
        <div className="gpop__body">
          <div className="gpop__brand">
            <img src="/assets/icon-google.svg" alt="" width={18} height={18} />
            Sign in with Google
          </div>
          <h2 className="gpop__title">Choose an account</h2>
          <p className="gpop__sub">
            to continue to <strong>Circo Studio</strong>
          </p>
          <ul className="gpop__list">
            {ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button className="gpop__acct" onClick={() => onPick(a.name, a.email)}>
                  <span className="gpop__avatar" style={{ background: a.color }}>
                    {a.initial}
                  </span>
                  <span className="gpop__who">
                    <span>{a.name}</span>
                    <span>{a.email}</span>
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button className="gpop__acct" onClick={() => onPick('')}>
                <span className="gpop__avatar gpop__avatar--add" aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21a8 8 0 0 1 16 0" />
                  </svg>
                </span>
                <span className="gpop__who">
                  <span>Use another account</span>
                </span>
              </button>
            </li>
          </ul>
          <p className="gpop__legal">To continue, Google will share your name, email address and profile picture with Circo. Before using this app, you can review Circo’s privacy policy and terms of service.</p>
        </div>
        <div className="gpop__foot">
          <span>English (United Kingdom)</span>
          <span>
            <a href="#help">Help</a>
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
          </span>
        </div>
      </div>
    </div>
  )
}

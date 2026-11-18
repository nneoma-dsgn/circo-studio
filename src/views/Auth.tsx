'use client'

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSession, saveSession, signOut, updateSession, type Invite, type Provider, type Role, type StudioType } from '../auth'
import { Icon, type IconName } from '../components/Icon'
import { CONTENT_CATEGORIES } from '../data/categories'
import { useMenu } from '../components/Menu'

/* Sign-in for creators, in the business look of Circo's creator site: the step on the left, a
   quiet panel on the right saying what Studio is for. Creators can use an email address and
   password, or Google / Apple, choosing first. One screen serves Log In and Sign Up: new email
   accounts verify the address first; every new account then sets up its studio (/setup), and
   returning ones go straight to the dashboard. It's the same Circo account viewers
   use; Studio checks for the creator role.
   Prototype: any email and password are accepted, and the password is never stored. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PASSWORD_MIN = 8
/* A new password needs all five; the chips under the field tick them off as they're typed. */
const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  {
    label: `${PASSWORD_MIN}+ characters`,
    test: (p) => p.length >= PASSWORD_MIN,
  },
  { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /\d/.test(p) },
  { label: 'Special character', test: (p) => /[^A-Za-z0-9\s]/.test(p) },
]
const strongEnough = (p: string) => PASSWORD_RULES.every((r) => r.test(p))

/* Under a new password: the five requirements as small chips. Each turns white with a tick once
   it's met; unmet ones turn red if the form is sent too soon. */
function PasswordRules({ password, flag }: { password: string; flag: boolean }) {
  return (
    <ul className="pw-rules" aria-label="Password requirements">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password)
        return (
          <li key={r.label} className={ok ? 'is-ok' : flag ? 'is-missing' : ''}>
            {ok && <Icon name="check" size={13} weight={2.4} />}
            {r.label}
          </li>
        )
      })}
    </ul>
  )
}

export default function Auth({ mode }: { mode: 'signup' | 'login' }) {
  const router = useRouter()
  const [chooser, setChooser] = useState(false)
  const [resetting, setResetting] = useState(false)
  // First the choice (Google, Apple or email); the email form only once email is picked.
  const [withEmail, setWithEmail] = useState(false)
  // Signing up with email: the address waiting to be verified.
  const [verifying, setVerifying] = useState<string | null>(null)
  const signup = mode === 'signup'

  // Straight on, no loading screen: new accounts to setting up the studio, returning ones to
  // the dashboard.
  const finish = (provider: Provider, name?: string, email?: string) => {
    if (signup) {
      saveSession({ provider, name, email })
      router.replace('/setup')
    } else {
      // Prototype: a returning creator in two organizations, working in the first.
      const orgs = [
        { business: 'Northlight Pictures Ltd', studio: 'Northlight Studios' },
        { business: 'Lagoon Pictures', studio: 'Lagoon Pictures' },
      ]
      saveSession({ provider, name, email, ...orgs[0], orgs })
      router.replace('/')
    }
  }

  const sso = (provider: 'google' | 'apple', name?: string, email?: string) => {
    // Google opens its account chooser first (mocked); Apple goes straight through.
    if (provider === 'google' && !chooser) return setChooser(true)
    setChooser(false)
    finish(provider, name, email)
  }

  if (resetting) return <ResetPassword onBack={() => setResetting(false)} />
  // Verified: straight on to setting up the studio, no loader in between.
  if (verifying)
    return (
      <VerifyEmail
        email={verifying}
        onBack={() => setVerifying(null)}
        onDone={() => {
          saveSession({ provider: 'email', email: verifying })
          router.replace('/setup')
        }}
      />
    )

  return (
    <AuthFrame back={withEmail ? { label: 'Back', onClick: () => setWithEmail(false) } : signup ? undefined : { label: 'Sign Up', href: '/signup' }}>
      {chooser && <GoogleChooser onPick={(name, email) => sso('google', name, email)} onClose={() => setChooser(false)} />}
      <div className="auth">
        <h1 className="auth__title">{signup ? 'Own your audience.' : 'Welcome back.'}</h1>
        <p className="auth__sub">{signup ? 'Sell straight to your fans, at your price, in over 190 countries.' : 'Log in to manage your studio, titles and earnings.'}</p>

        {withEmail ? (
          <EmailForm signup={signup} onDone={(email) => (signup ? setVerifying(email) : finish('email', undefined, email))} onForgot={() => setResetting(true)} />
        ) : (
          <div className="auth__stack">
            <button className="btn-sso" onClick={() => sso('google')}>
              <img src="/assets/icon-google.svg" alt="" width={18} height={18} />
              Continue with Google
            </button>
            <button className="btn-sso" onClick={() => sso('apple')}>
              <img src="/assets/icon-apple.svg" alt="" width={18} height={18} />
              Continue with Apple
            </button>
            <button className="btn-sso" onClick={() => setWithEmail(true)}>
              <Icon name="mail" size={18} />
              Continue with email
            </button>
          </div>
        )}
        <p className="auth__legal">
          By continuing, you agree to Circo’s <a href="#terms">Creator Terms</a> and confirm you have read the <a href="#privacy">Privacy Policy</a>.
        </p>
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
      </div>
    </AuthFrame>
  )
}

/* Email and password. Sign Up checks the password's strength; the button stays off until
   everything's filled in properly, and errors show once a field has been left. */
function EmailForm({ signup, onDone, onForgot }: { signup: boolean; onDone: (email: string) => void; onForgot: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [sent, setSent] = useState(false)

  const errors = {
    email: !email.trim() ? 'Enter your email address.' : !EMAIL.test(email.trim()) ? 'Enter a valid email address, like name@studio.com.' : '',
    password: !password ? 'Enter your password.' : signup && !strongEnough(password) ? 'weak' : '',
  }
  const shown = (k: keyof typeof errors) => (sent || touched[k] ? errors[k] : '')
  const leave = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }))

  return (
    <form
      className="auth__form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setSent(true)
        if (errors.email || errors.password) return
        onDone(email.trim())
      }}
    >
      <Field label="Email address" error={shown('email')}>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={leave('email')} autoComplete="email" inputMode="email" />
      </Field>
      <Field
        label="Password"
        // A weak new password is explained by the requirements below, so the field only turns red.
        error={shown('password') === 'weak' ? undefined : shown('password')}
        invalid={shown('password') === 'weak'}
        aside={
          !signup ? (
            <button type="button" className="auth__link" onClick={onForgot}>
              Forgot password?
            </button>
          ) : undefined
        }
      >
        <span className="auth__pw">
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={leave('password')}
            autoComplete={signup ? 'new-password' : 'current-password'}
          />
          <button type="button" className="auth__eye" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}>
            {show ? 'Hide' : 'Show'}
          </button>
        </span>
      </Field>
      {signup && <PasswordRules password={password} flag={shown('password') === 'weak'} />}
      <div className="auth__actions">
        <button type="submit" className="btn-white" disabled={!!(errors.email || errors.password)}>
          {signup ? 'Create Account' : 'Log In'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, error, invalid, hint, aside, children }: { label: string; error?: string; invalid?: boolean; hint?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <label className={`auth__field${error || invalid ? ' is-error' : ''}`}>
      <span className="auth__label">
        {label}
        {aside}
      </span>
      {children}
      {error ? (
        <span className="auth__error" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="auth__hint">{hint}</span>
      )}
    </label>
  )
}

/* Forgot password: an email address, then "check your inbox". The same message shows whether or
   not an account exists, so the form doesn't reveal who has one. */
function ResetPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  // The error shows once the field has been left with something that isn't an email address.
  const [left, setLeft] = useState(false)
  const bad = !EMAIL.test(email.trim())
  return (
    <AuthFrame back={{ label: 'Log In', onClick: onBack }}>
      {sent ? (
        <div className="auth">
          <h1 className="auth__title">Check your inbox.</h1>
          <p className="auth__sub">
            If there’s a Circo Studio account for <strong>{email.trim()}</strong>, we’ve sent a link to reset its password. The link works for 30 minutes.
          </p>
          <div className="auth__actions">
            <button type="button" className="btn-dark" onClick={onBack}>
              Back to Log In
            </button>
          </div>
        </div>
      ) : (
        <form
          className="auth"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (!bad) setSent(true)
          }}
        >
          <h1 className="auth__title">Reset your password.</h1>
          <p className="auth__sub">Enter the email you use for Circo Studio and we’ll send you a link to set a new password.</p>
          <div className="auth__form">
            <Field label="Email address" error={left && email.trim() && bad ? 'Enter a valid email address, like name@studio.com.' : ''}>
              <input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setLeft(true)} autoComplete="email" inputMode="email" />
            </Field>
            <div className="auth__actions">
              <button type="submit" className="btn-white" disabled={bad}>
                Send Reset Link
              </button>
            </div>
          </div>
        </form>
      )}
    </AuthFrame>
  )
}

/* Email sign-up: a six-digit code sent to the address. Prototype: any six digits pass. */
const CODE_LEN = 6
const RESEND_AFTER = 30

function VerifyEmail({ email, onBack, onDone }: { email: string; onBack: () => void; onDone: () => void }) {
  const { toast } = useMenu()
  const [code, setCode] = useState<string[]>(Array(CODE_LEN).fill(''))
  const [wait, setWait] = useState(RESEND_AFTER)
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const full = code.every(Boolean)

  useEffect(() => {
    if (!wait) return
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(t)
  }, [wait])

  // Typing fills a box and moves on; pasting the whole code fills them all.
  const put = (i: number, value: string) => {
    const digits = value.replace(/\D/g, '')
    if (!digits) return setCode((c) => c.map((d, j) => (j === i ? '' : d)))
    const next = [...code]
    digits
      .slice(0, CODE_LEN - i)
      .split('')
      .forEach((d, k) => (next[i + k] = d))
    setCode(next)
    boxes.current[Math.min(i + digits.length, CODE_LEN - 1)]?.focus()
  }

  return (
    <AuthFrame back={{ label: 'Back', onClick: onBack }}>
      <form
        className="auth"
        onSubmit={(e) => {
          e.preventDefault()
          if (full) onDone()
        }}
      >
        <h1 className="auth__title">Check your email.</h1>
        <p className="auth__sub">
          Enter the 6-digit code we sent to <strong>{email}</strong>.
        </p>
        <div className="auth__form">
          <div className="code" role="group" aria-label="Verification code">
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el
                }}
                value={d}
                onChange={(e) => put(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !d && i) boxes.current[i - 1]?.focus()
                }}
                onFocus={(e) => e.target.select()}
                inputMode="numeric"
                autoComplete={i ? 'off' : 'one-time-code'}
                autoFocus={!i}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
          <div className="auth__actions">
            <button type="submit" className="btn-white" disabled={!full}>
              Verify Email
            </button>
          </div>
          <p className="auth__resend">
            Didn’t get it?{' '}
            {wait ? (
              <span>Resend in {wait}s</span>
            ) : (
              <button
                type="button"
                className="auth__link"
                onClick={() => {
                  setWait(RESEND_AFTER)
                  toast(`New code sent to ${email}`)
                }}
              >
                Resend code
              </button>
            )}
          </p>
        </div>
      </form>
    </AuthFrame>
  )
}

/* After signing up (and verifying, for email), the studio's setup in short steps: the business,
   then the studio (name, type, categories), then the team (invites, how they heard about Circo;
   both optional). The step bar counts those three parts; signing up itself isn't a step. Nothing is saved
   until the end, so Back moves freely. */
type SetupStep = 'business' | 'studio' | 'type' | 'category' | 'team' | 'heard'
const PART: Record<SetupStep, number> = {
  business: 1,
  studio: 2,
  type: 2,
  category: 2,
  team: 3,
  heard: 3,
}
const PREV: Partial<Record<SetupStep, SetupStep>> = {
  studio: 'business',
  type: 'studio',
  category: 'type',
  team: 'category',
  heard: 'team',
}

const STUDIO_TYPES: {
  id: StudioType
  title: string
  body: string
  icon: IconName
}[] = [
  {
    id: 'public',
    title: 'Public studio',
    body: 'Pay-per-view. Viewers buy a pass for each title.',
    icon: 'ticket',
  },
  {
    id: 'private',
    title: 'Private studio',
    body: 'Subscription. Subscribers watch everything in your studio.',
    icon: 'lock',
  },
]

const HEARD = ['Instagram', 'TikTok', 'X (Twitter)', 'YouTube', 'Facebook', 'LinkedIn', 'A friend or colleague', 'Search engine', 'An event', 'Circo reached out', 'Other']

export function Setup() {
  const router = useRouter()
  const { toast } = useMenu()
  const [step, setStep] = useState<SetupStep>('business')
  const [business, setBusiness] = useState('')
  const [registered, setRegistered] = useState<boolean | null>(null)
  const [studio, setStudio] = useState('')
  const [type, setType] = useState<StudioType | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [team, setTeam] = useState<Invite[]>([])
  const [heard, setHeard] = useState<string | null>(null)
  const [heardOther, setHeardOther] = useState('')
  const first = getSession()?.name?.split(' ')[0]

  const finish = (heardFrom?: string) => {
    updateSession({
      business: business.trim(),
      registered: !!registered,
      studio: studio.trim(),
      orgs: [{ business: business.trim(), studio: studio.trim() }],
      studioType: type ?? undefined,
      categories,
      team,
      heardFrom,
    })
    if (team.length) toast(team.length === 1 ? `Invite sent to ${team[0].email}` : `Invites sent to ${team.length} people`)
    router.replace('/')
  }

  const back = PREV[step] ? { label: 'Back', onClick: () => setStep(PREV[step]!) } : { label: 'Back', href: '/signup', onClick: signOut }
  const go = (next: SetupStep) => (e: FormEvent) => {
    e.preventDefault()
    setStep(next)
  }

  return (
    <AuthFrame key={step} step={PART[step]} back={back}>
      {step === 'business' && (
        <form
          className="auth"
          onSubmit={(e) => {
            e.preventDefault()
            if (business.trim().length < 2 || registered === null) return
            // The studio usually carries the business's name; start from it.
            if (!studio.trim()) setStudio(business.trim())
            setStep('studio')
          }}
        >
          <h1 className="auth__title">Your business.</h1>
          <p className="auth__sub">{first ? `Welcome, ${first}. ` : ''}Tell us about the business behind your studio.</p>
          <div className="auth__form">
            <Field label="Business name">
              <input autoFocus value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="e.g. Northlight Pictures Ltd" maxLength={80} autoComplete="organization" />
            </Field>
            <fieldset className="auth__choice">
              <legend className="auth__label">Is it a registered business?</legend>
              <div className="choice">
                {[
                  { v: true, label: 'Yes, it’s registered' },
                  { v: false, label: 'Not yet' },
                ].map((o) => (
                  <label key={String(o.v)} className={`choice__opt${registered === o.v ? ' is-on' : ''}`}>
                    <input type="radio" name="registered" checked={registered === o.v} onChange={() => setRegistered(o.v)} />
                    <span className="choice__dot" aria-hidden />
                    {o.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="auth__actions">
              <button type="submit" className="btn-white" disabled={business.trim().length < 2 || registered === null}>
                Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 'studio' && (
        <form className="auth" onSubmit={(e) => (studio.trim().length >= 2 ? go('type')(e) : e.preventDefault())}>
          <h1 className="auth__title">Name your studio.</h1>
          <p className="auth__sub">This is the name viewers see on your titles and your studio page. You can change it later.</p>
          <div className="auth__form">
            <Field label="Studio name">
              <input autoFocus value={studio} onChange={(e) => setStudio(e.target.value)} placeholder="e.g. Northlight Studios" maxLength={40} />
            </Field>
            <div className="auth__actions">
              <button type="submit" className="btn-white" disabled={studio.trim().length < 2}>
                Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 'type' && (
        <form className="auth" onSubmit={(e) => (type ? go('category')(e) : e.preventDefault())}>
          <h1 className="auth__title">Choose a studio type.</h1>
          <p className="auth__sub">How viewers pay to watch {studio.trim() || 'your studio'}.</p>
          <div className="auth__form">
            <fieldset className="auth__choice">
              <legend className="sr-only">Studio type</legend>
              <div className="cards">
                {STUDIO_TYPES.map((t) => (
                  <label key={t.id} className={`cards__opt${type === t.id ? ' is-on' : ''}`}>
                    <input type="radio" name="type" checked={type === t.id} onChange={() => setType(t.id)} />
                    <span className="cards__icon">
                      <Icon name={t.icon} size={20} />
                    </span>
                    <span className="cards__text">
                      <strong>{t.title}</strong>
                      {t.body}
                    </span>
                    <span className="choice__dot" aria-hidden />
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="auth__actions">
              <button type="submit" className="btn-white" disabled={!type}>
                Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 'category' && (
        <form className="auth" onSubmit={(e) => (categories.length ? go('team')(e) : e.preventDefault())}>
          <h1 className="auth__title">What do you make?</h1>
          <p className="auth__sub">Pick everything your studio makes. It decides where your titles show up on Circo.</p>
          <div className="auth__form">
            <fieldset className="auth__choice">
              <legend className="sr-only">Studio categories</legend>
              <div className="tiles">
                {CONTENT_CATEGORIES.map((c) => {
                  const on = categories.includes(c.id)
                  return (
                    <label key={c.id} className={`tiles__opt${on ? ' is-on' : ''}`}>
                      <input type="checkbox" checked={on} onChange={() => setCategories((cur) => (on ? cur.filter((x) => x !== c.id) : [...cur, c.id]))} />
                      <CategoryIcon id={c.id} />
                      {c.label}
                      <span className="tiles__check" aria-hidden>
                        <Icon name="check" size={12} weight={2.6} />
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="auth__actions">
              <button type="submit" className="btn-white" disabled={!categories.length}>
                Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {step === 'team' && (
        <InviteTeam
          studio={studio.trim()}
          initial={team}
          onDone={(t) => {
            setTeam(t)
            setStep('heard')
          }}
        />
      )}

      {step === 'heard' && (
        <form
          className="auth"
          onSubmit={(e) => {
            e.preventDefault()
            finish(heard === 'Other' ? heardOther.trim() || 'Other' : (heard ?? undefined))
          }}
        >
          <h1 className="auth__title">How did you hear about us?</h1>
          <p className="auth__sub">It helps us reach more studios like yours.</p>
          <div className="auth__form">
            <div className="pills" role="radiogroup" aria-label="How you heard about Circo">
              {HEARD.map((h) => (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={heard === h}
                  className={`pills__opt${heard === h ? ' is-on' : ''}`}
                  onClick={() => setHeard(heard === h ? null : h)}
                >
                  {h}
                </button>
              ))}
            </div>
            {heard === 'Other' && (
              <Field label="Where was it?">
                <input autoFocus value={heardOther} onChange={(e) => setHeardOther(e.target.value)} maxLength={80} />
              </Field>
            )}
            <div className="auth__actions">
              <button type="submit" className="btn-white">
                Go to Studio
              </button>
            </div>
            {!heard && (
              <div className="invite__alt invite__alt--end">
                <button type="button" className="auth__link" onClick={() => finish()}>
                  Skip
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </AuthFrame>
  )
}

/* Lucide icons, one per category: the same set as the viewer app's sign-up interests. */
const CATEGORY_ICONS: Record<string, string[]> = {
  movie: ['M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z', 'm6.2 5.3 3.1 3.9', 'm12.4 3.4 3.1 4', 'M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z'],
  'reality-show': ['m17 2-5 5-5-5', 'M4 7h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z'],
  'micro-drama': ['M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', 'M12 18h.01'],
  documentary: ['m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.94a.5.5 0 0 0-.76-.42L16 10.5', 'M4 6h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'],
  masterclass: [
    'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z',
    'M22 10v6',
    'M6 12.5V16a6 3 0 0 0 12 0v-3.5',
  ],
  podcast: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'],
  music: ['M9 18V5l12-2v13', 'M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', 'M18 13a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  education: ['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'],
  religion: ['M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z'],
}

function CategoryIcon({ id }: { id: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {(CATEGORY_ICONS[id] ?? []).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

/* Invite the team (optional): one row per person, an email address and what they can do, and
   "Add another team member" for more. Or skip for now. */
const ROLES: Record<Role, { label: string; short: string }> = {
  owner: { label: 'Owner', short: 'Full access' },
  editor: { label: 'Editor', short: 'Titles and pricing' },
  viewer: { label: 'Viewer', short: 'View only' },
}

type Row = { key: number; email: string; role: Role; left: boolean }
let rowKey = 0
const newRow = (email = '', role: Role = 'editor'): Row => ({
  key: ++rowKey,
  email,
  role,
  left: false,
})

function InviteTeam({ studio, initial, onDone }: { studio: string; initial: Invite[]; onDone: (team: Invite[]) => void }) {
  const { open } = useMenu()
  const [rows, setRows] = useState<Row[]>(() => (initial.length ? initial.map((i) => newRow(i.email, i.role)) : [newRow()]))
  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  // Blank rows are ignored; a filled row must be a valid address, once each.
  const filled = rows.filter((r) => r.email.trim())
  const bad = (r: Row) => !!r.email.trim() && !EMAIL.test(r.email.trim())
  const dupe = (r: Row) => filled.findIndex((x) => x.email.trim().toLowerCase() === r.email.trim().toLowerCase()) !== filled.indexOf(r)
  const ready = filled.length > 0 && !filled.some((r) => bad(r) || dupe(r))

  const roleMenu = (el: HTMLElement, row: Row) =>
    open(el, {
      label: 'What they can do',
      items: (Object.keys(ROLES) as Role[]).map((r) => ({
        id: r,
        label: ROLES[r].label,
        hint: ROLES[r].short,
        icon: r === row.role ? 'check' : undefined,
        onSelect: () => set(row.key, { role: r }),
      })),
    })

  return (
    <form
      className="auth"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (ready)
          onDone(
            filled.map((r) => ({
              email: r.email.trim().toLowerCase(),
              role: r.role,
            })),
          )
      }}
    >
      <h1 className="auth__title">Invite your team.</h1>
      <p className="auth__sub">Bring in the people who run {studio || 'your studio'} with you.</p>
      <div className="auth__form">
        <div className="invite">
          {rows.map((row, i) => {
            const error = row.left && bad(row) ? 'Enter a valid email address.' : dupe(row) ? 'This address is already on the list.' : ''
            return (
              <div key={row.key} className={`invite__row auth__field${error ? ' is-error' : ''}`}>
                <div className="invite__line">
                  <input
                    type="email"
                    value={row.email}
                    onChange={(e) => set(row.key, { email: e.target.value })}
                    onBlur={() => set(row.key, { left: true })}
                    placeholder="name@company.com"
                    aria-label={`Team member ${i + 1} email address`}
                    autoComplete="off"
                    inputMode="email"
                    autoFocus={i === rows.length - 1 && i > 0}
                  />
                  <button type="button" className="invite__role" onClick={(e) => roleMenu(e.currentTarget, row)} aria-label={`Team member ${i + 1}: ${ROLES[row.role].label}`}>
                    {ROLES[row.role].label}
                    <Icon name="chevron-down" size={16} />
                  </button>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="invite__remove"
                      onClick={() => setRows((rs) => rs.filter((r) => r.key !== row.key))}
                      aria-label={`Remove team member ${i + 1}`}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  )}
                </div>
                {error && (
                  <span className="auth__error" role="alert">
                    {error}
                  </span>
                )}
              </div>
            )
          })}
          <button type="button" className="invite__add" onClick={() => setRows((rs) => [...rs, newRow()])}>
            <Icon name="plus" size={16} />
            Add another team member
          </button>
        </div>
        <div className="auth__actions">
          <button type="submit" className="btn-white" disabled={!ready}>
            {filled.length > 1 ? `Send ${filled.length} Invites` : 'Send Invite'}
          </button>
        </div>
        <div className="invite__alt invite__alt--end">
          <button type="button" className="auth__link" onClick={() => onDone([])}>
            Skip for now
          </button>
        </div>
      </div>
    </form>
  )
}

const STEPS = 3
const PART_NAMES = ['Business', 'Studio', 'Team']

/* The page around every sign-in step: back and logo on top, the step, and the Studio panel on
   wide screens. `step` shows which part of the studio's setup this is: the business, the
   studio, the team (signing up itself has no step).
   `back` steps back through sign-in (to Sign Up, the choice of ways, or Log In); the first
   screen of Sign Up has none. */
type Back = { label: string; href?: string; onClick?: () => void }

function AuthFrame({ step, back, children }: { step?: number; back?: Back; children: ReactNode }) {
  return (
    <div className="login">
      <div className="login__main">
        <header className="login__head">
          {back ? (
            back.href ? (
              <Link href={back.href} className="login__back" onClick={back.onClick}>
                <Icon name="chevron-left" size={18} />
                {back.label}
              </Link>
            ) : (
              <button type="button" className="login__back" onClick={back.onClick}>
                <Icon name="chevron-left" size={18} />
                {back.label}
              </button>
            )
          ) : (
            <span aria-hidden />
          )}
          <Link href="/login" className="login__brand" aria-label="Circo Studio">
            <img src="/assets/logo-circo.png" alt="Circo" width={86} height={33} />
          </Link>
          <span aria-hidden />
        </header>
        <div className="login__body">
          <div className="login__col">
            {step && (
              <div className="steps" aria-label={`Step ${step} of ${STEPS}: ${PART_NAMES[step - 1]}`}>
                <span className="steps__label">
                  Step {step} of {STEPS}
                </span>
                {Array.from({ length: STEPS }, (_, i) => (
                  <span key={i} className={`steps__bar${i + 1 < step ? ' is-done' : i + 1 === step ? ' is-on' : ''}`} />
                ))}
                <span className="steps__label steps__label--part">{PART_NAMES[step - 1]}</span>
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
      <SidePanel />
    </div>
  )
}

/* ---------- The side panel (wide screens) ----------
   A plain panel with the Circo logo in the top corner. */
function SidePanel() {
  return (
    <aside className="login__side" aria-label="Circo Studio">
      <Link href="/login" className="side__brand" aria-label="Circo Studio">
        <img src="/assets/logo-circo.png" alt="Circo" width={120} height={46} />
      </Link>
    </aside>
  )
}

/* Prototype stand-in for Google's account chooser popup, so the flow can be clicked through.
   Accounts are placeholders; the real flow opens Google's own window. */
const ACCOUNTS = [
  {
    name: 'Kemi Adeyemi',
    email: 'kemi@northlightpictures.com',
    initial: 'K',
    color: '#1a73e8',
  },
  {
    name: 'Tunde Bakare',
    email: 'tunde.bakare@gmail.com',
    initial: 'T',
    color: '#188038',
  },
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
          <p className="gpop__legal">
            To continue, Google will share your name, email address and profile picture with Circo. Before using this app, you can review Circo’s privacy policy and terms of
            service.
          </p>
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

# Circo Studio (prototype)

The creator dashboard for Circo. It shares the viewer app's design system (tokens, components,
icons) so the two look and behave the same; the viewer app lives in its own repo.

## Run

```bash
npm install
npm run dev        # http://localhost:5181 (phones on the same network: http://<your-ip>:5181)
npm run typecheck
npm run build && npm start
```

Next.js (App Router) + React + TypeScript. Styling is plain CSS with design tokens in
`src/styles/tokens.css`, mirrored from the Figma variables.

## Structure

| Path | What |
| --- | --- |
| `src/app/` | Routes. `login`, `signup` and `setup` (naming the studio after signing up) sit outside the dashboard; `(dashboard)/` holds every signed-in page inside the Shell, behind `RequireAuth`. `/` goes to `/account`, the only dashboard screen so far. |
| `src/components/Shell.tsx` | The dashboard frame: sidebar on desktop, top bar on phones. Add sections to `NAV`. |
| `src/views/Account.tsx` | Account: Your Account, Devices, Resources, Get Support, Log Out. |
| `src/views/Auth.tsx` | Log In / Sign Up (Google and Apple, with a mock Google chooser) and studio setup. Styles in `src/styles/auth.css`. |
| `src/components/Guards.tsx` | Route guards: dashboard needs a session and a studio; sign-in pages bounce signed-in creators. |
| `src/auth.ts` | Mock session in `localStorage`, including the studio name. |
| `public/assets` | Logo. |

### Studio look

Studio is styled as a business tool, after Circo's creator site: Geist and Geist Mono, Circo red
(`#cd1942`) for the main action, 4–6px corners, in dark mode like the viewer app. `src/styles/theme.css`
loads after the shared design system and re-points its tokens (the shared files stay identical
to the viewer app's), so put Studio-only styling there.

### Design system (shared with the viewer app)

These came from the viewer app unchanged. Keep them in step with it: change them in one place
and copy across, until they move into a shared package.

| Path | What |
| --- | --- |
| `src/styles/tokens.css` | Design tokens: colour, type, spacing, radii. |
| `src/components/ui.tsx` + `src/styles/ui.css` | `Text`, `Button` / `ButtonLink`, `Tag`, `Surface`, `SegmentedControl`, `List` / `ListRow`, `Disclosure`, `EmptyState`, `Dialog`, form fields. |
| `src/components/Icon.tsx` | Every line icon: one registry of named shapes and one `Icon` component. |
| `src/components/Menu.tsx` | Dropdown menus (bottom sheets on phones) and the toast. |
| `src/components/viewport.ts` | The phone breakpoint (`max-width: 767px`) for script. |
| `src/styles/base.css` | Page reset, button looks, menus, toast, the underline field. |

Studio-only styles: `shell.css` (the frame) and `account.css`.

## Phones

Phones (up to 767px) get a top bar instead of the sidebar, menus as bottom sheets, and Account
as a list that opens each section on its own. Phone rules live in `@media (max-width: 767px)`
blocks next to the desktop rules they adjust.

## Prototype-only (replace for production)

- **Auth is mocked.** Everyone is a sample creator (`studio@circo.live`); Log Out clears
  saved changes. The real dashboard shares the Circo account and checks for the creator role.
- **Devices** lists sample devices besides the one you're on; logging one out lasts until reload.
- **Resources and Get Support** rows say "coming soon".

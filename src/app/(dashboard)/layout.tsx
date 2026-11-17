import type { ReactNode } from 'react'
import { RequireAuth } from '@/components/Guards'
import { Shell } from '@/components/Shell'

/* Every dashboard page: signed in (and studio set up) first, then the sidebar frame. */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  )
}

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/ui.css'
import '@/styles/shell.css'
import '@/styles/auth.css'
import '@/styles/theme.css'
import { MenuProvider } from '@/components/Menu'

export const metadata: Metadata = {
  title: 'Circo Studio',
  description: 'Manage your studio on Circo.',
}

export const viewport: Viewport = {
  themeColor: '#0b0b0c',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <MenuProvider>{children}</MenuProvider>
      </body>
    </html>
  )
}

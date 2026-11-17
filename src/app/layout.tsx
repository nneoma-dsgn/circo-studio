import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@/styles/tokens.css'
import '@/styles/base.css'
import '@/styles/ui.css'
import '@/styles/shell.css'
import '@/styles/account.css'
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <MenuProvider>{children}</MenuProvider>
      </body>
    </html>
  )
}

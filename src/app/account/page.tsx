import { Suspense } from 'react'
import Account from '@/views/Account'

export default function Page() {
  return (
    <Suspense>
      <Account />
    </Suspense>
  )
}

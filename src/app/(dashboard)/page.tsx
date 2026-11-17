import { redirect } from 'next/navigation'

// Account is the only screen so far.
export default function Page() {
  redirect('/account')
}

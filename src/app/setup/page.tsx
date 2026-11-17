import { RequireSetup } from '@/components/Guards'
import { Setup } from '@/views/Auth'

export default function Page() {
  return (
    <RequireSetup>
      <Setup />
    </RequireSetup>
  )
}

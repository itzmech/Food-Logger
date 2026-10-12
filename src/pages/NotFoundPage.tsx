import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonClasses } from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="pt-10">
      <EmptyState
        icon="search"
        title="This screen doesn't exist"
        message="The page you were looking for has moved or was never built."
        action={
          <Link to="/" className={buttonClasses('secondary', 'sm')}>
            Back to dashboard
          </Link>
        }
      />
    </div>
  )
}

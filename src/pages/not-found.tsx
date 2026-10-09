import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="text-5xl font-semibold text-muted-foreground">404</div>
      <p className="text-sm text-muted-foreground">This page does not exist.</p>
      <Button asChild size="sm" variant="outline">
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  )
}

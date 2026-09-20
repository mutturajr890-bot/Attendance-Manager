import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/verified')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/verified"!</div>
}

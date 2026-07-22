import { Card } from '@/components/ui'

/**
 * TEMPORARY scaffolding. Every route in Section 4 resolves to a real component
 * from day one so navigation, guards, and deep links can be walked end to end
 * before the screens exist. Each page deletes its placeholder when its phase
 * builds it out; this file goes away with the last one.
 */
export default function PagePlaceholder({ title, phase, description, children }) {
  return (
    <div className="animate-page-enter">
      <header>
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-body text-ink-600">{description}</p>}
      </header>

      <Card className="mt-8">
        <p className="meta-label">Not built yet</p>
        <p className="mt-3 text-body text-ink-800">
          This route is wired and guarded. The screen itself lands in{' '}
          <span className="font-mono text-[13px] text-ink-950">Phase {phase}</span> of the build plan.
        </p>
        {children}
      </Card>
    </div>
  )
}

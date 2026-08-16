import { cn } from '@/utils/cn'

/**
 * Horizontal stepper for a linear workflow. Purely presentational — the caller
 * decides each node's state, so it can serve any staged process, not just
 * proposals.
 *
 * State is carried by fill and glyph, never by colour, so it survives the
 * greyscale test:
 *   complete → ink.950 fill, white checkmark
 *   current  → white circle inside a 2px ink.950 ring
 *   pending  → ink.200 fill, no glyph
 *   stopped  → ink.950 fill, white cross (an exit from the flow, e.g. rejected)
 *
 * Connecting lines are ink.950 up to the furthest node reached and ink.200
 * beyond it. Each node also carries a visually hidden state word for screen
 * readers, so the shape is not the only cue either.
 */

const REACHED = new Set(['complete', 'current', 'stopped'])

const STATE_LABEL = {
  complete: 'Completed',
  current: 'Current step',
  pending: 'Not started',
  stopped: 'Stopped here',
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.2 4.8 8.5 9.5 3.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="m3.2 3.2 5.6 5.6M8.8 3.2l-5.6 5.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

/** steps: [{ key, label, state: 'complete' | 'current' | 'pending' | 'stopped' }] */
export default function WorkflowStepper({ steps = [], label = 'Workflow progress', className }) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <ol aria-label={label} className="flex min-w-[460px] items-start">
        {steps.map((step, index) => {
          const state = step.state ?? 'pending'
          const reached = REACHED.has(state)
          const nextReached = REACHED.has(steps[index + 1]?.state ?? 'pending')
          const filled = state === 'complete' || state === 'stopped'

          return (
            <li
              key={step.key}
              aria-current={state === 'current' ? 'step' : undefined}
              className="relative flex flex-1 flex-col items-center px-1"
            >
              {/* Half-lines either side of the node, so the track meets the
                  circle exactly and each half can be filled independently. */}
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-0 top-[13px] h-[2px] w-1/2',
                    reached ? 'bg-ink-950' : 'bg-ink-200',
                  )}
                />
              )}
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute right-0 top-[13px] h-[2px] w-1/2',
                    nextReached ? 'bg-ink-950' : 'bg-ink-200',
                  )}
                />
              )}

              <span
                className={cn(
                  'relative z-10 flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-150 ease-out',
                  filled && 'bg-ink-950 text-white',
                  state === 'current' && 'border-2 border-ink-950 bg-white',
                  state === 'pending' && 'bg-ink-200',
                )}
              >
                {state === 'complete' && <CheckIcon />}
                {state === 'stopped' && <CrossIcon />}
              </span>

              <span
                className={cn(
                  'mt-2 text-center font-mono text-meta uppercase',
                  reached ? 'text-ink-950' : 'text-ink-400',
                )}
              >
                {step.label}
              </span>
              <span className="sr-only">{STATE_LABEL[state]}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

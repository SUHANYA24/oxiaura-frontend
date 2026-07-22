import { Badge } from '@/components/ui'
import { fraudVerdict } from '@/utils/constants'

/**
 * The 0–100 score with its verdict. The label always renders, so the state
 * survives greyscale — the colour is a second channel, never the message.
 */
export default function FraudScoreBadge({ score, showScore = true, className }) {
  const { verdict, variant } = fraudVerdict(score)

  return (
    <Badge variant={variant} dot className={className}>
      {verdict}
      {showScore && <span className="font-mono text-[11px] tabular-nums">{score}</span>}
    </Badge>
  )
}

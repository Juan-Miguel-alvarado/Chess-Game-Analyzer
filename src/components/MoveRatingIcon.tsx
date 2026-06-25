import {
  IconAlertHexagonFilled,
  IconAlertTriangleFilled,
  IconBookFilled,
  IconCircleCheckFilled,
  IconHelpCircleFilled,
  IconStarFilled,
  IconStarsFilled,
  IconThumbUpFilled,
  type Icon,
} from '@tabler/icons-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RATING_META } from '@/lib/classify'
import type { Rating } from '@/lib/types'
import { cn } from '@/lib/utils'

export const RATING_ICONS: Record<Rating, Icon> = {
  brilliant: IconStarsFilled,
  best: IconStarFilled,
  book: IconBookFilled,
  good: IconThumbUpFilled,
  ok: IconCircleCheckFilled,
  inaccuracy: IconAlertHexagonFilled,
  mistake: IconHelpCircleFilled,
  blunder: IconAlertTriangleFilled,
}

interface Props {
  rating: Rating
  size?: number
  withTooltip?: boolean
  className?: string
}

export function MoveRatingIcon({
  rating,
  size = 18,
  withTooltip = true,
  className,
}: Props) {
  const meta = RATING_META[rating]
  const Glyph = RATING_ICONS[rating]
  const icon = (
    <span
      className={cn('inline-flex items-center justify-center', className)}
      style={{ color: meta.colorVar }}
    >
      <Glyph size={size} stroke={2} />
    </span>
  )

  if (!withTooltip) return icon

  return (
    <Tooltip>
      <TooltipTrigger asChild>{icon}</TooltipTrigger>
      <TooltipContent>
        <span className="flex items-center gap-1.5">
          <span className="font-semibold" style={{ color: meta.colorVar }}>
            {meta.symbol === meta.label
              ? meta.label
              : `${meta.symbol} ${meta.label}`}
          </span>
        </span>
        <p className="mt-1 max-w-[200px] text-muted-foreground">
          {meta.description}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

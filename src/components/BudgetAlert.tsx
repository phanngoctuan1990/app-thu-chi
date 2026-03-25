import { formatVNDShort } from '../utils/formatCurrency'

interface Props {
  spent: number
  threshold: number
  onEdit?: () => void
}

export default function BudgetAlert({ spent, threshold, onEdit }: Props) {
  if (!threshold || threshold <= 0 || spent <= 0) return null

  const pct = spent / threshold
  const barPct = Math.min(pct * 100, 100)
  const isOver = pct >= 1.0
  const isWarn = pct >= 0.7 && pct < 1.0

  if (!isWarn && !isOver) return null

  const remaining = threshold - spent

  return (
    <div
      className="rounded-[20px] overflow-hidden animate-fade-up"
      style={{
        background: isOver
          ? 'linear-gradient(135deg, #fff0ee 0%, #ffe4de 100%)'
          : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        border: isOver ? '1px solid rgba(191,42,2,0.2)' : '1px solid rgba(217,119,6,0.2)',
        boxShadow: isOver
          ? '0 4px 24px rgba(191,42,2,0.08)'
          : '0 4px 24px rgba(217,119,6,0.08)',
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isOver ? 'bg-primary/15' : 'bg-amber-500/15'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${isOver ? 'text-primary' : 'text-amber-600'}`}
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 24" }}
            >
              {isOver ? 'crisis_alert' : 'warning'}
            </span>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className={`font-headline font-bold text-sm leading-tight ${isOver ? 'text-primary' : 'text-amber-800'}`}>
              {isOver ? 'Đã vượt ngưỡng chi tiêu!' : 'Sắp đạt ngưỡng chi tiêu'}
            </p>
            <p className={`font-body text-xs mt-0.5 ${isOver ? 'text-primary/70' : 'text-amber-700'}`}>
              {isOver
                ? `Đã chi vượt ${formatVNDShort(Math.abs(remaining))} so với ngưỡng`
                : `Còn ${formatVNDShort(remaining)} trước khi chạm ngưỡng`
              }
            </p>

            {/* Progress bar */}
            <div className="mt-2.5 h-1.5 rounded-full overflow-hidden"
              style={{ background: isOver ? 'rgba(191,42,2,0.12)' : 'rgba(217,119,6,0.12)' }}>
              <div
                className={`h-full rounded-full transition-all duration-700 ${isOver ? 'bg-primary' : 'bg-amber-500'}`}
                style={{ width: `${barPct}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <span className={`font-label text-[10px] ${isOver ? 'text-primary/60' : 'text-amber-600/70'}`}>
                {formatVNDShort(spent)} / {formatVNDShort(threshold)}
              </span>
              <span className={`font-label text-[10px] font-bold ${isOver ? 'text-primary' : 'text-amber-700'}`}>
                {Math.round(pct * 100)}%
              </span>
            </div>
          </div>

          {/* Percentage badge */}
          <div
            className={`shrink-0 w-12 h-12 rounded-[14px] flex flex-col items-center justify-center ${
              isOver ? 'bg-primary/10' : 'bg-amber-500/10'
            }`}
          >
            <span className={`font-label font-black text-lg leading-none ${isOver ? 'text-primary' : 'text-amber-700'}`}>
              {Math.round(pct * 100)}
            </span>
            <span className={`font-label text-[9px] ${isOver ? 'text-primary/60' : 'text-amber-600/70'}`}>%</span>
          </div>
        </div>

        {/* Footer action */}
        {onEdit && (
          <button
            onClick={onEdit}
            className={`mt-3 flex items-center gap-1.5 font-label text-xs font-medium transition-opacity hover:opacity-70 ${
              isOver ? 'text-primary' : 'text-amber-700'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Chỉnh ngưỡng
          </button>
        )}
      </div>
    </div>
  )
}

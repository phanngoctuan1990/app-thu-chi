import { type ReactNode } from 'react'

interface BentoCardProps {
  children: ReactNode
  className?: string
  dark?: boolean
  onClick?: () => void
}

export default function BentoCard({ children, className = '', dark = false, onClick }: BentoCardProps) {
  const base = dark
    ? 'bg-inverse-surface text-surface'
    : 'bg-surface-container-lowest'

  return (
    <div
      onClick={onClick}
      className={`rounded-[24px] bento-shadow overflow-hidden ${base} ${onClick ? 'cursor-pointer press-scale' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

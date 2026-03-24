interface TopAppBarProps {
  title: string
  subtitle?: string
}

export default function TopAppBar({ title, subtitle }: TopAppBarProps) {
  return (
    <header className="fixed top-0 w-full max-w-[430px] z-50 bg-surface-container header-safe">
      <div className="flex justify-between items-center px-6 py-4 animate-fade-in">
        {/* Avatar + Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/15 to-primary-container/25 bento-shadow-sm flex items-center justify-center">
            <span
              className="material-symbols-outlined text-primary text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              account_balance_wallet
            </span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline font-black text-xl tracking-tight text-on-surface leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="font-label text-[10px] text-outline uppercase tracking-[0.15em] leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Notification Bell */}
        <button className="relative w-9 h-9 rounded-full bg-surface-container-low bento-shadow-sm flex items-center justify-center text-primary transition-opacity hover:opacity-70 active:scale-95 duration-150">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  )
}

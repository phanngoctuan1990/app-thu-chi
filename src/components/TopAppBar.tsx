interface TopAppBarProps {
  title: string
}

export default function TopAppBar({ title }: TopAppBarProps) {
  return (
    <header className="fixed top-0 w-full max-w-[430px] z-50 bg-surface-container header-safe">
      <div className="flex justify-between items-center px-6 py-4">
        {/* Avatar + Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-primary/10 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-primary text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
            >
              account_balance_wallet
            </span>
          </div>
          <h1 className="font-headline font-bold text-xl tracking-tight text-primary">
            {title}
          </h1>
        </div>

        {/* Notification Bell */}
        <button className="text-primary transition-opacity hover:opacity-70 active:scale-95 duration-150">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  )
}
